const express = require('express');
const app = express();
app.use(express.json());

// Gemi verilerini burada tutuyoruz (gerçekte DB olur)
let gemiler = [
  {
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
    ad: 'MV STEEL HORIZON',
    imo: '9567821',
    tip: 'General Cargo',
    bayrak: 'Malta',
    durum: 'Kalkışa Hazır',
    sonLiman: 'Mersin',
    varisZamani: '08.04.2026 00:15',
    rhtim: 'Rıhtım 5',
    draft: 9.2,
    departureDraft: 9.8,
    beklenen: false,
  },
  {
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
  {
    ad: 'MV ANATOLIA BULK',
    imo: '9477001',
    tip: 'Bulk Carrier',
    bayrak: 'Bahamas',
    durum: 'Bekleniyor',
    sonLiman: 'Alexandria',
    varisZamani: '09.04.2026 22:10',
    rhtim: 'Planlanıyor',
    draft: 14.3,
    departureDraft: null,
    beklenen: true,
  },
];

// GET - tüm gemileri getir
app.get('/isdemir/ships', (req, res) => {
  res.json({ gemiler });
});

// POST - yeni gemi ekle
app.post('/isdemir/ships', (req, res) => {
  const yeniGemi = req.body;
  gemiler.push(yeniGemi);
  res.status(201).json({ mesaj: 'Gemi eklendi', gemi: yeniGemi });
});

// PUT - gemi güncelle (IMO numarasına göre)
app.put('/isdemir/ships/:imo', (req, res) => {
  const idx = gemiler.findIndex(g => g.imo === req.params.imo);
  if (idx === -1) return res.status(404).json({ hata: 'Gemi bulunamadı' });
  gemiler[idx] = { ...gemiler[idx], ...req.body };
  res.json({ mesaj: 'Güncellendi', gemi: gemiler[idx] });
});

// DELETE - gemi sil
app.delete('/isdemir/ships/:imo', (req, res) => {
  gemiler = gemiler.filter(g => g.imo !== req.params.imo);
  res.json({ mesaj: 'Silindi' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ İsdemir backend çalışıyor → http://localhost:${PORT}`);
  console.log(`📡 Gemi endpoint: http://localhost:${PORT}/isdemir/ships`);
});
