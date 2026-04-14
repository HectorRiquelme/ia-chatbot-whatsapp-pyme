const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/conversations', (req, res) => {
  try {
    res.json(db.getAllConversations());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/escalated', (req, res) => {
  try {
    res.json(db.getEscalatedCases());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/metrics', (req, res) => {
  try {
    res.json(db.getMetrics());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/prompt', (req, res) => {
  try {
    res.json({ system_prompt: db.getSystemPrompt() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/prompt', (req, res) => {
  try {
    const { system_prompt } = req.body || {};
    if (!system_prompt || typeof system_prompt !== 'string') {
      return res.status(400).json({ error: 'system_prompt requerido' });
    }
    db.setSystemPrompt(system_prompt);
    res.json({ ok: true, system_prompt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
