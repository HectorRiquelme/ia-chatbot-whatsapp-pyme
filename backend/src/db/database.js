const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const config = require('../config');

const DEFAULT_SYSTEM_PROMPT = `Eres el asistente virtual de atención al cliente de "Ferretería El Manque SpA", una PyME chilena ficticia ubicada en Rancagua, Región de O'Higgins.

DATOS DE LA EMPRESA
- Nombre: Ferretería El Manque SpA
- Rubro: Ferretería, herramientas, materiales de construcción
- Dirección: Av. Libertador Bernardo O'Higgins 1234, Rancagua
- Horario de atención: Lunes a viernes 09:00 a 19:00, sábados 10:00 a 14:00, domingo cerrado
- Teléfono: +56 72 2123 456
- Email: contacto@elmanque.cl

SERVICIOS
- Venta de herramientas eléctricas y manuales
- Materiales de construcción (cemento, fierro, maderas)
- Pinturas y accesorios
- Despacho a domicilio en Rancagua y Machalí (costo adicional)
- Corte de madera a medida (servicio gratuito en compras sobre $30.000 CLP)
- Asesoría técnica en proyectos pequeños

PRECIOS REFERENCIALES (CLP)
- Taladro percutor Bosch 650W: $49.990
- Set destornilladores Stanley 10 piezas: $12.990
- Saco cemento Melón 25kg: $5.490
- Martillo carpintero: $7.990
- Litro de pintura latex blanca: $8.490
- Tornillos autoperforantes (100 unidades): $3.490
- Guantes de seguridad: $2.990
- Casco de seguridad: $6.490

POLÍTICA DE DEVOLUCIÓN
- Plazo: 10 días corridos desde la compra
- Requisitos: boleta o factura, producto sin uso, en su envase original
- No se aceptan devoluciones de productos a medida (ej. cortes de madera)
- El reembolso se realiza por el mismo medio de pago en un plazo de 5 días hábiles

PREGUNTAS FRECUENTES
1. ¿Hacen despacho? Sí, en Rancagua y Machalí. Costo desde $3.500 CLP.
2. ¿Aceptan tarjeta? Sí, débito, crédito y transferencia.
3. ¿Tienen boleta electrónica? Sí, se envía al correo del cliente.
4. ¿Dan garantía? Las herramientas eléctricas tienen 6 meses de garantía del fabricante.

INSTRUCCIONES DE COMPORTAMIENTO
- Responde siempre en español chileno, de forma breve, clara y amigable.
- Usa tratamiento de "usted" salvo que el cliente te tutee primero.
- Si no conoces la respuesta con certeza o el cliente pide algo fuera de tu alcance (reclamos complejos, cotizaciones muy grandes, problemas técnicos), ofrece derivar a un ejecutivo humano diciendo explícitamente la palabra "escalar".
- Nunca inventes precios que no estén en la lista: si te preguntan algo no listado, ofrece escalar.
- Si el cliente pide explícitamente hablar con una persona, también escala.`;

let db;

function initDb() {
  const dbPath = path.resolve(config.dbPath);
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      phone TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'activa',
      escalated INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 1,
      topic TEXT,
      FOREIGN KEY (phone) REFERENCES conversations(phone)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const existing = db.prepare('SELECT value FROM settings WHERE key = ?').get('system_prompt');
  if (!existing) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('system_prompt', DEFAULT_SYSTEM_PROMPT);
  }

  return db;
}

function getDb() {
  if (!db) initDb();
  return db;
}

function getSystemPrompt() {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get('system_prompt');
  return row ? row.value : DEFAULT_SYSTEM_PROMPT;
}

function setSystemPrompt(prompt) {
  getDb()
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run('system_prompt', prompt);
}

function upsertConversation(phone) {
  const now = new Date().toISOString();
  const d = getDb();
  const exists = d.prepare('SELECT phone FROM conversations WHERE phone = ?').get(phone);
  if (!exists) {
    d.prepare(
      'INSERT INTO conversations (phone, created_at, updated_at, status, escalated) VALUES (?, ?, ?, ?, 0)'
    ).run(phone, now, now, 'activa');
  } else {
    d.prepare('UPDATE conversations SET updated_at = ? WHERE phone = ?').run(now, phone);
  }
}

function markEscalated(phone) {
  getDb()
    .prepare('UPDATE conversations SET escalated = 1, status = ? WHERE phone = ?')
    .run('escalado', phone);
}

function addMessage({ phone, role, content, resolved = 1, topic = null }) {
  const now = new Date().toISOString();
  const info = getDb()
    .prepare(
      'INSERT INTO messages (phone, role, content, created_at, resolved, topic) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(phone, role, content, now, resolved ? 1 : 0, topic);
  return { id: info.lastInsertRowid, phone, role, content, created_at: now, resolved, topic };
}

function getHistory(phone) {
  return getDb()
    .prepare('SELECT id, phone, role, content, created_at, resolved, topic FROM messages WHERE phone = ? ORDER BY id ASC')
    .all(phone);
}

function getAllConversations() {
  return getDb()
    .prepare(
      `SELECT c.phone, c.status, c.escalated, c.updated_at, c.created_at,
              (SELECT COUNT(*) FROM messages m WHERE m.phone = c.phone) AS msg_count,
              (SELECT content FROM messages m WHERE m.phone = c.phone ORDER BY id DESC LIMIT 1) AS last_message
       FROM conversations c
       ORDER BY c.updated_at DESC`
    )
    .all();
}

function getEscalatedCases() {
  return getDb()
    .prepare(
      `SELECT c.phone, c.status, c.updated_at, c.created_at,
              (SELECT COUNT(*) FROM messages m WHERE m.phone = c.phone) AS msg_count
       FROM conversations c
       WHERE c.escalated = 1
       ORDER BY c.updated_at DESC`
    )
    .all();
}

function getMetrics() {
  const d = getDb();
  const messagesPerDay = d
    .prepare(
      `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS count
       FROM messages
       GROUP BY day
       ORDER BY day DESC
       LIMIT 14`
    )
    .all();

  const totalBot = d.prepare("SELECT COUNT(*) AS c FROM messages WHERE role = 'assistant'").get().c;
  const unresolved = d
    .prepare("SELECT COUNT(*) AS c FROM messages WHERE role = 'assistant' AND resolved = 0")
    .get().c;
  const resolved = totalBot - unresolved;
  const resolutionRate = totalBot === 0 ? 0 : Math.round((resolved / totalBot) * 1000) / 10;

  const topics = d
    .prepare(
      `SELECT topic, COUNT(*) AS count
       FROM messages
       WHERE topic IS NOT NULL
       GROUP BY topic
       ORDER BY count DESC
       LIMIT 10`
    )
    .all();

  const totalConvs = d.prepare('SELECT COUNT(*) AS c FROM conversations').get().c;
  const escalatedConvs = d.prepare('SELECT COUNT(*) AS c FROM conversations WHERE escalated = 1').get().c;

  return {
    messagesPerDay: messagesPerDay.reverse(),
    resolutionRate,
    totalMessages: d.prepare('SELECT COUNT(*) AS c FROM messages').get().c,
    totalBotMessages: totalBot,
    unresolvedMessages: unresolved,
    totalConversations: totalConvs,
    escalatedConversations: escalatedConvs,
    topTopics: topics
  };
}

module.exports = {
  initDb,
  getDb,
  getSystemPrompt,
  setSystemPrompt,
  upsertConversation,
  markEscalated,
  addMessage,
  getHistory,
  getAllConversations,
  getEscalatedCases,
  getMetrics,
  DEFAULT_SYSTEM_PROMPT
};
