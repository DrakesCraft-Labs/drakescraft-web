import fs from 'node:fs/promises';
import { createHmac, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';


const app = Fastify({ logger: true, trustProxy: true, bodyLimit: 128 * 1024 });
const root = path.dirname(fileURLToPath(import.meta.url));
// Editorial manifests ship with the application; the mounted data directory is
// reserved for mutable checkout, visitor, and payment records.
const contentDir = path.join(root, 'data');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const counterFile = path.join(dataDir, 'visits.json');
const quoteFile = path.join(dataDir, 'store-quotes.jsonl');
const discordUrl = 'https://discord.com/api/guilds/699391897369575476/widget.json';
const tebexPublicToken = process.env.TEBEX_PUBLIC_TOKEN || '';
const tebexPrivateKey = process.env.TEBEX_PRIVATE_KEY || '';
const adminToken = process.env.ADMIN_TOKEN || '';
const discordSalesWebhook = process.env.DISCORD_SALES_WEBHOOK || '';
const tebexWebhookSecret = process.env.TEBEX_WEBHOOK_SECRET || '';
const translateApiKey = process.env.TRANSLATE_API_KEY || '';
const translateUpstream = process.env.TRANSLATE_UPSTREAM || 'http://libretranslate:5000';
// The Minecraft server only writes signed, non-sensitive operational telemetry.
// Star Monitor reads it through a separate internal token.
const odysseiaIngestSecret = process.env.ODYSSEIA_INGEST_SECRET || '';
const starMonitorToken = process.env.STAR_MONITOR_TOKEN || '';
const odysseiaStateFile = path.join(dataDir, 'odysseia-status.json');
const odysseiaEventsFile = path.join(dataDir, 'odysseia-events.json');
const ODYSSEIA_MAX_EVENT_AGE_MS = 5 * 60 * 1000;
const ODYSSEIA_MAX_EVENTS = 500;
const CUSTOM_KIT_PACKAGE_ID = 7516648;
let discordCache = { expiresAt: 0, value: null };
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
  'sfmaster-1h': 7545828,
  'sfmaster-24h': 7545831
};
// Solo permanece bloqueado el producto cuyo tamaño ofrecido aún no coincide con ProtectionStones.
// El resto del catálogo fue conciliado con el Purchase Engine y Tebex.
const unavailableTebexProductIds = new Set([
  'protection-481'
]);

