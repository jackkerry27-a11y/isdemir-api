const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── VERİ ────────────────────────────────────────────
let gemiler = [];
let nextGemiId = 1;
let mesajlar = [];
let nextMesajId = 1;

// Online kullanıcılar: sicil -> { sicil, ad, ws, lastSeen, fcmToken }
const onlineKullanicilar = new Map();
// FCM token kayıtları: sicil -> fcmToken (kalıcı)
const fcmTokenlari = new Map();
// Son görülme: sicil -> timestamp
const sonGorulenler = new Map();

// ─── FCM BİLDİRİM ────────────────────────────────────
let cachedToken = null;
let tokenExpiry = 0;

async function getFCMToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  try {
    const auth = new GoogleAuth({
      keyFile: path.join(__dirname, 'serviceAccount.json'),
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    cachedToken = tokenResponse.token;
    tokenExpiry = Date.now() + 55 * 60 * 1000; // 55 dakika
    return cachedToken;
  } catch (e) {
    console.error('FCM token hatası:', e.message);
    return null;
  }
}

async function pushBildirimGonder(fcmToken, baslik, mesaj) {
  if (!fcmToken) return;
  try {
    const accessToken = await getFCMToken();
    if (!accessToken) return;

    // Project ID'yi serviceAccount.json'dan oku
    const sa = require('./serviceAccount.json');
    const projectId = sa.project_id;

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: { title: baslik, body: mesaj },
            android: {
              priority: 'high',
              notification: { sound: 'default', channel_id: 'isdemir_mesaj' },
            },
          },
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) console.error('FCM hata:', data);
  } catch (e) {
    console.error('Push bildirim hatası:', e.message);
  }
}

// ─── WEBSOCKET ───────────────────────────────────────
wss.on('connection', (ws) => {
  let benimSicil = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === 'giris') {
        benimSicil = msg.sicil;
        // FCM token kaydet
        if (msg.fcmToken) fcmTokenlari.set(benimSicil, msg.fcmToken);
        onlineKullanicilar.set(benimSicil, {
          sicil: benimSicil, ad: msg.ad || benimSicil,
          ws, lastSeen: Date.now(),
          fcmToken: msg.fcmToken || fcmTokenlari.get(benimSicil),
        });
        sonGorulenler.set(benimSicil, Date.now());
        broadcast({ type: 'online_liste', liste: getOnlineListe() });
        // Bekleyen mesajları gönder
        const bekleyenler = mesajlar.filter(m => m.toSicil === benimSicil && !m.okundu);
        if (bekleyenler.length > 0) ws.send(JSON.stringify({ type: 'bekleyen_mesajlar', mesajlar: bekleyenler }));
        return;
      }

      if (msg.type === 'fcm_token') {
        if (benimSicil) {
          fcmTokenlari.set(benimSicil, msg.token);
          const k = onlineKullanicilar.get(benimSicil);
          if (k) k.fcmToken = msg.token;
        }
        return;
      }

      if (msg.type === 'mesaj') {
        const yeniMesaj = {
          id: nextMesajId++, fromSicil: benimSicil, toSicil: msg.toSicil,
          text: msg.text || '', imageBase64: msg.imageBase64 || null,
          timestamp: Date.now(), okundu: false,
        };
        mesajlar.push(yeniMesaj);
        if (mesajlar.length > 500) mesajlar = mesajlar.slice(-500);

        const alici = onlineKullanicilar.get(msg.toSicil);
        if (alici && alici.ws.readyState === WebSocket.OPEN) {
          alici.ws.send(JSON.stringify({ type: 'yeni_mesaj', mesaj: yeniMesaj }));
          yeniMesaj.okundu = true;
        } else {
          // Alıcı çevrimdışı — push bildirim gönder
          const aliciFcmToken = fcmTokenlari.get(msg.toSicil);
          if (aliciFcmToken) {
            const mesajMetni = msg.imageBase64 ? '📷 Fotoğraf gönderdi' : (msg.text || '');
            pushBildirimGonder(aliciFcmToken, `Sicil ${benimSicil}`, mesajMetni);
          }
        }
        ws.send(JSON.stringify({ type: 'mesaj_gonderildi', mesaj: yeniMesaj }));
        return;
      }

      if (msg.type === 'gecmis') {
        const gecmis = mesajlar.filter(m =>
          (m.fromSicil === benimSicil && m.toSicil === msg.toSicil) ||
          (m.fromSicil === msg.toSicil && m.toSicil === benimSicil)
        );
        ws.send(JSON.stringify({ type: 'gecmis_mesajlar', mesajlar: gecmis, toSicil: msg.toSicil }));
        return;
      }

      if (msg.type === 'son_gorulen_sor') {
        const ts = sonGorulenler.get(msg.sicil);
        ws.send(JSON.stringify({ type: 'son_gorulen', sicil: msg.sicil, timestamp: ts || null }));
        return;
      }

    } catch (e) { console.error('WS hata:', e.message); }
  });

  ws.on('close', () => {
    if (benimSicil) {
      sonGorulenler.set(benimSicil, Date.now());
      onlineKullanicilar.delete(benimSicil);
      broadcast({ type: 'online_liste', liste: getOnlineListe() });
      // Son görülme bilgisini yayınla
      broadcast({ type: 'son_gorulen', sicil: benimSicil, timestamp: Date.now() });
    }
  });

  ws.on('error', () => { if (benimSicil) onlineKullanicilar.delete(benimSicil); });
});

