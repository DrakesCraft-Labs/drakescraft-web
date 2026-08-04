import fs from 'node:fs/promises';
import { createHmac, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { storeCatalog } from './catalog/store-catalog.js';


const app = Fastify({ logger: true, trustProxy: true, bodyLimit: 128 * 1024 });
const root = path.dirname(fileURLToPath(import.meta.url));
// Editorial manifests ship with the application; the mounted data directory is
// reserved for mutable checkout, visitor, and payment records.
const contentDir = path.join(root, 'data');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const counterFile = path.join(dataDir, 'visits.json');
const quoteFile = path.join(dataDir, 'store-quotes.jsonl');
const tebexPublicToken = process.env.TEBEX_PUBLIC_TOKEN || '';
const tebexPrivateKey = process.env.TEBEX_PRIVATE_KEY || '';
const adminToken = process.env.ADMIN_TOKEN || '';
const discordSalesWebhook = process.env.DISCORD_SALES_WEBHOOK || '';
const tebexWebhookSecret = process.env.TEBEX_WEBHOOK_SECRET || '';
// The Minecraft server only writes signed, non-sensitive operational telemetry.
// Star Monitor reads it through a separate internal token.
const odysseiaIngestSecret = process.env.ODYSSEIA_INGEST_SECRET || '';
const starMonitorToken = process.env.STAR_MONITOR_TOKEN || '';
const odysseiaStateFile = path.join(dataDir, 'odysseia-status.json');
const odysseiaEventsFile = path.join(dataDir, 'odysseia-events.json');
const ODYSSEIA_MAX_EVENT_AGE_MS = 5 * 60 * 1000;
const ODYSSEIA_MAX_EVENTS = 500;
const CUSTOM_KIT_PACKAGE_ID = 7516648;
let visits = 0;
const legacyPaymentPaths = new Set([
  '/api/store/checkout',
  '/api/mp/webhook',
  '/api/store/paypal/checkout',
  '/api/store/paypal/capture',
  '/api/store/paypal/capture-subscription',
  '/api/paypal/webhook',
  '/api/store/quote'
]);
const checkoutBuckets = new Map();
const CHECKOUT_WINDOW_MS = 10 * 60 * 1000;
const CHECKOUT_MAX_REQUESTS = 5;
const MINECRAFT_USERNAME_PATTERN = /^\.?[A-Za-z0-9_]{3,16}$/;

function safeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function clientAddress(request) {
  const cloudflareAddress = request.headers['cf-connecting-ip'];
  return typeof cloudflareAddress === 'string' && cloudflareAddress.length <= 64
    ? cloudflareAddress
    : request.ip;
}

function checkoutAllowed(request) {
  const now = Date.now();
  const address = clientAddress(request);
  const bucket = checkoutBuckets.get(address);
  if (!bucket || now - bucket.startedAt >= CHECKOUT_WINDOW_MS) {
    checkoutBuckets.set(address, { startedAt: now, count: 1 });
    return true;
  }

  bucket.count += 1;
  if (bucket.count <= CHECKOUT_MAX_REQUESTS) return true;
  return false;
}

app.addHook('onRequest', async (request, reply) => {
  const pathname = request.url.split('?', 1)[0];
  if (legacyPaymentPaths.has(pathname)) {
    return reply.code(410).send({ error: 'Esta pasarela fue retirada. Usa Tebex.' });
  }

  if (pathname === '/api/store/tebex/checkout' && !checkoutAllowed(request)) {
    return reply.code(429).header('Retry-After', String(CHECKOUT_WINDOW_MS / 1000)).send({
      error: 'Demasiados intentos de checkout. Espera unos minutos antes de volver a intentar.'
    });
  }
});

const tebexPackageIds = {
  hercules: 7510343,
  hestia: 7510348,
  hermes: 7510349,
  hefesto: 7510356,
  artemisa: 7510357,
  afrodita: 7510358,
  zeus: 7510359,
  minero: 7510361,
  cazador: 7510363,
  constructor: 7510364,
  lenador: 7510365,
  alquimista: 7510366,
  nomada: 7510367,
  'kit-hermes': 7510368,
  'kit-zeus': 7510369,
  'protection-177': 7510370,
  'protection-481': 7510371,
  'utility-economy': 7510372,
  'dragmas-saco': 7510373,
  'dragmas-cofre': 7510374,
  'dragmas-anfora': 7510375,
  'protection-nether-colossus': 7596916,
  'protection-end-colossus': 7596920,
  'protection-atlas': 7596924,
  'sfmaster-1h': 7545828,
  'sfmaster-24h': 7545831
};
// Solo permanece bloqueado el producto cuyo tamaño ofrecido aún no coincide con ProtectionStones.
// El resto del catálogo fue conciliado con el Purchase Engine y Tebex.
const unavailableTebexProductIds = new Set([
  'protection-481'
]);

const bossesCatalog = {
  updatedAt: '2026-07-10',
  invocation: {
    mode: 'summoner-only',
    naturalSpawnEnabled: false,
    steps: [
      'Obtén el invocador exacto del jefe mítico que quieres despertar.',
      'Haz clic derecho en el suelo con ese invocador en la mano.',
      'El invocador se consume, caen rayos y el boss aparece en combate inmediatamente.'
    ],
    note: 'Cada jefe usa su propio invocador. No existe un huevo genérico único para todos.',
    obtain: {
      craftable: false,
      title: 'Cómo se consiguen hoy',
      items: [
        'Odysseia no registra una receta pública de crafteo para invocadores de bosses.',
        'La vía explícita implementada en el plugin hoy es la entrega administrativa del invocador.',
        'Comando actual detectado en el plugin: /boss give <jugador> <tipo>.'
      ]
    }
  },
  bosses: [
    {
      id: 'thor',
      name: 'Thor',
      title: 'Señor del Trueno',
      pantheon: 'Nórdico',
      accent: 'gold',
      difficulty: 'Alta',
      arena: 'Combate de presión con daño explosivo y castigos eléctricos.',
      invocationItem: 'Invocador de Thor',
      drops: ['Mjolnir'],
      rewards: 'Martillo mítico orientado a relámpagos y burst frontal.'
    },
    {
      id: 'ares',
      name: 'Ares',
      title: 'General de la Guerra',
      pantheon: 'Griego',
      accent: 'ember',
      difficulty: 'Alta',
      arena: 'Castiga el melee descuidado y premia bloqueos bien medidos.',
      invocationItem: 'Invocador de Ares',
      drops: ['Filo de Ares', 'Escudo Espartano'],
      rewards: 'Set ofensivo-defensivo para duelo cerrado y snowball de kills.'
    },
    {
      id: 'hades',
      name: 'Hades',
      title: 'Rey del Inframundo',
      pantheon: 'Griego',
      accent: 'violet',
      difficulty: 'Alta',
      arena: 'Combate oscuro con drenaje y sensación de attrition constante.',
      invocationItem: 'Invocador de Hades',
      drops: ['Guadaña de Hades'],
      rewards: 'Arma de robo de vida pensada para dominar peleas largas.'
    },
    {
      id: 'poseidon',
      name: 'Poseidón',
      title: 'Dueño del Abismo',
      pantheon: 'Griego',
      accent: 'cyan',
      difficulty: 'Alta',
      arena: 'Controla espacio con empujes, agua y desplazamiento forzado.',
      invocationItem: 'Invocador de Poseidón',
      drops: ['Tridente de Poseidón'],
      rewards: 'Tridente de control de masas con tsunami al impactar.'
    },
    {
      id: 'zeus',
      name: 'Zeus',
      title: 'Padre del Olimpo',
      pantheon: 'Griego',
      accent: 'gold',
      difficulty: 'Extrema',
      arena: 'Presión global, tormenta y castigo brutal a grupos mal posicionados.',
      invocationItem: 'Invocador de Zeus',
      drops: ['Maza de Zeus'],
      rewards: 'Reliquia de tormenta divina para castigo radial y golpes pesados.'
    },
    {
      id: 'loki',
      name: 'Loki',
      title: 'Embaucador del Vacío',
      pantheon: 'Nórdico',
      accent: 'pink',
      difficulty: 'Media-Alta',
      arena: 'Ilusiones, control visual y ventanas de burst traicioneras.',
      invocationItem: 'Invocador de Loki',
      drops: ['Daga de Loki', 'Cetro de Loki'],
      rewards: 'Kit de engaño, ceguera e invisibilidad para PvP táctico.'
    },
    {
      id: 'odin',
      name: 'Odin',
      title: 'El Padre de Todo',
      pantheon: 'Nórdico',
      accent: 'rose',
      difficulty: 'Extrema',
      arena: 'Daño celestial, utilidades híbridas y ritmo de combate impredecible.',
      invocationItem: 'Invocador de Odin',
      drops: ['Lanza de Odin', 'Casco de Odin'],
      rewards: 'Lanza eléctrica y casco mítico con ventajas permanentes de visión.'
    },
    {
      id: 'kratos',
      name: 'Kratos',
      title: 'Fantasma de Esparta',
      pantheon: 'Leyenda',
      accent: 'ember',
      difficulty: 'Extrema',
      arena: 'Melee agresivo, tirones, fuego y reliquias duales de castigo.',
      invocationItem: 'Invocador de Kratos',
      drops: ['Espadas del Caos', 'Hacha Leviatán'],
      rewards: 'Doble identidad de combate: combo brutal en melee y retorno rúnico.'
    },
    {
      id: 'heimdall',
      name: 'Heimdall',
      title: 'Vigía del Bifröst',
      pantheon: 'Nórdico',
      accent: 'cyan',
      difficulty: 'Alta',
      arena: 'Herramientas sónicas, movilidad y lectura fina de espacios.',
      invocationItem: 'Invocador de Heimdall',
      drops: ['Gjallarhorn', 'Alas del Bifröst'],
      rewards: 'Movilidad aérea y shockwave de utilidad mítica.'
    },
    {
      id: 'hidra',
      name: 'Hidra',
      title: 'Bestia de Lerna',
      pantheon: 'Griego',
      accent: 'emerald',
      difficulty: 'Alta',
      arena: 'Veneno, desgaste acelerado y control de curaciones enemigas.',
      invocationItem: 'Invocador de Hidra',
      drops: ['Colmillo de la Hidra', 'Escama de la Hidra'],
      rewards: 'Set tóxico para presión de debuffs y resistencia temática.'
    },
    {
      id: 'cerbero',
      name: 'Cerbero',
      title: 'Guardián del Umbral',
      pantheon: 'Griego',
      accent: 'violet',
      difficulty: 'Media-Alta',
      arena: 'Embestidas frontales y presión simple pero muy física.',
      invocationItem: 'Invocador de Cerbero',
      drops: ['Piel de Cerbero'],
      rewards: 'Material mítico defensivo de línea oscura.'
    },
    {
      id: 'artemisa',
      name: 'Artemisa',
      title: 'Cazadora Lunar',
      pantheon: 'Griego',
      accent: 'cyan',
      difficulty: 'Alta',
      arena: 'Control a distancia, slow severo y castigo por mala cobertura.',
      invocationItem: 'Invocador de Artemisa',
      drops: ['Arco Lunar de Artemisa'],
      rewards: 'Arco de seguimiento con debuffs de cazadora mítica.'
    },
    {
      id: 'tifon',
      name: 'Tifón',
      title: 'Padre Monstruo',
      pantheon: 'Primordial',
      accent: 'ember',
      difficulty: 'Extrema',
      arena: 'Caos volcánico, daño porcentual y castigo vertical brutal.',
      invocationItem: 'Invocador de Tifón',
      drops: ['Garra de Tifón', 'Coraza del Padre Monstruo'],
      rewards: 'Set volcánico para presión explosiva y aguante monstruoso.'
    },
    {
      id: 'prometeo',
      name: 'Prometeo',
      title: 'Llama Robada',
      pantheon: 'Titán',
      accent: 'gold',
      difficulty: 'Alta',
      arena: 'Fuego persistente, resurrección y castigo en área.',
      invocationItem: 'Invocador de Prometeo',
      drops: ['Llama Eterna de Prometeo'],
      rewards: 'Reliquia ígnea para daño en cleave y ambientación divina.'
    }
  ]
};

function isTebexEnabledProduct(product) {
  return Boolean(product && tebexPackageIds[product.id] && !unavailableTebexProductIds.has(product.id));
}

function getStoreCatalogView() {
  return {
    ...storeCatalog,
    products: storeCatalog.products.map((product) => ({
      ...product,
      tebexPackageId: tebexPackageIds[product.id] || null,
      tebexEnabled: isTebexEnabledProduct(product),
      // Un producto puede estar no disponible por decision del catalogo (aun no existe el
      // paquete en Tebex) o por estar bloqueado aqui.
      purchaseAvailable: product.purchaseAvailable !== false && !unavailableTebexProductIds.has(product.id)
    }))
  };
}

function getTebexAuthHeader() {
  if (!tebexPublicToken || !tebexPrivateKey) {
    throw new Error('Credenciales de Tebex no configuradas');
  }
  return `Basic ${Buffer.from(`${tebexPublicToken}:${tebexPrivateKey}`).toString('base64')}`;
}

async function tebexRequest(endpoint, { method = 'GET', body } = {}) {
  const response = await fetch(`https://headless.tebex.io${endpoint}`, {
    method,
    headers: {
      Authorization: getTebexAuthHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(`Tebex ${method} ${endpoint} -> ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function createTebexBasket({ nick, contact, notes, items }) {
  const basket = await tebexRequest(`/api/accounts/${tebexPublicToken}/baskets`, {
    method: 'POST',
    body: {
      username: nick || 'JugadorDrakes',
      complete_url: 'https://web.drakescraft.cl/store.html?payment=tebex-success',
      cancel_url: 'https://web.drakescraft.cl/store.html?payment=tebex-cancel',
      complete_auto_redirect: false,
      custom: {
        source: 'web.drakescraft.cl',
        contact: contact || '',
        notes: notes || ''
      }
    }
  });

  const ident = basket?.data?.ident;
  if (!ident) {
    throw new Error('Tebex no devolvió ident para el basket');
  }

  let latest = basket;
  for (const item of items) {
    latest = await tebexRequest(`/api/baskets/${ident}/packages`, {
      method: 'POST',
      body: {
        package_id: tebexPackageIds[item.id],
        quantity: 1
      }
    });
  }

  const checkoutUrl = latest?.data?.links?.checkout;
  if (!checkoutUrl) {
    throw new Error('Tebex no devolvió checkout para el basket');
  }

  return {
    basketIdent: ident,
    checkoutUrl,
    currency: latest?.data?.currency || 'USD',
    totalPrice: latest?.data?.total_price || 0
  };
}

async function loadVisits() {
  try {
    const stored = JSON.parse(await fs.readFile(counterFile, 'utf8'));
    visits = Number.isFinite(stored.visits) ? stored.visits : 0;
  } catch (error) {
    if (error.code !== 'ENOENT') app.log.warn(error, 'No se pudo leer el contador');
  }
}

async function saveVisits() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(counterFile, JSON.stringify({ visits }), 'utf8');
  } catch (error) {
    app.log.error(error, 'No se pudo guardar el contador');
  }
}

async function readJsonFile(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') app.log.warn({ err: error, file }, 'No se pudo leer estado persistente');
    return fallback;
  }
}

async function writeJsonAtomic(file, value) {
  await fs.mkdir(dataDir, { recursive: true });
  const temporaryFile = `${file}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(temporaryFile, file);
}

function validOdysseiaEvent(body) {
  if (!body || typeof body !== 'object') return false;
  return typeof body.eventId === 'string' && /^[A-Za-z0-9._:-]{8,128}$/.test(body.eventId)
    && typeof body.type === 'string' && /^[A-Z_]{3,64}$/.test(body.type)
    && typeof body.instanceId === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(body.instanceId)
    && typeof body.purchaseEngineReady === 'boolean'
    && Number.isInteger(body.catalogProducts) && body.catalogProducts >= 0 && body.catalogProducts <= 1000
    && (body.bossId === undefined || (typeof body.bossId === 'string' && /^[a-z0-9_-]{2,64}$/.test(body.bossId)))
    && (body.bossParticipants === undefined || (Number.isInteger(body.bossParticipants)
      && body.bossParticipants >= 0 && body.bossParticipants <= 500));
}

function validOdysseiaSignature(request) {
  if (!odysseiaIngestSecret) return { valid: false, status: 503 };
  const timestamp = Number(request.headers['x-odysseia-timestamp']);
  const signature = String(request.headers['x-odysseia-signature'] || '');
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > ODYSSEIA_MAX_EVENT_AGE_MS || !signature) {
    return { valid: false, status: 401 };
  }
  const expected = createHmac('sha256', odysseiaIngestSecret)
    .update(`${timestamp}.${request.rawBody || ''}`)
    .digest('hex');
  return { valid: safeEqualText(signature, expected), status: 401 };
}

function isStarMonitorRequest(request) {
  return Boolean(starMonitorToken)
    && safeEqualText(String(request.headers['x-star-monitor-token'] || ''), starMonitorToken);
}

await loadVisits();

app.addHook('onSend', async (request, reply) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Permissions-Policy', 'camera=(), geolocation=(), microphone=(), payment=(), usb=()');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('Cross-Origin-Opener-Policy', 'same-origin');
  reply.header('Cross-Origin-Resource-Policy', 'same-origin');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header(
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src * data:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://discord.com https://static.cloudflareinsights.com;"
  );
  const requestPath = request.raw.url?.split('?', 1)[0] || '';
  if (requestPath === '/' || requestPath.endsWith('.html')) {
    reply.header('Cache-Control', 'no-cache, max-age=0, must-revalidate');
  }
});

// Captura raw body antes del parseo para verificación HMAC (Tebex webhooks)
import { Readable } from 'node:stream';
app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_request, body, done) => {
  try {
    done(null, Object.fromEntries(new URLSearchParams(body)));
  } catch (error) {
    done(error);
  }
});

app.addHook('preParsing', async (request, _reply, payload) => {
  const chunks = [];
  for await (const chunk of payload) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  request.rawBody = raw.toString('utf8');
  return Readable.from(raw);
});

app.get('/api/health', async () => ({
  status: 'ok',
  service: 'drakescraft-web',
  uptimeSeconds: Math.round(process.uptime())
}));

// Odysseia is hosted outside Star, so it reaches this existing HTTPS endpoint
// with an HMAC. The accepted payload deliberately excludes players, UUIDs and
// Tebex transaction identifiers.
app.post('/api/odysseia/events', async (request, reply) => {
  const signature = validOdysseiaSignature(request);
  if (!signature.valid) {
    if (signature.status === 503) return reply.code(503).send({ error: 'Ingesta Odysseia no configurada' });
    return reply.code(401).send({ error: 'Firma Odysseia inválida o vencida' });
  }

  const event = request.body || {};
  if (!validOdysseiaEvent(event)) return reply.code(400).send({ error: 'Evento Odysseia inválido' });

  const receivedAt = Date.now();
  const normalized = {
    eventId: event.eventId,
    type: event.type,
    instanceId: event.instanceId,
    purchaseEngineReady: event.purchaseEngineReady,
    catalogProducts: event.catalogProducts,
    purchaseState: typeof event.purchaseState === 'string' ? event.purchaseState.slice(0, 64) : null,
    productId: typeof event.productId === 'string' ? event.productId.slice(0, 128) : null,
    bossId: typeof event.bossId === 'string' ? event.bossId : null,
    bossParticipants: Number.isInteger(event.bossParticipants) ? event.bossParticipants : null,
    sentAt: Number.isFinite(event.sentAt) ? event.sentAt : null,
    receivedAt
  };
  const events = await readJsonFile(odysseiaEventsFile, []);
  const known = Array.isArray(events) ? events : [];
  if (!known.some((item) => item?.eventId === normalized.eventId)) {
    known.unshift(normalized);
    await writeJsonAtomic(odysseiaEventsFile, known.slice(0, ODYSSEIA_MAX_EVENTS));
  }
  await writeJsonAtomic(odysseiaStateFile, normalized);
  return reply.code(202).send({ accepted: true });
});

// This endpoint is only useful from Star's loopback origin. It is still
// token-gated so Cloudflare cannot expose operational details accidentally.
app.get('/api/internal/odysseia/status', async (request, reply) => {
  if (!isStarMonitorRequest(request)) return reply.code(404).send({ error: 'Ruta no encontrada' });
  const latest = await readJsonFile(odysseiaStateFile, null);
  const events = await readJsonFile(odysseiaEventsFile, []);
  return {
    latest,
    events: Array.isArray(events) ? events.slice(0, ODYSSEIA_MAX_EVENTS) : []
  };
});

app.get('/api/overview', async (request, reply) => {
  const seen = request.headers.cookie?.includes('drakes_seen=1');
  if (!seen) {
    visits += 1;
    await saveVisits();
    reply.header('Set-Cookie', 'drakes_seen=1; Path=/; Max-Age=31536000; SameSite=Lax; Secure');
  }
  return {
    visits,
    region: request.headers['cf-region'] || request.headers['cf-ipcountry'] || 'La Odisea',
    city: request.headers['cf-ipcity'] || null,
    deployment: 'star',
    transport: 'Cloudflare Tunnel'
  };
});

app.get('/api/store', async () => {
  const catalog = getStoreCatalogView();
  const allPriced = catalog.products.map(p => p.clp).filter(Number.isFinite);
  const monthly = catalog.products.filter(p => p.category === 'monthly');
  const minPrice = Math.min(...allPriced);
  const maxPrice = Math.max(...allPriced);
  return {
    ...catalog,
    summary: {
      products: catalog.products.length,
      monthlyRanks: monthly.length,
      minPrice,
      maxPrice
    }
  };
});

app.post('/api/store/tebex/checkout', async (request, reply) => {
  const body = request.body || {};
  const selectedIds = Array.isArray(body.items) ? body.items.slice(0, 12) : [];
  const validIds = new Set(storeCatalog.products.map((product) => product.id));
  const items = storeCatalog.products.filter((product) => selectedIds.includes(product.id) && validIds.has(product.id));
  const nick = String(body.nick || '').trim().slice(0, 17);
  const contact = String(body.contact || '').trim().slice(0, 80);
  const notes = String(body.notes || '').trim().slice(0, 500);

  if (body.website) return reply.code(204).send();
  if (!items.length) return reply.code(400).send({ error: 'Selecciona al menos un producto.' });
  if (!MINECRAFT_USERNAME_PATTERN.test(nick)) {
    return reply.code(400).send({
      error: 'Escribe un nick válido: 3 a 16 letras, números o guiones bajos; Bedrock puede comenzar con punto.'
    });
  }

  const nonTebexItems = items.filter((product) => !isTebexEnabledProduct(product));
  if (nonTebexItems.length) {
    return reply.code(400).send({
      error: `Estos items siguen siendo manuales: ${nonTebexItems.map((product) => product.name).join(', ')}.`
    });
  }

  try {
    const quoteId = `dt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const basket = await createTebexBasket({ nick, contact, notes, items });
    const totalUsd = items.reduce((sum, product) => sum + (Number.isFinite(product.usd) ? product.usd : 0), 0);
    const quote = {
      id: quoteId,
      createdAt: new Date().toISOString(),
      type: 'tebex-checkout',
      nick,
      contact,
      notes,
      items: items.map((product) => product.id),
      tebexBasketIdent: basket.basketIdent,
      checkoutUrl: basket.checkoutUrl
    };

    await fs.mkdir(dataDir, { recursive: true });
    await fs.appendFile(quoteFile, `${JSON.stringify(quote)}\n`, 'utf8');

    await notifyQuoteDiscord({
      type: 'Checkout Tebex',
      quoteId,
      items,
      nick,
      contact,
      notes,
      total: totalUsd,
      currency: 'USD'
    });

    return {
      ok: true,
      quoteId,
      init_point: basket.checkoutUrl,
      basket_ident: basket.basketIdent,
      total_usd: Number(totalUsd.toFixed(2)),
      currency: basket.currency
    };
  } catch (error) {
    app.log.error(error, 'tebex checkout error');
    return reply.code(502).send({ error: 'No se pudo crear el checkout de Tebex.' });
  }
});

async function notifyQuoteDiscord({ type, quoteId, items, nick, contact, notes, total, currency }) {
  const webhook = process.env.DISCORD_PAYMENTS_WEBHOOK;
  if (!webhook) return;

  const names = items.map(p => p.name).join(', ');
  const formattedAmount = currency === 'CLP' 
    ? `$${total.toLocaleString('es-CL')} CLP` 
    : `$${total.toFixed(2)} USD`;
  
  let emoji = '📝';
  let color = 10181046; // Violeta para cotización manual
  let description = `Se ha generado una solicitud para adquirir: **${names}**`;
  
  if (type.includes('Tebex')) {
    color = 15844367; // Dorado Tebex
    emoji = '🟠';
    description = `Se generó un checkout de Tebex para: **${names}**`;
  }

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'DrakesCraft · Portal',
        avatar_url: 'https://web.drakescraft.cl/assets/logo-drakescraft.png',
        embeds: [{
          title: `${emoji} ${type}`,
          description,
          color,
          thumbnail: { url: 'https://web.drakescraft.cl/assets/logo-drakescraft.png' },
          fields: [
            { name: '🎮 Nick de Minecraft', value: `\`${nick || 'No especificado'}\``, inline: true },
            { name: '💬 Medio de Contacto', value: `\`${contact || 'No especificado'}\``, inline: true },
            { name: '💰 Valor Estimado', value: `**${formattedAmount}**`, inline: true },
            { name: '🔑 ID de Solicitud', value: `\`${quoteId}\``, inline: false },
            { name: '📝 Notas Adicionales', value: notes ? `>>> ${notes}` : '*Sin comentarios.*', inline: false },
          ],
          footer: { text: `DrakesCraft · Portal de Pagos · ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}` }
        }]
      })
    });
    if (!res.ok) {
      const text = await res.text();
      app.log.warn({ status: res.status, text }, 'Discord webhook returned non-2xx response');
    }
  } catch (err) {
    app.log.error(err, 'Error sending to Discord webhook');
  }
}



