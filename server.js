const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let gemiler = [];
let nextId = 1;

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

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ İsdemir backend → http://localhost:${PORT}`);
  console.log(`🚢 API   → /isdemir/ships`);
  console.log(`🖥️  Admin → /admin`);
});