function getOnlineListe() {
  return Array.from(onlineKullanicilar.values()).map(k => ({ sicil: k.sicil, ad: k.ad }));
}

function broadcast(data) {
  const str = JSON.stringify(data);
  wss.clients.forEach(client => { if (client.readyState === WebSocket.OPEN) client.send(str); });
}

// ─── GEMİ BİLDİRİM ───────────────────────────────────
async function gemiEklendiBldirim(gemiAdi) {
  // Tüm kayıtlı FCM tokenlarına bildirim gönder
  for (const [sicil, token] of fcmTokenlari) {
    if (!onlineKullanicilar.has(sicil)) {
      // Sadece çevrimdışı olanlara gönder (çevrimiçiler zaten WS'den görür)
      await pushBildirimGonder(token, '🚢 Yeni Gemi', `${gemiAdi} limana eklendi`);
    }
  }
  // Çevrimiçilere WS ile bildir
  broadcast({ type: 'gemi_guncellendi', gemiler });
}

// ─── GEMİ API ────────────────────────────────────────
app.get('/isdemir/ships', (req, res) => res.json({ gemiler }));

// ─── DUYURU API ──────────────────────────────────────
let duyurular = [];
let nextDuyuruId = 1;

app.get('/isdemir/duyurular', (req, res) => res.json({ duyurular }));

app.post('/isdemir/duyurular', async (req, res) => {
  const d = { ...req.body, id: nextDuyuruId++, tarih: new Date().toISOString() };
  duyurular.unshift(d); // en yenisi başa
  if (duyurular.length > 50) duyurular = duyurular.slice(0, 50);
  res.status(201).json(d);
  // Tüm kullanıcılara push bildirim
  for (const [sicil, token] of fcmTokenlari) {
    if (!onlineKullanicilar.has(sicil)) {
      await pushBildirimGonder(token, `📢 ${d.baslik}`, d.icerik?.substring(0, 80) || '');
    }
  }
  // Çevrimiçilere WS ile bildir
  broadcast({ type: 'yeni_duyuru', duyuru: d });
});

app.delete('/isdemir/duyurular/:id', (req, res) => {
  duyurular = duyurular.filter(d => d.id !== parseInt(req.params.id));
  broadcast({ type: 'duyuru_silindi' });
  res.json({ ok: true });
});

app.post('/isdemir/ships', async (req, res) => {
  const g = { ...req.body, id: nextGemiId++ };
  gemiler.push(g);
  res.status(201).json(g);
  await gemiEklendiBldirim(g.ad);
});

app.put('/isdemir/ships/:id', (req, res) => {
  const idx = gemiler.findIndex(g => g.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ hata: 'Bulunamadı' });
  gemiler[idx] = { ...gemiler[idx], ...req.body, id: gemiler[idx].id };
  broadcast({ type: 'gemi_guncellendi', gemiler });
  res.json(gemiler[idx]);
});

app.delete('/isdemir/ships/:id', (req, res) => {
  gemiler = gemiler.filter(g => g.id !== parseInt(req.params.id));
  broadcast({ type: 'gemi_guncellendi', gemiler });
  res.json({ ok: true });
});

// Son görülme API
app.get('/isdemir/son-gorulen/:sicil', (req, res) => {
  const ts = sonGorulenler.get(req.params.sicil);
  res.json({ sicil: req.params.sicil, timestamp: ts || null });
});

// Admin paneli
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ İsdemir backend → http://localhost:${PORT}`);
  console.log(`🚢 API    → /isdemir/ships`);
  console.log(`💬 WS     → ws://localhost:${PORT}`);
  console.log(`🔔 FCM    → Push bildirim aktif`);
  console.log(`🖥️  Admin  → /admin`);
});

// ─── AISStream ENTEGRASYONU ──────────────────────────
const AIS_API_KEY = '38f5f2a35f24179c5baaf6f010cb1679db7e84c4';

// İskenderun Körfezi koordinatları (bounding box)
const ISKENDERUN_BBOX = [[36.4, 35.8], [37.1, 36.5]]; // [min_lat, min_lon], [max_lat, max_lon]

// AIS'ten gelen gemileri sakla (MMSI bazlı)
const aisGemiler = new Map(); // mmsi -> gemi bilgisi

