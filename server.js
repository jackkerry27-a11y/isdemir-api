const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════════════
// CORS AYARLARI - CROSS-ORIGIN İSTEKLER İÇİN
// ═══════════════════════════════════════════════════════
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Preflight requests için
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// ═══════════════════════════════════════════════════════
// MONGODB BAĞLANTISI
// ═══════════════════════════════════════════════════════
const MONGODB_URI = 'mongodb+srv://jackkerry27_db_user:veVLqCpft0yoibdw@isdemir-db.vmhwinj.mongodb.net/isdemir?retryWrites=true&w=majority';
const mongoClient = new MongoClient(MONGODB_URI);
let db;

async function connectDB() {
  try {
    await mongoClient.connect();
    db = mongoClient.db('isdemir');
    console.log('✅ MongoDB bağlandı!');
    
    // İndeksler oluştur
    await db.collection('gemiler').createIndex({ imo: 1 });
    await db.collection('kullanicilar').createIndex({ sicil: 1 });
    await db.collection('duyurular').createIndex({ tarih: -1 });
  } catch (error) {
    console.error('❌ MongoDB hatası:', error);
    process.exit(1);
  }
}

// Başlangıçta bağlan
connectDB();

// ─── VERİ (GEÇİCİ - WebSocket için RAM'de) ──────────
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

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === 'giris') {
        benimSicil = msg.sicil;
        if (msg.fcmToken) fcmTokenlari.set(benimSicil, msg.fcmToken);
        onlineKullanicilar.set(benimSicil, {
          sicil: benimSicil, ad: msg.ad || benimSicil,
          ws, lastSeen: Date.now(),
          fcmToken: msg.fcmToken || fcmTokenlari.get(benimSicil),
        });
        sonGorulenler.set(benimSicil, Date.now());
        broadcast({ type: 'online_liste', liste: getOnlineListe() });
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

      if (msg.type === 'profil_sor') {
        const profil = await db.collection('kullanicilar').findOne({ sicil: msg.sicil });
        ws.send(JSON.stringify({ type: 'profil_bilgisi', sicil: msg.sicil, profil: profil || {} }));
        return;
      }

    } catch (e) { console.error('WS hata:', e.message); }
  });

  ws.on('close', () => {
    if (benimSicil) {
      sonGorulenler.set(benimSicil, Date.now());
      onlineKullanicilar.delete(benimSicil);
      broadcast({ type: 'online_liste', liste: getOnlineListe() });
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
  for (const [sicil, token] of fcmTokenlari) {
    if (!onlineKullanicilar.has(sicil)) {
      await pushBildirimGonder(token, '🚢 Yeni Gemi', `${gemiAdi} limana eklendi`);
    }
  }
  const gemiler = await db.collection('gemiler').find().toArray();
  broadcast({ type: 'gemi_guncellendi', gemiler });
}

// ─── API ENDPOİNTLERİ ───────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ═══ GEMİLER (MONGODB) ═══
app.get('/isdemir/ships', async (req, res) => {
  try {
    const gemiler = await db.collection('gemiler').find().toArray();
    res.json({ gemiler });
  } catch (error) {
    console.error('Gemiler getirme hatası:', error);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

// ═══ KULLANICILAR (MONGODB) ═══
app.get('/isdemir/kullanicilar', async (req, res) => {
  try {
    const kullanicilar = await db.collection('kullanicilar').find().toArray();
    const liste = kullanicilar.map(k => ({
      ...k,
      online: onlineKullanicilar.has(k.sicil),
      sonGiris: sonGorulenler.get(k.sicil) || null,
      sonGirisStr: (() => {
        const ts = sonGorulenler.get(k.sicil);
        if (!ts) return 'Hiç giriş yapmadı';
        const fark = Date.now() - ts;
        const dk = Math.floor(fark / 60000);
        const saat = Math.floor(fark / 3600000);
        const gun = Math.floor(fark / 86400000);
        if (dk < 1) return 'Az önce';
        if (dk < 60) return `${dk} dk önce`;
        if (saat < 24) return `${saat} saat önce`;
        return `${gun} gün önce`;
      })(),
      banli: k.banli || false,
      banSebep: k.banSebep || null,
      banTarihi: k.banTarihi || null,
      cihazId: k.cihazId || null,
    }));
    res.json({ kullanicilar: liste, toplam: liste.length, online: liste.filter(k => k.online).length });
  } catch (error) {
    console.error('Kullanıcılar getirme hatası:', error);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

app.post('/isdemir/kullanicilar', async (req, res) => {
  try {
    const { sicil } = req.body;
    const existing = await db.collection('kullanicilar').findOne({ sicil });
    
    if (existing) {
      await db.collection('kullanicilar').updateOne(
        { sicil },
        { $set: { ...req.body, guncelleme: new Date().toISOString() } }
      );
    } else {
      await db.collection('kullanicilar').insertOne({
        ...req.body,
        kayitTarihi: new Date().toISOString()
      });
    }
    
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Kullanıcı kayıt hatası:', error);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

app.delete('/isdemir/kullanicilar/:sicil', async (req, res) => {
  try {
    await db.collection('kullanicilar').deleteOne({ sicil: req.params.sicil });
    res.json({ ok: true });
  } catch (error) {
    console.error('Kullanıcı silme hatası:', error);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

// ═══ BAN SİSTEMİ ═══
app.get('/isdemir/ban-kontrol', async (req, res) => {
  try {
    const { sicil } = req.query;
    if (!sicil) return res.json({ banli: false, sebep: '', banTarihi: '' });

    const kullanici = await db.collection('kullanicilar').findOne({ sicil });
    if (!kullanici) return res.json({ banli: false, sebep: '', banTarihi: '' });

    if (kullanici.banli === true) {
      console.log(`🚫 Ban kontrol: ${sicil} BANLI - Sebep: ${kullanici.banSebep}`);
      return res.json({
        banli: true,
        sebep: kullanici.banSebep || 'Yetkisiz erişim tespit edildi',
        banTarihi: kullanici.banTarihi || new Date().toISOString()
      });
    }

    console.log(`✓ Ban kontrol: ${sicil} temiz`);
    res.json({ banli: false, sebep: '', banTarihi: '' });
  } catch (error) {
    console.error('Ban kontrol hatası:', error);
    res.json({ banli: false, sebep: '', banTarihi: '' });
  }
});

app.post('/isdemir/kullanici-banla', async (req, res) => {
  try {
    const { sicil, sebep, banTarihi } = req.body;
    if (!sicil || !sebep) {
      return res.status(400).json({ success: false, message: 'Sicil ve sebep zorunlu' });
    }

    await db.collection('kullanicilar').updateOne(
      { sicil },
      { $set: {
        banli: true,
        banSebep: sebep,
        banTarihi: banTarihi || new Date().toISOString()
      }}
    );

    console.log(`✅ KULLANICI BANLANDI: ${sicil} - Sebep: ${sebep}`);

    if (onlineKullanicilar.has(sicil)) {
      const user = onlineKullanicilar.get(sicil);
      if (user.ws && user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(JSON.stringify({ type: 'banlandınız', sebep: sebep }));
        user.ws.close();
      }
      onlineKullanicilar.delete(sicil);
    }

    res.json({ success: true, message: 'Kullanıcı banlandı' });
  } catch (error) {
    console.error('Banlama hatası:', error);
    res.status(500).json({ success: false, message: 'Banlama sırasında hata oluştu' });
  }
});

app.post('/isdemir/ban-kaldir', async (req, res) => {
  try {
    const { sicil } = req.body;
    if (!sicil) {
      return res.status(400).json({ success: false, message: 'Sicil zorunlu' });
    }

    await db.collection('kullanicilar').updateOne(
      { sicil },
      { $set: { banli: false, banSebep: null, banTarihi: null }}
    );

    console.log(`✅ BAN KALDIRILDI: ${sicil}`);
    res.json({ success: true, message: 'Ban kaldırıldı' });
  } catch (error) {
    console.error('Ban kaldırma hatası:', error);
    res.status(500).json({ success: false, message: 'Ban kaldırma sırasında hata oluştu' });
  }
});

// ═══ DUYURULAR (MONGODB) ═══
app.get('/isdemir/duyurular', async (req, res) => {
  try {
    const duyurular = await db.collection('duyurular').find().sort({ tarih: -1 }).toArray();
    res.json(duyurular);
  } catch (error) {
    console.error('Duyurular getirme hatası:', error);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

app.post('/isdemir/duyurular', async (req, res) => {
  try {
    const duyuru = { ...req.body, tarih: new Date().toISOString() };
    const result = await db.collection('duyurular').insertOne(duyuru);
    
    broadcast({ type: 'yeni_duyuru', duyuru: { ...duyuru, _id: result.insertedId }});
    
    res.json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('Duyuru ekleme hatası:', error);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

app.delete('/isdemir/duyurular/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('duyurular').deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true });
  } catch (error) {
    console.error('Duyuru silme hatası:', error);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

// ─── SUNUCU BAŞLAT ──────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📡 Sunucu kapatılıyor...');
  await mongoClient.close();
  server.close(() => {
    console.log('✅ Sunucu kapatıldı');
    process.exit(0);
  });
});
