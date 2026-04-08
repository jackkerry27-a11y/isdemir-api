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
