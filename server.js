const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── VERİ ───────────────────────────────────────────
let gemiler = [];
let nextGemiId = 1;

// Mesajlar: { id, fromSicil, toSicil, text, imageBase64, timestamp }
let mesajlar = [];
let nextMesajId = 1;

// Online kullanıcılar: sicil -> { sicil, ad, ws, lastSeen }
const onlineKullanicilar = new Map();

// ─── WEBSOCKET ──────────────────────────────────────
wss.on('connection', (ws) => {
  let benimSicil = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      // Giriş
      if (msg.type === 'giris') {
        benimSicil = msg.sicil;
        onlineKullanicilar.set(benimSicil, {
          sicil: benimSicil,
          ad: msg.ad || benimSicil,
          ws,
          lastSeen: Date.now(),
        });
        broadcast({ type: 'online_liste', liste: getOnlineListe() });
        // Bekleyen mesajları gönder
        const bekleyenler = mesajlar.filter(
          (m) => m.toSicil === benimSicil && !m.okundu
        );
        if (bekleyenler.length > 0) {
          ws.send(JSON.stringify({ type: 'bekleyen_mesajlar', mesajlar: bekleyenler }));
        }
        return;
      }

      // Mesaj gönder
      if (msg.type === 'mesaj') {
        const yeniMesaj = {
          id: nextMesajId++,
          fromSicil: benimSicil,
          toSicil: msg.toSicil,
          text: msg.text || '',
          imageBase64: msg.imageBase64 || null,
          timestamp: Date.now(),
          okundu: false,
        };
        mesajlar.push(yeniMesaj);
        // Son 500 mesajı tut
        if (mesajlar.length > 500) mesajlar = mesajlar.slice(-500);

        // Alıcıya ilet
        const alici = onlineKullanicilar.get(msg.toSicil);
        if (alici && alici.ws.readyState === WebSocket.OPEN) {
          alici.ws.send(JSON.stringify({ type: 'yeni_mesaj', mesaj: yeniMesaj }));
          yeniMesaj.okundu = true;
        }
        // Gönderene de echo
        ws.send(JSON.stringify({ type: 'mesaj_gonderildi', mesaj: yeniMesaj }));
        return;
      }

      // Mesaj geçmişi
      if (msg.type === 'gecmis') {
        const gecmis = mesajlar.filter(
          (m) =>
            (m.fromSicil === benimSicil && m.toSicil === msg.toSicil) ||
            (m.fromSicil === msg.toSicil && m.toSicil === benimSicil)
        );
        ws.send(JSON.stringify({ type: 'gecmis_mesajlar', mesajlar: gecmis, toSicil: msg.toSicil }));
        return;
      }

      // Online liste
      if (msg.type === 'online_sor') {
        ws.send(JSON.stringify({ type: 'online_liste', liste: getOnlineListe() }));
        return;
      }

    } catch (e) {
      console.error('WS hata:', e.message);
    }
  });

  ws.on('close', () => {
    if (benimSicil) {
      const kullanici = onlineKullanicilar.get(benimSicil);
      if (kullanici) {
        kullanici.lastSeen = Date.now();
      }
      onlineKullanicilar.delete(benimSicil);
      broadcast({ type: 'online_liste', liste: getOnlineListe() });
    }
  });

  ws.on('error', () => {
    if (benimSicil) onlineKullanicilar.delete(benimSicil);
  });
});

function getOnlineListe() {
  return Array.from(onlineKullanicilar.values()).map((k) => ({
    sicil: k.sicil,
    ad: k.ad,
  }));
}

function broadcast(data) {
  const str = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(str);
    }
  });
}

// ─── GEMİ API ───────────────────────────────────────
app.get('/isdemir/ships', (req, res) => res.json({ gemiler }));

app.post('/isdemir/ships', (req, res) => {
  const g = { ...req.body, id: nextGemiId++ };
  gemiler.push(g);
  broadcast({ type: 'gemi_guncellendi', gemiler });
  res.status(201).json(g);
});

app.put('/isdemir/ships/:id', (req, res) => {
  const idx = gemiler.findIndex((g) => g.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ hata: 'Bulunamadı' });
  gemiler[idx] = { ...gemiler[idx], ...req.body, id: gemiler[idx].id };
  broadcast({ type: 'gemi_guncellendi', gemiler });
  res.json(gemiler[idx]);
});

app.delete('/isdemir/ships/:id', (req, res) => {
  gemiler = gemiler.filter((g) => g.id !== parseInt(req.params.id));
  broadcast({ type: 'gemi_guncellendi', gemiler });
  res.json({ ok: true });
});

// ─── ADMIN PANELİ ───────────────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ─── BAŞLAT ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ İsdemir backend → http://localhost:${PORT}`);
  console.log(`🚢 API    → /isdemir/ships`);
  console.log(`💬 WS     → ws://localhost:${PORT}`);
  console.log(`🖥️  Admin  → /admin`);
});