await app.register(fastifyStatic, {
  root: contentDir,
  prefix: '/content/',
  wildcard: false,
  decorateReply: false,
  setHeaders: (response) => response.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate')
});

// Temporary compatibility alias. Minecraft still points here until the
// pack.drakescraft.cl DNS record is moved to the active Star tunnel.
await app.register(fastifyStatic, {
  root: '/packs',
  prefix: '/resourcepack/',
  wildcard: false,
  decorateReply: false,
  maxAge: '1h',
  immutable: false
});

// The public site begins at the storefront. Minecraft resources are hosted
// separately at pack.drakescraft.cl once its DNS cutover is complete.
app.get('/', async (_request, reply) => reply.sendFile('store.html'));

// The former portal is no longer part of the public surface. Keep old links
// useful without exposing pages that describe stale systems or dead widgets.
for (const legacyPath of [
  '/index.html', '/server.html', '/odysseia.html', '/dioses.html',
  '/slimefun.html', '/bosses.html', '/community.html', '/jack.html',
  '/rules.html', '/admin-quote.html'
]) {
  app.get(legacyPath, async (_request, reply) => reply.code(301).redirect('/'));
}

await app.register(fastifyStatic, {
  root,
  wildcard: false,
  // `/` is the explicit storefront route above. Do not let the static plugin
  // register a competing index/HEAD handler for it.
  index: false,
  maxAge: '1h',
  immutable: false,
  setHeaders: (reply, filePath) => {
    if (filePath.endsWith('.html')) {
      reply.header('Cache-Control', 'no-cache, max-age=0, must-revalidate');
    }
  },
  allowedPath: (pathname) => {
    const publicFiles = new Set([
      'store.html',
      'support.html',
      'terms.html',
      'bannerdrakes.jpg',
      'dragon_fly.png',
      'logodrakescraft.png',
      'previewdiscord1.png',
      'previewdiscord2.png',
      'favicon.ico',
      'three.min.js'
    ]);
    const normalized = pathname.replace(/^[/\\]+/, '').replaceAll('\\', '/');
    return publicFiles.has(normalized)
      || normalized.startsWith('assets/')
      || normalized.startsWith('styles/')
      || normalized.startsWith('scripts/')
      || normalized === 'robots.txt';
  }
});

