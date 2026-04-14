const express = require('express');
const chatService = require('../services/chatService');
const db = require('../db/database');

const router = express.Router();

router.post('/send', async (req, res) => {
  try {
    const { phone, text } = req.body || {};
    if (!phone || !text) {
      return res.status(400).json({ error: 'phone y text son requeridos' });
    }
    const result = await chatService.handleIncomingMessage({ phone, text });
    res.json(result);
  } catch (err) {
    console.error('[POST /chat/send]', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/history/:phone', (req, res) => {
  try {
    const history = db.getHistory(req.params.phone);
    res.json({ phone: req.params.phone, messages: history });
  } catch (err) {
    console.error('[GET /chat/history]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
