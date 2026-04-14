// Responder mock basado en keywords. Se usa cuando LLM_MODE=mock o cuando
// falla la llamada al proveedor LLM externo. Devuelve siempre un objeto con
// { text, resolved, topic, escalate }.

const RULES = [
  {
    topic: 'saludo',
    keywords: ['hola', 'buenas', 'buenos dias', 'buenos días', 'buenas tardes', 'buenas noches', 'holi'],
    reply: '¡Hola! Bienvenido a Ferretería El Manque SpA. ¿En qué lo puedo ayudar hoy? Puede preguntarme por precios, horarios, despacho o devoluciones.',
    resolved: true
  },
  {
    topic: 'horario',
    keywords: ['horario', 'hora', 'abren', 'atienden', 'atención', 'abierto', 'cerrado'],
    reply: 'Nuestro horario de atención es de lunes a viernes de 09:00 a 19:00, sábados de 10:00 a 14:00. Los domingos permanecemos cerrados.',
    resolved: true
  },
  {
    topic: 'ubicacion',
    keywords: ['dirección', 'direccion', 'donde', 'dónde', 'ubicación', 'ubicacion', 'queda'],
    reply: 'Nos encontramos en Av. Libertador Bernardo O\'Higgins 1234, Rancagua, Región de O\'Higgins. Lo esperamos.',
    resolved: true
  },
  {
    topic: 'precio_taladro',
    keywords: ['taladro'],
    reply: 'El taladro percutor Bosch de 650W tiene un valor de $49.990 CLP. Incluye maletín y 6 meses de garantía del fabricante.',
    resolved: true
  },
  {
    topic: 'precio_cemento',
    keywords: ['cemento', 'saco'],
    reply: 'El saco de cemento Melón de 25 kg tiene un valor de $5.490 CLP. Si necesita más de 20 sacos, podemos coordinar despacho especial.',
    resolved: true
  },
  {
    topic: 'precio_pintura',
    keywords: ['pintura', 'latex', 'látex'],
    reply: 'El litro de pintura látex blanca tiene un valor de $8.490 CLP. Disponemos de otros colores y formatos de 4 galones.',
    resolved: true
  },
  {
    topic: 'precio_martillo',
    keywords: ['martillo'],
    reply: 'El martillo de carpintero tiene un valor de $7.990 CLP.',
    resolved: true
  },
  {
    topic: 'precio_destornillador',
    keywords: ['destornillador', 'atornillador', 'stanley'],
    reply: 'El set de destornilladores Stanley de 10 piezas tiene un valor de $12.990 CLP.',
    resolved: true
  },
  {
    topic: 'precio_tornillo',
    keywords: ['tornillo', 'tornillos'],
    reply: 'Los tornillos autoperforantes vienen en paquete de 100 unidades por $3.490 CLP.',
    resolved: true
  },
  {
    topic: 'precio_seguridad',
    keywords: ['guante', 'casco', 'seguridad', 'epp'],
    reply: 'Guantes de seguridad: $2.990 CLP. Casco de seguridad: $6.490 CLP. Ambos cumplen norma chilena.',
    resolved: true
  },
  {
    topic: 'precios_general',
    keywords: ['precio', 'valor', 'cuánto', 'cuanto', 'vale', 'cuesta'],
    reply: 'Con gusto le indico precios. Algunos referenciales: taladro Bosch 650W $49.990, saco cemento Melón 25kg $5.490, martillo $7.990, pintura látex litro $8.490. ¿Sobre qué producto necesita información?',
    resolved: true
  },
  {
    topic: 'despacho',
    keywords: ['despacho', 'envío', 'envio', 'domicilio', 'llevar', 'entrega'],
    reply: 'Realizamos despacho a domicilio en Rancagua y Machalí. El costo parte desde $3.500 CLP dependiendo de la zona y el volumen.',
    resolved: true
  },
  {
    topic: 'devolucion',
    keywords: ['devolución', 'devolucion', 'devolver', 'cambio', 'cambiar', 'reembolso'],
    reply: 'Nuestra política de devolución: plazo de 10 días corridos desde la compra, con boleta o factura, producto sin uso y en su envase original. El reembolso se realiza por el mismo medio de pago en un plazo de 5 días hábiles. Los productos a medida (ej. cortes de madera) no tienen devolución.',
    resolved: true
  },
  {
    topic: 'pago',
    keywords: ['tarjeta', 'pago', 'transferencia', 'débito', 'debito', 'crédito', 'credito', 'efectivo'],
    reply: 'Aceptamos pago con tarjeta de débito, crédito, transferencia electrónica y efectivo.',
    resolved: true
  },
  {
    topic: 'boleta',
    keywords: ['boleta', 'factura', 'comprobante'],
    reply: 'Sí, emitimos boleta y factura electrónica. Se envían al correo que nos indique al momento de la compra.',
    resolved: true
  },
  {
    topic: 'garantia',
    keywords: ['garantía', 'garantia'],
    reply: 'Las herramientas eléctricas cuentan con 6 meses de garantía del fabricante. Debe presentar su boleta o factura.',
    resolved: true
  },
  {
    topic: 'corte_madera',
    keywords: ['madera', 'corte', 'cortar'],
    reply: 'Realizamos corte de madera a medida. El servicio es gratuito en compras sobre $30.000 CLP.',
    resolved: true
  },
  {
    topic: 'gracias',
    keywords: ['gracias', 'muchas gracias', 'dale', 'perfecto'],
    reply: '¡A usted por preferirnos! Si necesita cualquier otra cosa, aquí estamos. Que tenga un excelente día.',
    resolved: true
  }
];

const HUMAN_KEYWORDS = [
  'humano',
  'persona',
  'ejecutivo',
  'asesor',
  'agente',
  'operador',
  'reclamo',
  'reclamar',
  'no entiendes',
  'no entendiste',
  'hablar con alguien'
];

function normalize(text) {
  return (text || '').toLowerCase().trim();
}

function matchRule(text) {
  const norm = normalize(text);
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => norm.includes(kw))) {
      return rule;
    }
  }
  return null;
}

function wantsHuman(text) {
  const norm = normalize(text);
  return HUMAN_KEYWORDS.some((kw) => norm.includes(kw));
}

function respond(userText) {
  if (wantsHuman(userText)) {
    return {
      text:
        'Entiendo, lo derivaré de inmediato con un ejecutivo humano de Ferretería El Manque. Su caso quedó registrado como escalado y un asesor lo contactará en los próximos minutos. Muchas gracias por su paciencia.',
      resolved: false,
      topic: 'escalamiento_humano',
      escalate: true
    };
  }

  const rule = matchRule(userText);
  if (rule) {
    return {
      text: rule.reply,
      resolved: rule.resolved,
      topic: rule.topic,
      escalate: false
    };
  }

  return {
    text:
      'No logré entender bien su consulta. Para darle una respuesta precisa, prefiero escalar su caso a un ejecutivo humano que lo contactará a la brevedad. ¿Le parece?',
    resolved: false,
    topic: 'sin_match',
    escalate: true
  };
}

module.exports = { respond };
