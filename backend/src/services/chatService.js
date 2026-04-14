const db = require('../db/database');
const llmClient = require('./llmClient');

async function handleIncomingMessage({ phone, text }) {
  if (!phone || !text || typeof text !== 'string') {
    throw new Error('phone y text son requeridos');
  }

  db.upsertConversation(phone);

  // Guardar mensaje del usuario
  const userMsg = db.addMessage({
    phone,
    role: 'user',
    content: text,
    resolved: 1,
    topic: null
  });

  // Obtener historial para contexto (últimos 20 mensajes)
  const fullHistory = db.getHistory(phone);
  const contextHistory = fullHistory.slice(-20).slice(0, -1); // excluye el que acabamos de insertar

  const systemPrompt = db.getSystemPrompt();

  const reply = await llmClient.generateReply({
    systemPrompt,
    history: contextHistory,
    userText: text
  });

  const botMsg = db.addMessage({
    phone,
    role: 'assistant',
    content: reply.text,
    resolved: reply.resolved ? 1 : 0,
    topic: reply.topic
  });

  if (reply.escalate) {
    db.markEscalated(phone);
  }

  return {
    userMessage: userMsg,
    botMessage: botMsg,
    escalated: !!reply.escalate
  };
}

module.exports = { handleIncomingMessage };