const storeCatalog = {
  updatedAt: '2026-07-10',
  currency: 'CLP',
  payment: {
    mode: 'tebex',
    discord: 'https://discord.gg/rR7FbfCt9Y',
    checkout: 'https://pay.tebex.io'
  },
  categories: [
    { id: 'monthly', label: 'Rangos VIP', tagline: 'Suscripción mensual (30 días). Progresión griega real, perks utility y auras de armadura integradas por Odysseia.' },
    { id: 'roles', label: 'Roles de Juego', tagline: 'Suscripción mensual (30 días). Subrangos con prefijo secundario y kit diario.' },
    { id: 'kits', label: 'Kits y equipo', tagline: 'Resumen de lo que trae cada línea de rango.' },
    { id: 'protection', label: 'Protecciones', tagline: 'Territorio VIP para bases, gremios y proyectos.' },
    { id: 'utility', label: 'Utilidad', tagline: 'Dragmas de plata y beneficios de economía.' },
    { id: 'custom', label: 'Pases especiales', tagline: 'Accesos temporales con checkout y activación gestionados por Tebex.' }
  ],
  products: [
    { id: 'hercules', category: 'monthly', tier: 1, name: 'Hércules', badge: 'Entrada VIP', clp: 4990, usd: 4.99, featured: false, accent: 'bronze', summary: 'El punto de partida VIP para entrar fuerte al survival sin romper el balance del servidor.', includes: ['Suscripción mensual por 30 días, rango temporal y Hito VIP Hércules', 'Límite de hasta 3 regiones personales de 181x181; incluye 1 Hito Hércules para crear una de ellas', '3 homes, 5 warps de jugador (/pw) y hasta 20 tiendas QuickShop', 'Kit Hércules automático: set de diamante, herramientas, escudo y consumibles', 'Aura de armadura Odysseia con set completo de diamante: Velocidad I + Resistencia I', 'Entrega automática del kit Hércules, 1 Hito PS y $35.000 ₯ en Dragmas'] },
    { id: 'hestia', category: 'monthly', tier: 2, name: 'Hestia', badge: 'Social', clp: 7990, usd: 7.99, featured: false, accent: 'rose', summary: 'Comodidad social, mejor defensa y una economía temprana bastante más sólida.', includes: ['Suscripción mensual por 30 días, hereda Hércules y suma Hito VIP Hestia', 'Límite de hasta 4 regiones personales de 301x301; incluye 1 Hito Hestia para crear una de ellas', '5 homes, /nick, /ptime, /pweather, /ext y hasta 30 tiendas QuickShop', 'Kit Hestia automático: set, herramientas, escudo y consumibles', 'Aura de armadura Odysseia con set completo de diamante: Velocidad II + Health Boost I + Saturación', 'Entrega automática del kit Hestia, 1 Hito PS y $75.000 ₯ en Dragmas'] },
    { id: 'hermes', category: 'monthly', tier: 3, name: 'Hermes', badge: 'Recomendado', clp: 10990, usd: 10.99, featured: true, accent: 'violet', summary: 'El rango recomendado para jugar survival intensivo con movilidad real y mucha calidad de vida.', includes: ['Suscripción mensual por 30 días, hereda anteriores y suma Hito VIP Hermes', 'Límite de hasta 5 regiones de 421x421; incluye 1 Hito Hermes para crear una de ellas', '6 homes, 8 warps, /fly, /speed, /back, /workbench, /enderchest, /compass, /wild y hasta 40 tiendas QuickShop', 'Kit Hermes automático: set de netherita, herramientas, escudo y consumibles', 'Aura de armadura Odysseia con set completo de diamante: Velocidad IV + Health Boost I + Saturación', 'Entrega automática del kit Hermes, 1 Hito PS y $150.000 ₯ en Dragmas'] },
    { id: 'hefesto', category: 'monthly', tier: 4, name: 'Hefesto', badge: 'Técnico', clp: 15990, usd: 15.99, featured: false, accent: 'ember', summary: 'Pensado para granjas, minería pesada y jugadores técnicos que quieren herramientas reales.', includes: ['Suscripción mensual por 30 días, hereda anteriores y suma Hito VIP Hefesto', 'Límite de hasta 6 regiones de 177x177; incluye 1 Hito Hefesto para crear una de ellas', '8 homes, 8 warps, /feed, /condense, estaciones virtuales completas y hasta 50 tiendas QuickShop', 'Kit Hefesto automático: set de netherita, herramientas, escudo y consumibles', 'Aura de armadura Odysseia con set completo de netherita: Velocidad II + Health Boost II + Resistencia al Fuego + Saturación', 'Entrega automática del kit Hefesto, 1 Hito PS y $250.000 ₯ en Dragmas'] },
    { id: 'artemisa', category: 'monthly', tier: 5, name: 'Artemisa', badge: 'Exploración', clp: 22990, usd: 22.99, featured: false, accent: 'cyan', summary: 'Verticalidad, daño a distancia y supervivencia de alto nivel para dominar mapas y combates largos.', includes: ['Suscripción mensual por 30 días, hereda anteriores y suma Hito VIP Artemisa', 'Límite de hasta 8 regiones de 901x901; incluye 1 Hito Artemisa para crear una de ellas', '10 homes, 12 warps de jugador, /jump, conservación de XP al morir y hasta 60 tiendas QuickShop', 'Kit Artemisa automático: set de netherita, arco, herramientas y consumibles', 'Aura de armadura Odysseia con set completo de netherita: Velocidad III + Health Boost II + Fuerza I + Saturación', 'Entrega automática del kit Artemisa, 1 Hito PS y $450.000 ₯ en Dragmas'] },
    { id: 'afrodita', category: 'monthly', tier: 6, name: 'Afrodita', badge: 'Economía', clp: 31990, usd: 31.99, featured: false, accent: 'pink', summary: 'El rango de comercio alto: acelera la economía y mantiene una presencia premium constante.', includes: ['Suscripción mensual por 30 días, hereda anteriores y suma Hito VIP Afrodita', 'Límite de hasta 10 regiones de 1321x1321; incluye 1 Hito Afrodita para crear una de ellas', '12 homes, 15 warps, /repair, /sell y hasta 70 tiendas QuickShop', 'Kit Afrodita automático: set de netherita, herramientas, escudo y consumibles', 'Aura de armadura Odysseia con set completo de netherita: Velocidad III + Health Boost III + Fuerza I + Regeneración I + Saturación', 'Entrega automática del kit Afrodita, 1 Hito PS y $700.000 ₯ en Dragmas'] },
    { id: 'zeus', category: 'monthly', tier: 7, name: 'Zeus', badge: 'Rango top', clp: 44990, usd: 44.99, featured: true, accent: 'gold', summary: 'La cima del Olimpo: utilidades máximas, aura más fuerte y el kit más alto que hoy existe en DrakesCraft.', includes: ['Suscripción mensual por 30 días y herencia total de la línea VIP anterior', 'Límite de hasta 15 regiones de 1801x1801; incluye 1 Hito Zeus para crear una de ellas', '20 homes, 25 warps, /repair all, /heal, /near, keep inventory y hasta 80 tiendas QuickShop', 'Kit Zeus automático: set de netherita, herramientas, escudo y consumibles', 'Aura de armadura Odysseia con set completo de netherita: Velocidad IV + Health Boost IV + Fuerza II + Resistencia I + Saturación', 'Entrega automática del kit Zeus, 1 Hito PS y $1.500.000 ₯ en Dragmas'] },
    
    { id: 'minero', category: 'roles', tier: 3, name: 'Rol: Minero', badge: 'Mensual', clp: 2990, usd: 2.99, featured: false, accent: 'bronze', summary: 'Rango temporal para quienes quieren identificarse como Minero dentro de la comunidad.', includes: ['Prefijo secundario [⛏ MINERO] en el chat', 'Rango Minero por 30 días', 'Acceso al permiso interno del rol Minero', 'No incluye kit ni ítems automáticos'] },
    { id: 'cazador', category: 'roles', tier: 3, name: 'Rol: Cazador', badge: 'Mensual', clp: 2990, usd: 2.99, featured: false, accent: 'rose', summary: 'Rango temporal para quienes quieren identificarse como Cazador dentro de la comunidad.', includes: ['Prefijo secundario [⚔ CAZADOR] en el chat', 'Rango Cazador por 30 días', 'Acceso al permiso interno del rol Cazador', 'No incluye kit ni ítems automáticos'] },
    { id: 'constructor', category: 'roles', tier: 3, name: 'Rol: Constructor', badge: 'Mensual', clp: 2990, usd: 2.99, featured: false, accent: 'violet', summary: 'Rango temporal para quienes quieren identificarse como Constructor dentro de la comunidad.', includes: ['Prefijo secundario [⚒ CONSTRUCTOR] en el chat', 'Rango Constructor por 30 días', 'Acceso al permiso interno del rol Constructor', 'No incluye kit ni ítems automáticos'] },
    { id: 'lenador', category: 'roles', tier: 3, name: 'Rol: Leñador', badge: 'Mensual', clp: 2990, usd: 2.99, featured: false, accent: 'ember', summary: 'Rango temporal para quienes quieren identificarse como Leñador dentro de la comunidad.', includes: ['Prefijo secundario [🪓 LEÑADOR] en el chat', 'Rango Leñador por 30 días', 'Acceso al permiso interno del rol Leñador', 'No incluye kit ni ítems automáticos'] },
    { id: 'alquimista', category: 'roles', tier: 3, name: 'Rol: Alquimista', badge: 'Mensual', clp: 2990, usd: 2.99, featured: false, accent: 'cyan', summary: 'Rango temporal para quienes quieren identificarse como Alquimista dentro de la comunidad.', includes: ['Prefijo secundario [🧪 ALQUIMISTA] en el chat', 'Rango Alquimista por 30 días', 'Acceso al permiso interno del rol Alquimista', 'No incluye kit ni ítems automáticos'] },
    { id: 'nomada', category: 'roles', tier: 3, name: 'Rol: Nómada', badge: 'Mensual', clp: 2990, usd: 2.99, featured: false, accent: 'pink', summary: 'Rango temporal para quienes quieren identificarse como Nómada dentro de la comunidad.', includes: ['Prefijo secundario [⛺ NÓMADA] en el chat', 'Rango Nómada por 30 días', 'Acceso al permiso interno del rol Nómada', 'No incluye kit ni ítems automáticos'] },

    { id: 'kit-hermes', category: 'kits', tier: 3, name: 'Kit Hermes', badge: 'Movilidad', clp: 5990, usd: 5.99, featured: true, accent: 'violet', summary: 'Equipo de netherita de Hermes, entregado automáticamente por Odysseia.', includes: ['Set de netherita Hermes con herramientas y escudo', '64 zanahorias doradas y 64 filetes cocinados', '16 manzanas doradas, 16 perlas de ender y 3 tótems', 'Entrega automática al conectarte, con espacio libre en inventario'] },
    { id: 'kit-zeus', category: 'kits', tier: 7, name: 'Kit Zeus', badge: 'Mítico', clp: 14990, usd: 14.99, featured: true, accent: 'gold', summary: 'Equipo de netherita Zeus, entregado automáticamente por Odysseia.', includes: ['Set de netherita Zeus, herramientas y escudo', '64 zanahorias doradas y 64 filetes cocinados', '64 manzanas doradas, 64 perlas de ender y 8 tótems', 'Entrega automática al conectarte, con espacio libre en inventario'] },
    { id: 'protection-177', category: 'protection', tier: 4, name: 'Protección 177x177', badge: 'Base seria', clp: 3990, usd: 3.99, featured: false, accent: 'ember', summary: 'Hito de ProtecciónStones de 177x177 para bases y templos medianos.', includes: ['Un Hito VIP Hefesto con área final de 177x177 bloques', 'Entrega automática al conectarte, con espacio libre en inventario', 'Pensada para farms y almacenes técnicos', 'No añade un rango VIP ni aumenta el límite de regiones'] },
    { id: 'protection-481', category: 'protection', tier: 7, name: 'Protección 481x481', badge: 'En revisión', clp: 11990, usd: 11.99, featured: true, accent: 'gold', summary: 'Producto bloqueado hasta corregir la diferencia entre el tamaño vendido y la protección real del servidor.', includes: ['Checkout deshabilitado temporalmente', 'No se automatiza en Odysseia', 'Requiere decisión comercial antes de venderse', 'No se entregará un beneficio distinto al anunciado'] },
    
    { id: 'utility-economy', category: 'utility', tier: 6, name: 'Economía Premium', badge: 'Perks', clp: 6990, usd: 6.99, featured: false, accent: 'pink', summary: 'Beneficios comerciales permanentes configurados mediante LuckPerms.', includes: ['No modifica los límites de tiendas QuickShop', 'Color y formato de chat', 'Prefijo de Economía Premium', 'No incluye dinero, kit ni soporte prioritario automático'] },
    { id: 'dragmas-saco', category: 'utility', tier: 3, name: 'Saco de Dragmas (50.000 ₯)', badge: 'Comercio', clp: 1990, usd: 1.99, featured: false, accent: 'bronze', summary: 'Un saco mediano de dragmas de plata para impulsar tu economía.', includes: ['50.000 Dragmas (₯) depositados en el juego', 'Comercio instantáneo en tiendas de jugadores', 'Ideal para compra de materias primas', 'Entrega automatizada vía comando o ticket'] },
    { id: 'dragmas-cofre', category: 'utility', tier: 5, name: 'Cofre de Dragmas (250.000 ₯)', badge: 'Popular', clp: 7990, usd: 7.99, featured: true, accent: 'violet', summary: 'Cofre robusto de dragmas con un 20% de descuento incluido.', includes: ['250.000 Dragmas (₯) depositados en el juego', 'Mayor capital para comprar claims o máquinas', 'Descuento por volumen pre-aplicado', 'Entrega automatizada vía comando o ticket'] },
    { id: 'dragmas-anfora', category: 'utility', tier: 7, name: 'Ánfora de Dragmas (1.000.000 ₯)', badge: 'Olimpo', clp: 24990, usd: 24.99, featured: true, accent: 'gold', summary: 'La ánfora colosal del templo para los más influyentes. Ahorra 37%.', includes: ['1.000.000 Dragmas (₯) depositados en el juego', 'Máximo poder adquisitivo en el servidor', 'Comercio pesado y compra de items míticos', 'Entrega automatizada vía comando o ticket'] },
    { id: 'sfmaster-1h', category: 'custom', tier: 6, name: 'Pase SFMaster (1 Hora)', badge: 'Especial', clp: 5000, usd: 4.99, featured: true, accent: 'violet', summary: 'Acceso temporal y controlado a Slimefun Cheat para trabajo técnico.', includes: ['Rango SFMaster por 60 minutos cronológicos', 'Acceso a la Cheat Sheet controlada de Slimefun', 'Ítems generados marcados y no comerciables', 'Límites de reclamación y categorías bloqueadas por Odysseia', 'Se retira automáticamente al cumplir el tiempo'] },
    { id: 'sfmaster-24h', category: 'custom', tier: 7, name: 'Pase SFMaster (24 Horas)', badge: 'Especial', clp: 20000, usd: 19.99, featured: true, accent: 'gold', summary: 'Acceso temporal y controlado a Slimefun Cheat para trabajo técnico extendido.', includes: ['Rango SFMaster por 24 horas cronológicas', 'Acceso a la Cheat Sheet controlada de Slimefun', 'Ítems generados marcados y no comerciables', 'Límites de reclamación y categorías bloqueadas por Odysseia', 'Se retira automáticamente al cumplir el tiempo'] },

  ]
};

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
      purchaseAvailable: !unavailableTebexProductIds.has(product.id)
    }))
  };
}