function aisGemiTipStr(tip) {
  if (tip >= 70 && tip <= 79) return 'General Cargo';
  if (tip >= 80 && tip <= 89) return 'Tanker';
  if (tip >= 60 && tip <= 69) return 'Passenger';
  if (tip === 30) return 'Fishing';
  if (tip >= 40 && tip <= 49) return 'High Speed';
  if (tip >= 20 && tip <= 29) return 'WIG';
  return 'Bulk Carrier';
}

function aisNavStatusStr(status) {
  switch (status) {
    case 0: return 'Yüklemede';
    case 1: return 'Demirledi';
    case 3: return 'Kalkışa Hazır';
    case 5: return 'Tahliyede';
    default: return 'Geçiş';
  }
}

let aisWs = null;
let aisReconnectTimer = null;

function aisStreamBaglan() {
  if (aisWs) {
    try { aisWs.terminate(); } catch(_) {}
  }

  console.log('🛰️  AISStream bağlanıyor...');

  try {
    aisWs = new WebSocket('wss://stream.aisstream.io/v0/stream');

    aisWs.on('open', () => {
      console.log('✅ AISStream bağlandı');
      const subscription = {
        Apikey: AIS_API_KEY,
        BoundingBoxes: [ISKENDERUN_BBOX],
        FilterMessageTypes: ['PositionReport', 'ShipStaticData']
      };
      aisWs.send(JSON.stringify(subscription));
    });

    aisWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        const msgType = msg.MessageType;
        const meta = msg.MetaData;

        if (!meta) return;

        const mmsi = meta.MMSI?.toString();
        if (!mmsi) return;

        // Mevcut kaydı güncelle veya yeni oluştur
        const mevcut = aisGemiler.get(mmsi) || {};

        if (msgType === 'PositionReport') {
          const pos = msg.Message?.PositionReport;
          if (!pos) return;

          aisGemiler.set(mmsi, {
            ...mevcut,
            mmsi,
            ad: meta.ShipName?.trim() || mevcut.ad || `MMSI:${mmsi}`,
            lat: pos.Latitude,
            lon: pos.Longitude,
            hiz: pos.Sog?.toFixed(1) || '0',
            yon: pos.Cog?.toFixed(0) || '0',
            navStatus: aisNavStatusStr(pos.NavigationalStatus),
            draft: pos.Draught ? pos.Draught / 10 : (mevcut.draft || 0),
            guncelleme: new Date().toISOString(),
          });

        } else if (msgType === 'ShipStaticData') {
          const s = msg.Message?.ShipStaticData;
          if (!s) return;

          aisGemiler.set(mmsi, {
            ...mevcut,
            mmsi,
            ad: s.Name?.trim() || mevcut.ad || `MMSI:${mmsi}`,
            imo: s.ImoNumber ? `IMO${s.ImoNumber}` : (mevcut.imo || '-'),
            tip: aisGemiTipStr(s.Type || 0),
            bayrak: s.Flag || mevcut.bayrak || '-',
            varisLiman: s.Destination?.trim() || mevcut.varisLiman || '-',
            draft: s.MaximumStaticDraught ? s.MaximumStaticDraught / 10 : (mevcut.draft || 0),
            uzunluk: s.Dimension?.A + s.Dimension?.B || 0,
            genislik: s.Dimension?.C + s.Dimension?.D || 0,
            guncelleme: new Date().toISOString(),
          });
        }

        // AIS gemilerini tüm bağlı kullanıcılara yayınla (30 saniyede bir)
      } catch (e) {
        console.error('AIS mesaj parse hatası:', e.message);
      }
    });

    aisWs.on('close', () => {
      console.log('⚠️  AISStream bağlantısı kesildi, 10sn sonra tekrar...');
      aisReconnectTimer = setTimeout(aisStreamBaglan, 10000);
    });

    aisWs.on('error', (err) => {
      console.error('AISStream hata:', err.message);
    });

  } catch (e) {
    console.error('AISStream bağlantı hatası:', e.message);
    aisReconnectTimer = setTimeout(aisStreamBaglan, 10000);
  }
}

// AIS verisi API endpoint
app.get('/isdemir/ais', (req, res) => {
  const list = Array.from(aisGemiler.values());
  res.json({ gemiler: list, toplam: list.length });
});

// Belirli MMSI için AIS detay
app.get('/isdemir/ais/:mmsi', (req, res) => {
  const g = aisGemiler.get(req.params.mmsi);
  if (!g) return res.status(404).json({ hata: 'Gemi bulunamadı' });
  res.json(g);
});

// 30 saniyede bir AIS güncellemesini broadcast et
setInterval(() => {
  const list = Array.from(aisGemiler.values());
  if (list.length > 0) {
    broadcast({ type: 'ais_guncelleme', gemiler: list });
  }
}, 30000);

// Başlat
aisStreamBaglan();
console.log('🛰️  AISStream servisi başlatıldı - İskenderun Körfezi izleniyor');
