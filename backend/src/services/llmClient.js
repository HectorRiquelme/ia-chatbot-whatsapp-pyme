// Cliente genérico para un proveedor LLM HTTP.
// - En modo "mock" no realiza ninguna llamada de red y delega en mockResponder.
// - En modo "live" arma una petición al endpoint configurado y espera una
//   respuesta compatible con OpenAI-like Chat Completions (choices[0].message.content).
//
// Este cliente es intencionalmente agnóstico del proveedor: puede apuntarse a
// cualquier API compatible cambiando LLM_ENDPOINT / LLM_MODEL / LLM_API_KEY.

const fetch = require('node-fetch');
const config = require('../config');
const mockResponder = require('./mockResponder');

async function callLiveProvider({ systemPrompt, history, userText }) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userText }
  ];

  const body = {
    model: config.llm.model,
    messages,
    temperature: 0.3,
    max_tokens: 400
  };

  const response = await fetch(config.llm.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.llm.apiKey}`
    },
    body: JSON.stringify(body),
    timeout: 20000
  });

  if (!response.ok) {
    const txt = await response.text().catch(() => '');
    throw new Error(`LLM provider HTTP ${response.status}: ${txt.slice(0, 200)}`);
  }

  const data = await response.json();
  const content =
    (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
    (data && data.output_text) ||
    '';

  if (!content) {
    throw new Error('Respuesta vacía desde el proveedor LLM');
  }

  // Heurística simple: si la respuesta menciona "escalar" la marcamos como no resuelta.
  const lowered = content.toLowerCase();
  const escalate = lowered.includes('escalar') || lowered.includes('ejecutivo humano') || lowered.includes('agente humano');

  return {
    text: content.trim(),
    resolved: !escalate,
    topic: 'llm_live',
    escalate
  };
}

async function generateReply({ systemPrompt, history, userText }) {
  if (config.llm.mode === 'mock') {
    return mockResponder.respond(userText);
  }

  try {
    return await callLiveProvider({ systemPrompt, history, userText });
  } catch (err) {
    console.error('[llmClient] fallo modo live, usando mock fallback:', err.message);
    return mockResponder.respond(userText);
  }
}

module.exports = { generateReply };