// ── /api/mcstatus — estado del servidor Minecraft ────────────────────────
let mcStatusCache = null;
let mcStatusCacheAt = 0;
const MC_CACHE_TTL = 60_000;

async function fetchMcStatus() {
  const now = Date.now();
  if (mcStatusCache && now - mcStatusCacheAt < MC_CACHE_TTL) return mcStatusCache;

  const [javaRes, bedrockRes] = await Promise.allSettled([
    fetch('https://api.mcsrvstat.us/3/mc.drakescraft.cl'),
    fetch('https://api.mcsrvstat.us/bedrock/3/play.drakescraft.cl')
  ]);

  const parseRes = async (r) => {
    if (r.status !== 'fulfilled' || !r.value.ok) return { online: false };
    try { return await r.value.json(); } catch { return { online: false }; }
  };

  const [java, bedrock] = await Promise.all([parseRes(javaRes), parseRes(bedrockRes)]);

  mcStatusCache = {
    java: {
      online: java.online ?? false,
      motd: java.motd?.clean?.join(' ') ?? '',
      players: { online: java.players?.online ?? 0, max: java.players?.max ?? 0 },
      version: java.version ?? '',
      icon: java.icon ?? null
    },
    bedrock: {
      online: bedrock.online ?? false,
      players: { online: bedrock.players?.online ?? 0, max: bedrock.players?.max ?? 0 },
      version: bedrock.version ?? ''
    }
  };
  mcStatusCacheAt = now;
  return mcStatusCache;
}

