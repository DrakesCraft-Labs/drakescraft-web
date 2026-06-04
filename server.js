import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';

const app = Fastify({ logger: true, trustProxy: true });
const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const counterFile = path.join(dataDir, 'visits.json');
const quoteFile = path.join(dataDir, 'store-quotes.jsonl');
const discordUrl = 'https://discord.com/api/guilds/699391897369575476/widget.json';
let discordCache = { expiresAt: 0, value: null };
let visits = 0;

const storeCatalog = {
  updatedAt: '2026-06-04',
  currency: 'CLP',
  payment: {
    mode: 'ticket',
    discord: 'https://discord.gg/rR7FbfCt9Y',
    paypal: 'https://paypal.me/jackstar6677',
    mercadoPago: 'https://link.mercadopago.cl/drakescraft'
  },
  categories: [
    { id: 'monthly', label: 'Rangos mensuales', tagline: 'Identidad griega, utilidad progresiva y kits fuertes.' },
    { id: 'kits', label: 'Kits y equipo', tagline: 'Resumen de lo que trae cada línea de rango.' },
    { id: 'protection', label: 'Protecciones', tagline: 'Territorio VIP para bases, gremios y proyectos.' },
    { id: 'utility', label: 'Utilidad', tagline: 'Comandos, economía y comodidad diaria.' },
    { id: 'custom', label: 'Especiales', tagline: 'Cotizaciones manuales sin romper el balance.' }
  ],
  products: [
    { id: 'hercules', category: 'monthly', tier: 1, name: 'Hércules', badge: 'Entrada', clp: 4990, usd: 4.99, featured: false, accent: 'bronze', summary: 'Primer salto premium para empezar cómodo.', includes: ['3 homes y 5 playerwarps', 'Chat con color, /hat y /recipe', 'Kit diamante Protección VIII + Sharpness X', 'Protección VIP 49x49'] },
    { id: 'hestia', category: 'monthly', tier: 2, name: 'Hestia', badge: 'Social', clp: 7990, usd: 7.99, featured: false, accent: 'rose', summary: 'Más presencia social y mejor kit diamante.', includes: ['5 homes y /nick', 'Hora y clima personal', 'Kit diamante Protección X + Power X', 'Protección VIP 81x81'] },
    { id: 'hermes', category: 'monthly', tier: 3, name: 'Hermes', badge: 'Recomendado', clp: 10990, usd: 10.99, featured: true, accent: 'violet', summary: 'Movilidad total para explorar y construir rápido.', includes: ['/fly, /speed, /back y /enderchest', '/workbench y mejoras de viaje', 'Kit diamante Protección XII + Sharpness XIV', 'Protección VIP 113x113'] },
    { id: 'hefesto', category: 'monthly', tier: 4, name: 'Hefesto', badge: 'Técnico', clp: 15990, usd: 15.99, featured: false, accent: 'ember', summary: 'Utilidad pesada y entrada a netherita.', includes: ['/feed, /top, /anvil y mesas premium', 'Herramientas de trabajo avanzadas', 'Kit netherita Protección XVI + Sharpness XVIII', 'Protección VIP 177x177'] },
    { id: 'artemisa', category: 'monthly', tier: 5, name: 'Artemisa', badge: 'Exploración', clp: 22990, usd: 22.99, featured: false, accent: 'cyan', summary: 'Verticalidad, movilidad y equipo endgame.', includes: ['/fly, /speed, /jump y /compass', '12 playerwarps', 'Netherita Protección XVIII + tridente Impaling XII', 'Protección VIP 241x241'] },
    { id: 'afrodita', category: 'monthly', tier: 6, name: 'Afrodita', badge: 'Economía', clp: 31990, usd: 31.99, featured: false, accent: 'pink', summary: 'Presencia premium, reparación y comercio.', includes: ['/repair y límites superiores', 'ChestShop sin tasa de apertura', 'Kit élite Protección XXII + Sharpness XXIV', 'Protección VIP 353x353'] },
    { id: 'zeus', category: 'monthly', tier: 7, name: 'Zeus', badge: 'Rango top', clp: 44990, usd: 44.99, featured: true, accent: 'gold', summary: 'El rango insignia para una odisea completa.', includes: ['/repair all, /heal, /ext y /near', 'ChestShop sin fee y sin tax al comprar', 'Kit mítico Protección XXX + Sharpness XXX', 'Protección VIP 481x481'] },
    { id: 'kit-hermes', category: 'kits', tier: 3, name: 'Kit Hermes', badge: 'Movilidad', clp: null, usd: null, featured: true, accent: 'violet', summary: 'Equipo diamante premium enfocado en viajar.', includes: ['Botas con Feather Falling X y Soul Speed IV', 'Pico Eficiencia XII + Fortune VIII', 'Arco Power XII + Infinity', 'Shulker, cohetes, totems y comida premium'] },
    { id: 'kit-zeus', category: 'kits', tier: 7, name: 'Kit Zeus', badge: 'Mítico', clp: null, usd: null, featured: true, accent: 'gold', summary: 'Netherita extrema y herramientas de línea alta.', includes: ['Protección XXX y Espinas X', 'Sharpness XXX + Looting XII', 'Doble pico Eficiencia XX', 'Beacons, shulkers, totems y recursos premium'] },
    { id: 'protection-177', category: 'protection', tier: 4, name: 'Protección 177x177', badge: 'Base seria', clp: null, usd: null, featured: false, accent: 'ember', summary: 'Terreno amplio para una base técnica.', includes: ['Área cuadrada de 177x177', 'Pensada para farms y almacenes', 'Entrega por staff', 'Revisión de ubicación incluida'] },
    { id: 'protection-481', category: 'protection', tier: 7, name: 'Protección 481x481', badge: 'Colosal', clp: null, usd: null, featured: true, accent: 'gold', summary: 'Protección gigante para proyectos grandes.', includes: ['Área cuadrada de 481x481', 'Ideal para clanes o ciudades', 'Entrega manual supervisada', 'No invade claims existentes'] },
    { id: 'utility-economy', category: 'utility', tier: 6, name: 'Economía premium', badge: 'Comercio', clp: null, usd: null, featured: true, accent: 'pink', summary: 'Ventajas comerciales sin romper el mercado.', includes: ['ChestShop sin fee', 'Menor fricción para vender', 'Revisión de abuso económico', 'Ideal para tiendas comunitarias'] },
    { id: 'custom-slimefun', category: 'custom', tier: 5, name: 'Encargo Slimefun', badge: 'Cotización', clp: null, usd: null, featured: false, accent: 'cyan', summary: 'Máquinas, componentes o ayuda técnica puntual.', includes: ['Precio según dificultad', 'Disponibilidad según etapa del servidor', 'Entrega por ticket', 'Balance revisado caso a caso'] },
    { id: 'custom-guild', category: 'custom', tier: 5, name: 'Pack de gremio', badge: 'Manual', clp: null, usd: null, featured: false, accent: 'violet', summary: 'Pack para equipos, builders o comunidades.', includes: ['Cotización personalizada', 'Enfoque builder, explorador o técnico', 'No todo se aprueba', 'Entrega coordinada por staff'] }
  ]
};

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