function getTebexAuthHeader() {
  if (!tebexPublicToken || !tebexPrivateKey) {
    throw new Error('Credenciales de Tebex no configuradas');
  }
  return `Basic ${Buffer.from(`${tebexPublicToken}:${tebexPrivateKey}`).toString('base64')}`;
}

function isAdminTokenValid(request) {
  if (!adminToken) {
    app.log.warn('[WARN] ADMIN_TOKEN no configurado; /api/quote-checkout queda sin validacion extra');
    return true;
  }

  const provided = request.headers['x-admin-token'];
  if (typeof provided !== 'string' || !provided.length) return false;

  const expectedBuffer = Buffer.from(adminToken, 'utf8');
  const providedBuffer = Buffer.from(provided, 'utf8');
  if (expectedBuffer.length !== providedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, providedBuffer);
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

// Paquetes de crédito de denominación fija — descomposición greedy para precio exacto
const CREDIT_DENOMINATIONS = [
  { cents: 5000, id: 7516695 }, // $50
  { cents: 2000, id: 7516694 }, // $20
  { cents: 1000, id: 7516692 }, // $10
  { cents:  500, id: 7516691 }, // $5
  { cents:  200, id: 7516690 }, // $2
  { cents:  100, id: 7516688 }, // $1
];

function decomposeToCents(totalCents) {
  const packages = [];
  let remaining = totalCents;
  for (const { cents, id } of CREDIT_DENOMINATIONS) {
    if (remaining <= 0) break;
    const qty = Math.floor(remaining / cents);
    if (qty > 0) {
      packages.push({ id, quantity: qty });
      remaining -= qty * cents;
    }
  }
  if (remaining > 0) throw new Error(`No se puede componer exactamente $${(totalCents/100).toFixed(2)} con las denominaciones disponibles.`);
  return packages;
}

async function createTebexQuoteBasket({ nick, contact, notes, priceUsd }) {
  const totalCents = Math.round(priceUsd * 100);
  const packages = decomposeToCents(totalCents);

  const basket = await tebexRequest(`/api/accounts/${tebexPublicToken}/baskets`, {
    method: 'POST',
    body: {
      username: nick || 'JugadorDrakes',
      complete_url: 'https://web.drakescraft.cl/store.html?payment=tebex-success',
      cancel_url: 'https://web.drakescraft.cl/store.html?payment=tebex-cancel',
      complete_auto_redirect: false,
      custom: { source: 'web.drakescraft.cl', contact: contact || '', notes: notes || '', quote_type: 'custom-kit' }
    }
  });

  const ident = basket?.data?.ident;
  if (!ident) throw new Error('Tebex no devolvió ident para el basket de cotizacion');

  let latest;
  for (const pkg of packages) {
    latest = await tebexRequest(`/api/baskets/${ident}/packages`, {
      method: 'POST',
      body: { package_id: pkg.id, quantity: pkg.quantity }
    });
  }

  const checkoutUrl = latest?.data?.links?.checkout;
  if (!checkoutUrl) throw new Error('Tebex no devolvió checkout URL');

  return { basketIdent: ident, checkoutUrl, totalPrice: priceUsd };
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

const translatorLanguages = [
  { code: 'es', name: 'Spanish' },
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'de', name: 'German' }
];
const translatorLanguageCodes = new Set(translatorLanguages.map(({ code }) => code));

function translatorAuthorized(request) {
  return Boolean(translateApiKey) && safeEqualText(request.body?.api_key, translateApiKey);
}

async function forwardTranslation(request, reply, path) {
  if (!translatorAuthorized(request)) {
    return reply.code(401).send({ error: 'Unauthorized translation client.' });
  }

  const message = String(request.body?.q || '');
  const source = String(request.body?.source || '');
  const target = String(request.body?.target || '');
  if (!message || message.length > 512) {
    return reply.code(400).send({ error: 'Translation message is invalid.' });
  }
  if (path === '/translate' && (!translatorLanguageCodes.has(source) || !translatorLanguageCodes.has(target))) {
    return reply.code(400).send({ error: 'Translation language is not supported.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const payload = new URLSearchParams({
      q: message,
      ...(path === '/translate' ? { source, target, format: 'text' } : {})
    });
    const response = await fetch(`${translateUpstream}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: payload,
      signal: controller.signal
    });
    const responseBody = await response.json().catch(() => null);
    if (!response.ok || !responseBody) {
      request.log.warn({ statusCode: response.status, path }, 'Translation upstream rejected a request');
      return reply.code(503).send({ error: 'Translation service is temporarily unavailable.' });
    }
    return responseBody;
  } catch (error) {
    request.log.warn({ err: error, path }, 'Translation upstream is unavailable');
    return reply.code(503).send({ error: 'Translation service is temporarily unavailable.' });
  } finally {
    clearTimeout(timeout);
  }
}

// WorldwideChat consumes this discovery endpoint before authenticating its requests.
app.get('/api/translate/languages', async () => translatorLanguages);
app.post('/api/translate/detect', async (request, reply) => forwardTranslation(request, reply, '/detect'));
app.post('/api/translate/translate', async (request, reply) => forwardTranslation(request, reply, '/translate'));

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

const getBossesCatalog = async () => {
  return {
    ...bossesCatalog,
    summary: {
      bosses: bossesCatalog.bosses.length,
      naturalSpawnEnabled: bossesCatalog.invocation.naturalSpawnEnabled,
      topDifficulty: 'Extrema'
    }
  };
};

app.get('/api/bosses', getBossesCatalog);
// Keeps the retired browser bundle functional while cached clients refresh.
app.get('/api/pantheon', getBossesCatalog);

app.post('/api/store/tebex/checkout', async (request, reply) => {
  const body = request.body || {};
  const selectedIds = Array.isArray(body.items) ? body.items.slice(0, 12) : [];
  const validIds = new Set(storeCatalog.products.map((product) => product.id));
  const items = storeCatalog.products.filter((product) => selectedIds.includes(product.id) && validIds.has(product.id));
  const nick = String(body.nick || '').trim().slice(0, 40);
  const contact = String(body.contact || '').trim().slice(0, 80);
  const notes = String(body.notes || '').trim().slice(0, 500);

  if (body.website) return reply.code(204).send();
  if (!items.length) return reply.code(400).send({ error: 'Selecciona al menos un producto.' });

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

app.post('/api/quote-checkout', async (request, reply) => {
  const body = request.body || {};
  const nick = String(body.nick || '').trim().slice(0, 40);
  const contact = String(body.contact || '').trim().slice(0, 120);
  const notes = String(body.notes || '').trim().slice(0, 500);
  const parsedPrice = Number(body.price_usd);

  if (!isAdminTokenValid(request)) {
    return reply.code(401).send({ error: 'No autorizado.' });
  }

  if (!nick) {
    return reply.code(400).send({ error: 'nick es obligatorio.' });
  }

  if (!Number.isFinite(parsedPrice) || parsedPrice < 1 || parsedPrice > 500) {
    return reply.code(400).send({ error: 'price_usd debe ser un numero entre 1 y 500.' });
  }

  try {
    const basket = await createTebexQuoteBasket({ nick, contact, notes, priceUsd: parsedPrice });

    return {
      checkoutUrl: basket.checkoutUrl,
      price_usd: Number(parsedPrice.toFixed(2)),
      nick
    };
  } catch (error) {
    app.log.error(error, 'quote checkout error');
    return reply.code(502).send({ error: 'No se pudo crear el checkout de cotizacion.' });
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

await app.register(fastifyStatic, {
  root,
  wildcard: false,
  index: ['index.html'],
  maxAge: '1h',
  immutable: false,
  setHeaders: (response, filePath) => {
    if (filePath.endsWith('.html')) {
      response.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate');
    }
  },
  allowedPath: (pathname) => {
    const publicFiles = new Set([
      'index.html',
      'server.html',
      'jack.html',
      'odysseia.html',
      'dioses.html',
      'slimefun.html',
      'community.html',
      'rules.html',
      'store.html',
      'bosses.html',
      'admin-quote.html',
      'styles-3-2.css',
      'script-3-2.js',
      'styles-3-3.css',
      'script-3-3.js',
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
      || normalized.startsWith('data/');
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
  return reply.sendFile('index.html');
});

try {
  await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT || 8080) });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
