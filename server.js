const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let gemiler = [
  {
    id: 1,
    ad: 'MV DEMIR STAR',
    imo: '9123456',
    tip: 'Bulk Carrier',
    bayrak: 'Panama',
    durum: 'Tahliyede',
    sonLiman: 'Novorossiysk',
    varisZamani: '08.04.2026 06:20',
    rhtim: 'Rıhtım 3',
    draft: 12.8,
    departureDraft: 10.6,
    beklenen: false,
  },
  {
    id: 2,
    ad: 'MV ORE BOSPHORUS',
    imo: '9345612',
    tip: 'Ore Carrier',
    bayrak: 'Marshall Islands',
    durum: 'Yüklemede',
    sonLiman: 'Constanta',
    varisZamani: '08.04.2026 03:45',
    rhtim: 'Rıhtım 1',
    draft: 14.0,
    departureDraft: 14.4,
    beklenen: false,
  },
  {
    id: 3,
    ad: 'MV ORE ATLANTIC',
    imo: '9345678',
    tip: 'Bulk Carrier',
    bayrak: 'Liberia',
    durum: 'Bekleniyor',
    sonLiman: 'Port Said',
    varisZamani: '09.04.2026 14:30',
    rhtim: 'Planlanıyor',
    draft: 13.4,
    departureDraft: null,
    beklenen: true,
  },
];

let nextId = 4;

// Flutter API
app.get('/isdemir/ships', (req, res) => res.json({ gemiler }));

app.post('/isdemir/ships', (req, res) => {
  const g = { ...req.body, id: nextId++ };
  gemiler.push(g);
  res.status(201).json(g);
});

app.put('/isdemir/ships/:id', (req, res) => {
  const idx = gemiler.findIndex(g => g.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ hata: 'Bulunamadı' });
  gemiler[idx] = { ...gemiler[idx], ...req.body, id: gemiler[idx].id };
  res.json(gemiler[idx]);
});

app.delete('/isdemir/ships/:id', (req, res) => {
  gemiler = gemiler.filter(g => g.id !== parseInt(req.params.id));
  res.json({ ok: true });
});

// Admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ İsdemir backend → http://localhost:${PORT}`);
  console.log(`🚢 API   → /isdemir/ships`);
  console.log(`🖥️  Admin → /admin`);
});