async function getDiscord() {
  if (discordCache.value && discordCache.expiresAt > Date.now()) return discordCache.value;
  const response = await fetch(discordUrl, {
    headers: { 'User-Agent': 'DrakesCraft-Web/2.0' },
    signal: AbortSignal.timeout(7000)
  });
  if (!response.ok) throw new Error(`Discord respondio ${response.status}`);
  const source = await response.json();
  const value = {
    name: source.name,
    invite: source.instant_invite,
    online: source.presence_count || 0,
    listed: Array.isArray(source.members) ? source.members.length : 0,
    channels: (source.channels || []).slice(0, 12).map(({ id, name }) => ({ id, name })),
    members: (source.members || []).slice(0, 16).map(({ username, status, avatar_url, game }) => ({
      username,
      status,
      avatarUrl: avatar_url,
      activity: game?.name || null
    }))
  };
  discordCache = { value, expiresAt: Date.now() + 45_000 };
  return value;
}

await loadVisits();

app.addHook('onSend', async (_request, reply) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
});

app.get('/api/health', async () => ({
  status: 'ok',
  service: 'drakescraft-web',
  uptimeSeconds: Math.round(process.uptime())
}));

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

app.get('/api/discord', async (_request, reply) => {
  try {
    return await getDiscord();
  } catch (error) {
    app.log.warn(error, 'Discord no disponible');
    reply.code(503);
    return { error: 'Discord no disponible temporalmente' };
  }
});

