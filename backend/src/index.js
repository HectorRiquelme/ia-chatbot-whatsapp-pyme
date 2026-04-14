const express = require('express');
const cors = require('cors');
const config = require('./config');
const db = require('./db/database');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');

db.initDb();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true, llmMode: config.llm.mode });
});

app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(config.port, () => {
  console.log(`Backend Ferretería El Manque escuchando en http://localhost:${config.port}`);
  console.log(`Modo LLM: ${config.llm.mode}`);
});