app.get('/api/mcstatus', async (_request, reply) => {
  try {
    return await fetchMcStatus();
  } catch (err) {
    app.log.warn(err, 'mcstatus fetch error');
    reply.code(503);
    return { java: { online: false }, bedrock: { online: false } };
  }
});

// POST /api/tebex/webhook — Tebex notifica pagos completados
app.post('/api/tebex/webhook', async (request, reply) => {
  try {
    const rawBody = request.rawBody || '';
    const sig = request.headers['x-signature'] || '';

    if (!tebexWebhookSecret) {
      app.log.error('Tebex webhook recibido sin TEBEX_WEBHOOK_SECRET configurado');
      return reply.code(503).send({ error: 'Webhook no configurado' });
    }

    const expected = createHmac('sha256', tebexWebhookSecret).update(rawBody).digest('hex');
    if (!safeEqualText(sig, expected)) {
      app.log.warn({ rawBodyLen: rawBody.length }, 'Tebex webhook: firma inválida');
      return reply.code(401).send({ error: 'Firma inválida' });
    }

    const { type, subject } = request.body || {};
    if (type !== 'payment.completed') return reply.send({ ok: true });

    const nick = subject?.username || 'Jugador';
    const packageName = subject?.packages?.[0]?.name || 'Rango';
    const priceUsd = subject?.price?.paid || 0;
    const transId = subject?.transaction_id || '—';

    if (discordSalesWebhook) {
      await fetch(discordSalesWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '🎉 ¡Nueva compra en DrakesCraft!',
            color: 0xf5c518,
            fields: [
              { name: '👤 Jugador', value: nick, inline: true },
              { name: '🏆 Rango / Perk', value: packageName, inline: true },
              { name: '💰 Valor', value: `$${priceUsd} USD`, inline: true },
              { name: '🔖 Transacción', value: transId, inline: false }
            ],
            footer: { text: 'DrakesCraft · Tienda Tebex' },
            timestamp: new Date().toISOString()
          }]
        })
      }).catch(err => app.log.error(err, 'Error enviando a Discord sales webhook'));
    }

    reply.send({ ok: true });
  } catch (err) {
    app.log.error(err, 'Tebex webhook error');
    reply.code(500).send({ error: 'Error interno' });
  }
});

app.setNotFoundHandler((request, reply) => {
  if (request.raw.url?.startsWith('/api/')) return reply.code(404).send({ error: 'Ruta no encontrada' });
  const requestedPath = request.raw.url?.split('?')[0] || '';
  if (path.extname(requestedPath)) return reply.code(404).send('Not found');
  return reply.redirect(302, '/');
});

try {
  await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT || 8080) });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