app.get('/api/store', async () => {
  const monthly = storeCatalog.products.filter((product) => product.category === 'monthly');
  const minPrice = Math.min(...monthly.map((product) => product.clp).filter(Number.isFinite));
  const maxPrice = Math.max(...monthly.map((product) => product.clp).filter(Number.isFinite));
  return {
    ...storeCatalog,
    summary: {
      products: storeCatalog.products.length,
      monthlyRanks: monthly.length,
      minPrice,
      maxPrice
    }
  };
});

app.post('/api/store/quote', async (request, reply) => {
  const body = request.body || {};
  const selectedIds = Array.isArray(body.items) ? body.items.slice(0, 12) : [];
  const validIds = new Set(storeCatalog.products.map((product) => product.id));
  const items = selectedIds.filter((id) => validIds.has(id));
  const nick = String(body.nick || '').trim().slice(0, 40);
  const contact = String(body.contact || '').trim().slice(0, 80);
  const notes = String(body.notes || '').trim().slice(0, 500);

  if (!items.length) return reply.code(400).send({ error: 'Selecciona al menos un producto.' });
  if (body.website) return reply.code(204).send();

  const quote = {
    id: `dq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    ipCountry: request.headers['cf-ipcountry'] || null,
    nick,
    contact,
    items,
    notes
  };

  await fs.mkdir(dataDir, { recursive: true });
  await fs.appendFile(quoteFile, `${JSON.stringify(quote)}\n`, 'utf8');

  const selected = storeCatalog.products.filter((product) => items.includes(product.id));
  const total = selected.reduce((sum, product) => sum + (Number.isFinite(product.clp) ? product.clp : 0), 0);
  return {
    ok: true,
    quoteId: quote.id,
    discordUrl: storeCatalog.payment.discord,
    total,
    ticketMessage: [
      `Solicitud tienda DrakesCraft ${quote.id}`,
      nick ? `Nick: ${nick}` : null,
      contact ? `Contacto: ${contact}` : null,
      `Items: ${selected.map((product) => product.name).join(', ')}`,
      notes ? `Notas: ${notes}` : null
    ].filter(Boolean).join('\n')
  };
});

await app.register(fastifyStatic, {
  root,
  wildcard: false,
  index: ['index.html'],
  maxAge: '1h',
  immutable: false,
  allowedPath: (pathname) => {
    const publicFiles = new Set([
      'index.html',
      'rules.html',
      'store.html',
      'styles.css',
      'script.js',
      'bannerdrakes.jpg',
      'dragon_fly.png',
      'logodrakescraft.png',
      'previewdiscord1.png',
      'previewdiscord2.png'
    ]);
    const normalized = pathname.replace(/^[/\\]+/, '').replaceAll('\\', '/');
    return publicFiles.has(normalized) || normalized.startsWith('assets/');
  }
});

app.setNotFoundHandler((request, reply) => {
  if (request.raw.url?.startsWith('/api/')) return reply.code(404).send({ error: 'Ruta no encontrada' });
  const requestedPath = request.raw.url?.split('?')[0] || '';
  if (path.extname(requestedPath)) return reply.code(404).send('Not found');
  return reply.sendFile('index.html');
});

try {
  await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT || 8080) });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
