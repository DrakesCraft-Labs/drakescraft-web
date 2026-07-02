import fs from 'node:fs/promises';
import { createHmac, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';


const app = Fastify({ logger: true, trustProxy: true });
const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const counterFile = path.join(dataDir, 'visits.json');
const quoteFile = path.join(dataDir, 'store-quotes.jsonl');
const discordUrl = 'https://discord.com/api/guilds/699391897369575476/widget.json';
const tebexPublicToken = process.env.TEBEX_PUBLIC_TOKEN || '';
const tebexPrivateKey = process.env.TEBEX_PRIVATE_KEY || '';
const adminToken = process.env.ADMIN_TOKEN || '';
const discordSalesWebhook = process.env.DISCORD_SALES_WEBHOOK || '';
const tebexWebhookSecret = process.env.TEBEX_WEBHOOK_SECRET || '';
const CUSTOM_KIT_PACKAGE_ID = 7516648;
let discordCache = { expiresAt: 0, value: null };
let visits = 0;

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
  'dragmas-anfora': 7510375
};

const storeCatalog = {
  updatedAt: '2026-06-11',
  currency: 'CLP',
  payment: {
    mode: 'tebex',
    discord: 'https://discord.gg/rR7FbfCt9Y',
    checkout: 'https://pay.tebex.io'
  },
  categories: [
    { id: 'monthly', label: 'Rangos VIP', tagline: 'Suscripción mensual (30 días). Identidad griega, utilidad progresiva y kits fuertes.' },
    { id: 'roles', label: 'Roles de Juego', tagline: 'Suscripción mensual (30 días). Subrangos con prefijo secundario y kit diario.' },
    { id: 'kits', label: 'Kits y equipo', tagline: 'Resumen de lo que trae cada línea de rango.' },
    { id: 'protection', label: 'Protecciones', tagline: 'Territorio VIP para bases, gremios y proyectos.' },
    { id: 'utility', label: 'Utilidad', tagline: 'Dragmas de plata y beneficios de economía.' },
    { id: 'economy-kits', label: 'Kits del Survival', tagline: 'Kits comprables in-game usando Dragmas (₯).' },
    { id: 'custom', label: 'Especiales', tagline: 'Cotizaciones manuales sin romper el balance.' }
  ],
  products: [
    { id: 'hercules', category: 'monthly', tier: 1, name: 'Hércules', badge: 'Entrada VIP', clp: 4990, usd: 4.99, featured: false, accent: 'bronze', summary: 'El primer gran paso en tu odisea. Ideal para empezar tu aventura con comodidad y estilo.', includes: ['3 homes y 5 warps de jugador (/pw)', 'Chat con formato de colores y comando /hat', 'Comando /clearinventory (/ci) para limpieza', '2 regiones de protección personal de 49x49', 'Kit (24h): Diamante Protec VIII, Irromp V', 'Espada Sharpness X, Saqueo V', 'Herramientas Eficiencia VIII, Fortuna VI', '48 zanahorias doradas, 64 filetes, 4 gapples, 1 Tótem', '$25,000 ₯ al reclamar el kit'] },
    { id: 'hestia', category: 'monthly', tier: 2, name: 'Hestia', badge: 'Social', clp: 7990, usd: 7.99, featured: false, accent: 'rose', summary: 'Diseñado para constructores sociales y jugadores que disfrutan de personalizar su entorno.', includes: ['5 homes y comando /nick', 'Hora (/ptime) y clima (/pweather) personal', 'Comando /ext para apagarte al instante', '3 regiones de protección personal de 81x81', 'Kit (24h): Diamante Protec X, Irromp VI, Espinas III', 'Espada Sharpness XII, Saqueo VI', 'Arco del Olimpo Poder X, Infinidad', 'Herramientas Eficiencia X, Silk Touch', '1 Shulker, 6 gapples, 2 Tótems', '$50,000 ₯ al reclamar. Hereda Hércules'] },
    { id: 'hermes', category: 'monthly', tier: 3, name: 'Hermes', badge: 'Recomendado', clp: 10990, usd: 10.99, featured: true, accent: 'violet', summary: '¡Movilidad absoluta! Explora el mapa a toda velocidad y viaja sin límites.', includes: ['Vuelo con /fly y velocidad con /speed', '/workbench y /enderchest virtuales', '/back para retornar (y al morir)', '/compass y /wild (RTP instantáneo)', '4 regiones de protección de 113x113', 'Kit (24h): Alas de Ícaro (Elytra) incluidas', 'Armadura Protec XII, Irromp VII, Soul Speed IV, Feather Falling X', 'Espada Sharpness XIV, Saqueo VII', 'Arco del Olimpo Poder XII, Infinidad', 'Herramientas Eficiencia XII, Fortuna VIII', '1 Shulker, 64 cohetes, 10 gapples, 3 Tótems', '$100,000 ₯ al reclamar. Hereda anteriores'] },
    { id: 'hefesto', category: 'monthly', tier: 4, name: 'Hefesto', badge: 'Técnico', clp: 15990, usd: 15.99, featured: false, accent: 'ember', summary: 'El rango predilecto para los creadores de granjas, mineros técnicos y entusiastas del metal.', includes: ['8 homes y comando /feed', '/anvil, /grindstone, /loom, /stonecutter, /smithingtable virtuales', 'Comando /condense para compactar recursos', '5 regiones de protección de 177x177', '/wild (RTP) sin cooldown', 'Kit (24h): Primer kit con NETHERITA completa', 'Armadura Netherita Protec XVI, Irromp VIII', 'Espada Netherita Sharpness XVIII, Saqueo VIII, Knockback I', 'Pico Netherita Eficiencia XIV, Fortuna X', '1 Beacon, 1 Shulker, 14 gapples, 1 notch apple, 4 Tótems', '$175,000 ₯ al reclamar. Hereda anteriores'] },
    { id: 'artemisa', category: 'monthly', tier: 5, name: 'Artemisa', badge: 'Exploración', clp: 22990, usd: 22.99, featured: false, accent: 'cyan', summary: 'Equipamiento mítico y verticalidad. Conquista los cielos y los abismos marinos sin temor a la muerte.', includes: ['12 warps de jugador (/pw) y comando /jump', 'Conserva tu XP al morir (keepxp)', '5 regiones de protección de 241x241', 'Kit (24h): Tridente Impaling XII, Loyalty VIII, Channeling I', 'Armadura Netherita Protec XVIII, Irromp IX, Feather Falling XIV', 'Espada Netherita Sharpness XX, Saqueo IX', 'Herramientas Netherita Eficiencia XVI, Fortuna XII', '1 Beacon, 1 Shulker, 18 gapples, 2 notch apples, 6 Tótems', '$300,000 ₯ al reclamar. Hereda anteriores'] },
    { id: 'afrodita', category: 'monthly', tier: 6, name: 'Afrodita', badge: 'Economía', clp: 31990, usd: 31.99, featured: false, accent: 'pink', summary: 'Domina la economía del servidor. Repara tus armas gratis, vende al instante y abre tiendas sin pagar tarifas.', includes: ['12 homes y 15 warps de jugador (/pw)', 'Comando /repair gratis para reparar en mano', 'Comando /sell para vender al server', 'Abre ChestShop sin pagar fee inicial ($100 ₯)', '6 regiones de protección de 353x353', 'Kit (24h): Elytra mítica Unbreaking V, Mending IV', 'Armadura Netherita Protec XXII, Irromp X, Espinas VII', 'Espada Netherita Sharpness XXIV, Saqueo X', 'Herramientas Netherita Eficiencia XVIII, Fortuna XIV', '2 Beacons, 2 Shulkers, 24 gapples, 3 notch apples, 8 Tótems', '$500,000 ₯ al reclamar. Hereda anteriores'] },
    { id: 'zeus', category: 'monthly', tier: 7, name: 'Zeus', badge: 'Rango top', clp: 44990, usd: 44.99, featured: true, accent: 'gold', summary: 'El rango insignia de DrakesCraft. El poder total del Olimpo bajo tu control.', includes: ['20 homes, 25 warps de jugador (/pw)', '/repair all y /heal al instante', '/near y conserva inventario al morir (keepinv)', 'Exención de impuestos en transacciones ChestShop', '7 regiones de protección de 481x481', 'Kit (24h): Netherita definitiva Protec XXX, Irromp XII, Espinas X', 'Espada del Olimpo Sharpness XXX, Saqueo XII, Fire Aspect V, Knockback III', 'Pico Efic XX + Fortune XVI y Pico Efic XX + Silk Touch', 'Arco del Olimpo Poder XX, Infinidad y Elytra Unbreaking V + Mending IV', '3 Beacons, 3 Shulkers, 32 gapples, 8 notch apples, 12 Tótems', '$1,000,000 ₯ al reclamar el kit'] },
    
    { id: 'minero', category: 'roles', tier: 3, name: 'Rol: Minero', badge: 'Mensual', clp: 2990, usd: 2.99, featured: false, accent: 'bronze', summary: 'El devorador de minas. Ideal para recolectores masivos. Agrega prefijo secundario en el chat.', includes: ['Prefijo [⛏ MINERO] secundario en el chat', 'Kit (24h): Pico Explosivo Élite (3x3 Slimefun) Eficiencia X + Irrompibilidad X (Irrompible)', 'Poción de Prisa Minera II (Haste II) de larga duración', 'Poción de Visión Nocturna', 'Materiales: 64 Hierros crudos, 64 Carbones, 32 Oros crudos, 8 Diamantes'] },
    { id: 'cazador', category: 'roles', tier: 3, name: 'Rol: Cazador', badge: 'Mensual', clp: 2990, usd: 2.99, featured: false, accent: 'rose', summary: 'El azote de los monstruos. Ideal para granjas de mobs y caza.', includes: ['Prefijo [⚔ CAZADOR] secundario en el chat', 'Kit (24h): 2 Atrapamobs Místicos de Slimefun', 'Espada del Cazador de Diamante Sharpness VII, Saqueo V', 'Arco con Poder VII y Retroceso II (Punch II)', 'Poción de Fuerza II y 128 Flechas'] },
    { id: 'constructor', category: 'roles', tier: 3, name: 'Rol: Constructor', badge: 'Mensual', clp: 2990, usd: 2.99, featured: false, accent: 'violet', summary: 'Diseñado para arquitectos de imperios y constructores.', includes: ['Prefijo [⚒ CONSTRUCTOR] secundario en el chat', 'Kit (24h): 1 Varita del Constructor de Slimefun', 'Materiales: 128 Hormigón Blanco, 128 Cristales, 128 Ladrillos de Piedra y madera variada'] },
    { id: 'lenador', category: 'roles', tier: 3, name: 'Rol: Leñador', badge: 'Mensual', clp: 2990, usd: 2.99, featured: false, accent: 'ember', summary: 'El destructor de bosques. Talarás madera en segundos.', includes: ['Prefijo [🪓 LEÑADOR] secundario en el chat', 'Kit (24h): Hacha del Leñador Loco de netherita con Eficiencia X, Irrompibilidad X y Sharpness VIII', '1 Grifo de Árbol (Tree Tap) de Slimefun para extraer savias', 'Materiales: 128 Troncos de roble y 128 de abeto'] },
    { id: 'alquimista', category: 'roles', tier: 3, name: 'Rol: Alquimista', badge: 'Mensual', clp: 2990, usd: 2.99, featured: false, accent: 'cyan', summary: 'El maestro de las pócimas y brebajes.', includes: ['Prefijo [🧪 ALQUIMISTA] secundario en el chat', 'Kit (24h): 1 Alambique y 64 botellas de vidrio', 'Reactivos: 32 Blaze Powder, 32 Nether Wart, 32 Glowstone', '32 Redstone, 16 Gunpowder y 4 Aliento de Dragón', 'Pociones de Velocidad II, Regeneración II y Fuerza II'] },
    { id: 'nomada', category: 'roles', tier: 3, name: 'Rol: Nómada', badge: 'Mensual', clp: 2990, usd: 2.99, featured: false, accent: 'pink', summary: 'El jinete errante. Ideal para explorar y viajar a caballo.', includes: ['Prefijo [⛺ NÓMADA] secundario en el chat', 'Kit (24h): Montura de caballo, armadura dorada para caballo, rienda y catalejo', '48 zanahorias doradas para tu montura', 'Armadura del Nómada de cuero con Protección VIII, Irrompibilidad X y Feather Falling X'] },

    { id: 'kit-hermes', category: 'kits', tier: 3, name: 'Kit Hermes', badge: 'Movilidad', clp: 5990, usd: 5.99, featured: true, accent: 'violet', summary: 'Equipo de diamante premium bendecido por Hermes, enfocado en viajar.', includes: ['Botas con Feather Falling X y Soul Speed IV', 'Pico Eficiencia XII + Fortune VIII', 'Arco Power XII + Infinity', 'Shulker, cohetes, totems y comida premium'] },
    { id: 'kit-zeus', category: 'kits', tier: 7, name: 'Kit Zeus', badge: 'Mítico', clp: 14990, usd: 14.99, featured: true, accent: 'gold', summary: 'Netherita del Olimpo con herramientas extremas de línea alta.', includes: ['Protección XXX y Espinas X', 'Sharpness XXX + Looting XII', 'Doble pico Eficiencia XX', 'Beacons, shulkers, totems y recursos premium'] },
    { id: 'protection-177', category: 'protection', tier: 4, name: 'Protección 177x177', badge: 'Base seria', clp: 3990, usd: 3.99, featured: false, accent: 'ember', summary: 'Terreno consagrado (177x177) para bases y templos medianos.', includes: ['Área cuadrada de 177x177 bloques', 'Pensada para farms y almacenes técnicos', 'Entrega rápida por staff en el servidor', 'Revisión y ayuda de ubicación incluida'] },
    { id: 'protection-481', category: 'protection', tier: 7, name: 'Protección 481x481', badge: 'Colosal', clp: 11990, usd: 11.99, featured: true, accent: 'gold', summary: 'Territorio colosal (481x481) para acrópolis, ciudades o gremios.', includes: ['Área cuadrada de 481x481 bloques', 'Ideal para clanes o ciudades grandiosas', 'Entrega manual supervisada por admin', 'No invade claims activos existentes'] },
    
    { id: 'utility-economy', category: 'utility', tier: 6, name: 'Economía Premium', badge: 'Perks', clp: 6990, usd: 6.99, featured: false, accent: 'pink', summary: 'Beneficios comerciales perpetuos para mercaderes hábiles.', includes: ['Creación de ChestShop sin pagar fee inicial', 'Menor fricción y mejores tasas para vender', 'Soporte prioritario ante bugs de economía', 'Beneficio estético y chat con color'] },
    { id: 'dragmas-saco', category: 'utility', tier: 3, name: 'Saco de Dragmas (50.000 ₯)', badge: 'Comercio', clp: 1990, usd: 1.99, featured: false, accent: 'bronze', summary: 'Un saco mediano de dragmas de plata para impulsar tu economía.', includes: ['50.000 Dragmas (₯) depositados en el juego', 'Comercio instantáneo en tiendas de jugadores', 'Ideal para compra de materias primas', 'Entrega automatizada vía comando o ticket'] },
    { id: 'dragmas-cofre', category: 'utility', tier: 5, name: 'Cofre de Dragmas (250.000 ₯)', badge: 'Popular', clp: 7990, usd: 7.99, featured: true, accent: 'violet', summary: 'Cofre robusto de dragmas con un 20% de descuento incluido.', includes: ['250.000 Dragmas (₯) depositados en el juego', 'Mayor capital para comprar claims o máquinas', 'Descuento por volumen pre-aplicado', 'Entrega automatizada vía comando o ticket'] },
    { id: 'dragmas-anfora', category: 'utility', tier: 7, name: 'Ánfora de Dragmas (1.000.000 ₯)', badge: 'Olimpo', clp: 24990, usd: 24.99, featured: true, accent: 'gold', summary: 'La ánfora colosal del templo para los más influyentes. Ahorra 37%.', includes: ['1.000.000 Dragmas (₯) depositados en el juego', 'Máximo poder adquisitivo en el servidor', 'Comercio pesado y compra de items míticos', 'Entrega automatizada vía comando o ticket'] },

    { id: 'economy-comida', category: 'economy-kits', tier: 1, name: 'Kit Comida', badge: 'Survival In-Game', clp: null, usd: null, coins: 1000, featured: false, accent: 'bronze', summary: 'Provisiones básicas de comida para tus viajes. Adquirible en el juego.', includes: ['32 Filetes cocinados', '16 Zanahorias doradas', '32 Panes', '16 Galletas', 'Cooldown de uso: 30 minutos'] },
    { id: 'economy-madera', category: 'economy-kits', tier: 1, name: 'Kit Madera', badge: 'Survival In-Game', clp: null, usd: null, coins: 2000, featured: false, accent: 'rose', summary: 'Lote de madera variada para construcción. Adquirible en el juego.', includes: ['64 Troncos de roble', '64 Troncos de abeto', '64 Troncos de abedul', '64 Troncos de roble oscuro', 'Cooldown de uso: 30 minutos'] },
    { id: 'economy-piedra', category: 'economy-kits', tier: 1, name: 'Kit Piedra', badge: 'Survival In-Game', clp: null, usd: null, coins: 2000, featured: false, accent: 'violet', summary: 'Bloques de piedra labrada para tus estructuras. Adquirible en el juego.', includes: ['64 Smooth Stone', '64 Stone Bricks', '64 Mossy Stone Bricks', '64 Deepslate Bricks', 'Cooldown de uso: 30 minutos'] },
    { id: 'economy-armadura', category: 'economy-kits', tier: 1, name: 'Kit Armadura', badge: 'Survival In-Game', clp: null, usd: null, coins: 5000, featured: false, accent: 'ember', summary: 'Set de armadura de hierro reforzado para supervivencia. Adquirible en el juego.', includes: ['Casco de hierro con Protección V, Irromp V', 'Pechera de hierro con Protección V, Irromp V', 'Grebas de hierro con Protección V, Irromp V', 'Botas de hierro con Protección V, Irromp V', 'Cooldown de uso: 1 hora'] },

    { id: 'custom-kit', category: 'custom', tier: 4, name: 'Kit Personalizado (Cotización)', badge: 'Manual', clp: null, usd: null, featured: true, accent: 'violet', summary: 'Diseña tu propio kit a medida. El staff arma el equipo según lo que necesites y te da un precio justo.', includes: ['Descripción libre de lo que quieres en el kit', 'Precio calculado según ítems y encantamientos', 'Ticket en Discord requerido para coordinar', 'Entrega manual supervisada por admin', 'Rango mínimo sugerido: ninguno — para todos'] },
    { id: 'custom-slimefun', category: 'custom', tier: 5, name: 'Encargo Slimefun (Cotización)', badge: 'Manual', clp: null, usd: null, featured: false, accent: 'cyan', summary: 'Encargos específicos de máquinas avanzadas o componentes técnicos.', includes: ['Precio final calculado post-evaluación', 'Apertura de ticket en Discord requerida', 'Viabilidad técnica revisada por admins', 'Precios de referencia: 50k a 300k Dragmas'] },
    { id: 'custom-guild', category: 'custom', tier: 5, name: 'Pack de Gremio (Cotización)', badge: 'Manual', clp: null, usd: null, featured: false, accent: 'violet', summary: 'Paquete personalizado de claims contiguos, canales de Discord VIP y perks para grupos.', includes: ['Cotización en base al número de integrantes', 'Entrevista inicial obligatoria con el Staff', 'No se aprueba contenido pay-to-win', 'Coordinación directa para la entrega'] }
  ]
};

function isTebexEnabledProduct(product) {
  return Boolean(product && tebexPackageIds[product.id]);
}

function getStoreCatalogView() {
  return {
    ...storeCatalog,
    products: storeCatalog.products.map((product) => ({
      ...product,
      tebexPackageId: tebexPackageIds[product.id] || null,
      tebexEnabled: isTebexEnabledProduct(product)
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
  reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  reply.header('X-Frame-Options', 'SAMEORIGIN');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src * data:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://discord.com https://static.cloudflareinsights.com;"
  );
  const requestPath = request.raw.url?.split('?', 1)[0] || '';
  if (requestPath === '/' || requestPath.endsWith('.html')) {
    reply.header('Cache-Control', 'no-cache, max-age=0, must-revalidate');
  }
});

// Guarda raw body para verificación HMAC de webhooks (Tebex, etc.)
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  req.rawBody = body.toString('utf8');
  try { done(null, JSON.parse(req.rawBody)); } catch (e) { done(e); }
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

  // Notificar cotización manual por Discord webhook
  await notifyQuoteDiscord({
    type: 'Nueva Solicitud (Ticket Manual)',
    quoteId: quote.id,
    items: selected,
    nick,
    contact,
    notes,
    total,
    currency: 'CLP'
  });

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
  
  if (type.includes('Mercado Pago')) {
    color = 40675; // Celeste Mercado Pago
    emoji = '🔵';
  } else if (type.includes('PayPal')) {
    color = 12423; // Azul PayPal
    emoji = '🟡';
  } else if (type.includes('Tebex')) {
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



// ─── MercadoPago Configuration ───────────────────────────────────────────────
const mpAccessToken = process.env.MP_ACCESS_TOKEN;
let mp = null;
if (mpAccessToken) {
  mp = new MercadoPagoConfig({ accessToken: mpAccessToken });
}

// ─── PayPal Configuration ───────────────────────────────────────────────────
const paypalClientId = process.env.PAYPAL_CLIENT_ID;
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
const paypalWebhookId = process.env.PAYPAL_WEBHOOK_ID;
const paypalMode = process.env.PAYPAL_MODE || 'live'; // por defecto live
const paypalBaseUrl = paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
const mpWebhookSecret = process.env.MP_WEBHOOK_SECRET;

async function getPaypalAccessToken() {
  if (!paypalClientId || !paypalClientSecret) {
    throw new Error('PayPal Client ID o Secret no configurados');
  }
  const auth = Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString('base64');
  const response = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error al obtener access token de PayPal: ${errText}`);
  }
  const data = await response.json();
  return data.access_token;
}

function safeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

// Rebuilds Mercado Pago's signed manifest without trusting the webhook payload.
function verifyMercadoPagoSignature(request) {
  if (!mpWebhookSecret) return false;

  const signatureParts = Object.fromEntries(
    String(request.headers['x-signature'] || '')
      .split(',')
      .map(part => part.trim().split('=', 2))
      .filter(([key, value]) => key && value)
  );
  const requestId = String(request.headers['x-request-id'] || '');
  const dataId = String(request.query?.['data.id'] || request.body?.data?.id || '').toLowerCase();
  const timestamp = signatureParts.ts || '';
  const receivedSignature = signatureParts.v1 || '';

  if (!requestId || !dataId || !timestamp || !receivedSignature) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const expectedSignature = createHmac('sha256', mpWebhookSecret).update(manifest).digest('hex');
  return safeEqualText(receivedSignature, expectedSignature);
}

// Uses PayPal's verification endpoint and the webhook ID bound to this application.
async function verifyPaypalWebhook(request) {
  if (!paypalWebhookId) return false;

  const accessToken = await getPaypalAccessToken();
  const response = await fetch(`${paypalBaseUrl}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transmission_id: request.headers['paypal-transmission-id'],
      transmission_time: request.headers['paypal-transmission-time'],
      cert_url: request.headers['paypal-cert-url'],
      auth_algo: request.headers['paypal-auth-algo'],
      transmission_sig: request.headers['paypal-transmission-sig'],
      webhook_id: paypalWebhookId,
      webhook_event: request.body
    })
  });

  if (!response.ok) {
    app.log.warn({ status: response.status }, 'PayPal webhook verification failed');
    return false;
  }

  const verification = await response.json();
  return verification.verification_status === 'SUCCESS';
}

const subscriptionsFile = path.join(dataDir, 'subscriptions.json');
const paypalPlansFile = path.join(dataDir, 'paypal-plans.json');

async function loadSubscriptions() {
  try {
    const data = await fs.readFile(subscriptionsFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code !== 'ENOENT') app.log.warn(error, 'No se pudo leer las suscripciones');
    return [];
  }
}

async function saveSubscriptions(list) {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    const temporaryFile = `${subscriptionsFile}.tmp`;
    await fs.writeFile(temporaryFile, JSON.stringify(list, null, 2), 'utf8');
    await fs.rename(temporaryFile, subscriptionsFile);
  } catch (error) {
    app.log.error(error, 'No se pudo guardar las suscripciones');
  }
}

async function loadPaypalPlans() {
  try {
    const data = await fs.readFile(paypalPlansFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code !== 'ENOENT') app.log.warn(error, 'No se pudo leer los planes de PayPal');
    return {};
  }
}

async function savePaypalPlans(plans) {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    const temporaryFile = `${paypalPlansFile}.tmp`;
    await fs.writeFile(temporaryFile, JSON.stringify(plans, null, 2), 'utf8');
    await fs.rename(temporaryFile, paypalPlansFile);
  } catch (error) {
    app.log.error(error, 'No se pudo guardar los planes de PayPal');
  }
}

async function getOrCreatePaypalPlan(productId, productName, usdPrice) {
  const plans = await loadPaypalPlans();
  if (plans[productId]) {
    return plans[productId];
  }

  const accessToken = await getPaypalAccessToken();

  // 1. Ensure we have a Product ID stored
  let paypalProductId = plans._productId;
  if (!paypalProductId) {
    const pResponse = await fetch(`${paypalBaseUrl}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: "DrakesCraft Suscripciones",
        description: "Suscripción a rangos y roles mensuales en DrakesCraft",
        type: "DIGITAL",
        category: "SOFTWARE"
      })
    });
    if (!pResponse.ok) {
      const errText = await pResponse.text();
      throw new Error(`Error al crear producto en PayPal: ${errText}`);
    }
    const productData = await pResponse.json();
    paypalProductId = productData.id;
    plans._productId = paypalProductId;
  }

  // 2. Create the Billing Plan
  const planResponse = await fetch(`${paypalBaseUrl}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      product_id: paypalProductId,
      name: `Suscripción ${productName}`,
      description: `Débito mensual automático para ${productName}`,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: {
            interval_unit: "MONTH",
            interval_count: 1
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: usdPrice.toFixed(2),
              currency_code: "USD"
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CANCEL",
        payment_failure_threshold: 1
      }
    })
  });

  if (!planResponse.ok) {
    const errText = await planResponse.text();
    throw new Error(`Error al crear plan de facturación en PayPal para ${productId}: ${errText}`);
  }

  const planData = await planResponse.json();
  plans[productId] = planData.id;
  await savePaypalPlans(plans);
  return planData.id;
}

async function notifyPaymentDiscord({ platform, paymentId, status, items, nick, contact, amount, currency }) {
  const webhook = process.env.DISCORD_PAYMENTS_WEBHOOK;
  if (!webhook) return;

  const names = items.map(p => p.name).join(', ');
  const isApproved = status === 'approved' || status === 'COMPLETED';
  const emoji = isApproved ? '🟢' : '🔴';
  const statusLabel = isApproved ? 'Aprobado / Completado' : `Pendiente/Rechazado (${status})`;
  const color = isApproved ? 3066993 : 15158332; // Verde esmeralda (#2ecc71) o Rojo/naranja (#e74c3c)
  const formattedAmount = currency === 'CLP' 
    ? `$${amount.toLocaleString('es-CL')} CLP` 
    : `$${amount.toFixed(2)} USD`;

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'DrakesCraft · Pagos',
        avatar_url: 'https://web.drakescraft.cl/assets/logo-drakescraft.png',
        embeds: [{
          title: `${emoji} Pago Recibido — ${platform}`,
          description: `¡Se ha completado una transacción con éxito para: **${names}**!`,
          color,
          thumbnail: { url: 'https://web.drakescraft.cl/assets/logo-drakescraft.png' },
          fields: [
            { name: '🎮 Nick del Jugador', value: `\`${nick || '—'}\``, inline: true },
            { name: '💬 Contacto', value: `\`${contact || '—'}\``, inline: true },
            { name: '💰 Monto Pagado', value: `**${formattedAmount}**`, inline: true },
            { name: '🏦 Pasarela', value: `\`${platform}\``, inline: true },
            { name: '📊 Estado del Pago', value: `\`${statusLabel}\``, inline: true },
            { name: '🔑 ID de Transacción', value: `\`${paymentId}\``, inline: false },
          ],
          footer: { text: `DrakesCraft · Portal de Pagos · ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}` }
        }]
      })
    });
    if (!res.ok) {
      const text = await res.text();
      app.log.warn({ status: res.status, text }, 'Discord payments webhook returned non-2xx response');
    }
  } catch (err) {
    app.log.error(err, 'Error sending payment to Discord webhook');
  }
}

// POST /api/store/checkout — crea preferencia de pago en MP y devuelve init_point
app.post('/api/store/checkout', async (request, reply) => {
  const body = request.body || {};
  const selectedIds = Array.isArray(body.items) ? body.items.slice(0, 12) : [];
  const validIds = new Set(storeCatalog.products.map(p => p.id));
  const items = storeCatalog.products.filter(p => selectedIds.includes(p.id) && validIds.has(p.id) && Number.isFinite(p.clp));
  const nick = String(body.nick || '').trim().slice(0, 40);
  const contact = String(body.contact || '').trim().slice(0, 80);
  const notes = String(body.notes || '').trim().slice(0, 500);
  const autoRenew = !!body.autoRenew;

  if (body.website) return reply.code(204).send();
  if (!items.length) return reply.code(400).send({ error: 'Selecciona al menos un producto con precio.' });
  if (!mp) return reply.code(503).send({ error: 'Pagos locales con Mercado Pago no configurados.' });

  const quoteId = `dq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  if (autoRenew) {
    if (items.length !== 1) {
      return reply.code(400).send({ error: 'Para activar la renovación automática, debes seleccionar exactamente un Rango VIP o Rol a la vez.' });
    }
    const targetItem = items[0];
    if (targetItem.category !== 'monthly' && targetItem.category !== 'roles') {
      return reply.code(400).send({ error: 'La renovación automática solo está disponible para Rangos VIP y Roles de Juego.' });
    }
    if (!contact || !contact.includes('@')) {
      return reply.code(400).send({ error: 'Para activar la renovación automática, debes ingresar un correo electrónico válido en el campo de contacto para registrar tu suscripción.' });
    }

    try {
      const response = await fetch('https://api.mercadopago.com/v1/preapproval', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payer_email: contact.trim(),
          back_url: 'https://web.drakescraft.cl/store.html?payment=mp-sub-success',
          reason: `Suscripción Mensual — ${targetItem.name}`,
          external_reference: quoteId,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: targetItem.clp,
            currency_id: 'CLP'
          },
          notification_url: 'https://web.drakescraft.cl/api/mp/webhook',
          status: 'pending'
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        app.log.warn({ errText }, 'Error al crear preaprobación de Mercado Pago');
        return reply.code(500).send({ error: 'Error al generar la suscripción en la pasarela de Mercado Pago.' });
      }

      const preapproval = await response.json();
      const initPoint = preapproval.init_point;

      // Registrar suscripción localmente
      const subscriptions = await loadSubscriptions();
      subscriptions.push({
        id: preapproval.id,
        platform: 'Mercado Pago',
        nick,
        contact,
        productId: targetItem.id,
        productName: targetItem.name,
        createdAt: new Date().toISOString()
      });
      await saveSubscriptions(subscriptions);

      const quote = { id: quoteId, createdAt: new Date().toISOString(), nick, contact, items: [targetItem.id], notes, mpPreapprovalId: preapproval.id };
      await fs.mkdir(dataDir, { recursive: true });
      await fs.appendFile(quoteFile, `${JSON.stringify(quote)}\n`, 'utf8');

      // Notificar a Discord la intención de suscripción
      await notifyQuoteDiscord({
        type: 'Nueva Intención de Suscripción (Mercado Pago)',
        quoteId,
        items,
        nick,
        contact,
        notes,
        total: targetItem.clp,
        currency: 'CLP'
      });

      return { ok: true, quoteId, init_point: initPoint, preapprovalId: preapproval.id };
    } catch (err) {
      app.log.error(err, 'mp preapproval creation error');
      return reply.code(500).send({ error: 'Error interno de Mercado Pago al procesar suscripción.' });
    }
  }
  
  try {
    const pref = new Preference(mp);
    const prefData = await pref.create({ body: {
      external_reference: quoteId,
      items: items.map(p => ({
        id: p.id,
        title: `DrakesCraft — ${p.name}`,
        quantity: 1,
        unit_price: p.clp,
        currency_id: 'CLP'
      })),
      payer: { name: nick || undefined, email: contact?.includes('@') ? contact : undefined },
      back_urls: {
        success: 'https://web.drakescraft.cl/store.html?payment=success',
        failure: 'https://web.drakescraft.cl/store.html?payment=failure',
        pending: 'https://web.drakescraft.cl/store.html?payment=pending'
      },
      auto_return: 'approved',
      notification_url: 'https://web.drakescraft.cl/api/mp/webhook',
      metadata: { nick, contact, notes, quoteId }
    }});

    const quote = { id: quoteId, createdAt: new Date().toISOString(), nick, contact, items: items.map(p => p.id), notes, mpPrefId: prefData.id };
    await fs.mkdir(dataDir, { recursive: true });
    await fs.appendFile(quoteFile, `${JSON.stringify(quote)}\n`, 'utf8');

    // Notificar a Discord la intención de pago
    const totalClp = items.reduce((sum, p) => sum + p.clp, 0);
    await notifyQuoteDiscord({
      type: 'Nueva Intención de Pago (Mercado Pago)',
      quoteId,
      items,
      nick,
      contact,
      notes,
      total: totalClp,
      currency: 'CLP'
    });

    return { ok: true, quoteId, init_point: prefData.init_point };
  } catch (err) {
    app.log.error(err, 'mp preference creation error');
    return reply.code(500).send({ error: 'Error al generar preferencia de Mercado Pago.' });
  }
});

// POST /api/mp/webhook — recibe notificaciones de pago de MercadoPago
app.post('/api/mp/webhook', async (request, reply) => {
  const body = request.body || {};
  if (!verifyMercadoPagoSignature(request)) {
    return reply.code(401).send({ error: 'Firma de Mercado Pago inválida.' });
  }
  if ((body.type !== 'payment' && body.topic !== 'payment') || !body.data?.id || !mp) {
    return reply.code(200).send('ignored');
  }

  try {
    const paymentApi = new Payment(mp);
    const payment = await paymentApi.get({ id: String(body.data.id) });
    const logFile = path.join(dataDir, 'mp-payments.jsonl');
    await fs.mkdir(dataDir, { recursive: true });
    await fs.appendFile(logFile, `${JSON.stringify({ ts: new Date().toISOString(), ...payment })}\n`, 'utf8');

    if (payment.status === 'approved' || payment.status === 'in_process') {
      const meta = payment.metadata || {};
      let nick = meta.nick || payment.external_reference || '';
      let contact = meta.contact || '';
      
      // Mapeo si viene de una suscripción/preaprobación
      let itemIds = [];
      const preapprovalId = payment.preapproval_id;
      let isSubscription = false;

      if (preapprovalId) {
        const subscriptions = await loadSubscriptions();
        const subRecord = subscriptions.find(s => s.id === preapprovalId);
        if (subRecord) {
          nick = subRecord.nick;
          contact = subRecord.contact;
          itemIds = [subRecord.productId];
          isSubscription = true;
        }
      }

      if (itemIds.length === 0) {
        itemIds = Array.isArray(payment.additional_info?.items)
          ? payment.additional_info.items.map(i => i.id)
          : [];
      }

      const items = storeCatalog.products.filter(p => itemIds.includes(p.id));

      await notifyPaymentDiscord({
        platform: isSubscription ? 'Mercado Pago (Suscripción)' : 'Mercado Pago',
        paymentId: payment.id,
        status: payment.status,
        items,
        nick,
        contact,
        amount: payment.transaction_amount,
        currency: 'CLP'
      });

      // Agregar a la cola de entregas automáticas
      if (payment.status === 'approved') {
        const pending = await loadPendingPurchases();
        for (const item of items) {
          const txnId = isSubscription ? `mp_sub_payment_${payment.id}_${item.id}` : `mp_${payment.id}_${item.id}`;
          if (!pending.some(p => p.id === txnId)) {
            pending.push({
              id: txnId,
              nick,
              productId: item.id,
              productName: item.name,
              timestamp: new Date().toISOString()
            });
          }
        }
        await savePendingPurchases(pending);
      }
    }
    return reply.code(200).send('ok');
  } catch (err) {
    app.log.warn(err, 'mp webhook error');
    return reply.code(500).send({ error: 'No se pudo procesar la notificación.' });
  }
});

// POST /api/store/paypal/checkout — crea preferencia de pago en PayPal y devuelve init_point
app.post('/api/store/paypal/checkout', async (request, reply) => {
  const body = request.body || {};
  const selectedIds = Array.isArray(body.items) ? body.items.slice(0, 12) : [];
  const validIds = new Set(storeCatalog.products.map(p => p.id));
  const items = storeCatalog.products.filter(p => selectedIds.includes(p.id) && validIds.has(p.id) && Number.isFinite(p.usd));
  const nick = String(body.nick || '').trim().slice(0, 40);
  const contact = String(body.contact || '').trim().slice(0, 80);
  const notes = String(body.notes || '').trim().slice(0, 500);
  const autoRenew = !!body.autoRenew;

  if (body.website) return reply.code(204).send();
  if (!items.length) return reply.code(400).send({ error: 'Selecciona al menos un producto con precio en USD.' });
  if (!paypalClientId || !paypalClientSecret) {
    return reply.code(503).send({ error: 'Pagos internacionales con PayPal no configurados.' });
  }

  const quoteId = `dq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  if (autoRenew) {
    if (items.length !== 1) {
      return reply.code(400).send({ error: 'Para activar la renovación automática, debes seleccionar exactamente un Rango VIP o Rol a la vez.' });
    }
    const targetItem = items[0];
    if (targetItem.category !== 'monthly' && targetItem.category !== 'roles') {
      return reply.code(400).send({ error: 'La renovación automática solo está disponible para Rangos VIP y Roles de Juego.' });
    }

    try {
      const planId = await getOrCreatePaypalPlan(targetItem.id, targetItem.name, targetItem.usd);
      const accessToken = await getPaypalAccessToken();

      const subResponse = await fetch(`${paypalBaseUrl}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan_id: planId,
          custom_id: JSON.stringify({ nick, contact, notes, quoteId }),
          application_context: {
            brand_name: "DrakesCraft",
            locale: "es-ES",
            user_action: "SUBSCRIBE_NOW",
            return_url: "https://web.drakescraft.cl/store.html?payment=paypal-sub-success",
            cancel_url: "https://web.drakescraft.cl/store.html?payment=paypal-sub-cancel"
          }
        })
      });

      if (!subResponse.ok) {
        const errText = await subResponse.text();
        app.log.warn({ errText }, 'Error al crear suscripción de PayPal');
        return reply.code(500).send({ error: 'Error al generar la suscripción en la pasarela de PayPal.' });
      }

      const subscription = await subResponse.json();
      const approveLink = subscription.links.find(l => l.rel === 'approve')?.href;

      // Registrar suscripción localmente
      const subscriptions = await loadSubscriptions();
      subscriptions.push({
        id: subscription.id,
        platform: 'PayPal',
        nick,
        contact,
        productId: targetItem.id,
        productName: targetItem.name,
        createdAt: new Date().toISOString()
      });
      await saveSubscriptions(subscriptions);

      const quote = { id: quoteId, createdAt: new Date().toISOString(), nick, contact, items: [targetItem.id], notes, paypalSubscriptionId: subscription.id };
      await fs.mkdir(dataDir, { recursive: true });
      await fs.appendFile(quoteFile, `${JSON.stringify(quote)}\n`, 'utf8');

      // Notificar a Discord la intención de suscripción
      await notifyQuoteDiscord({
        type: 'Nueva Intención de Suscripción (PayPal)',
        quoteId,
        items,
        nick,
        contact,
        notes,
        total: targetItem.usd,
        currency: 'USD'
      });

      return { ok: true, quoteId, init_point: approveLink, subscriptionId: subscription.id };
    } catch (err) {
      app.log.error(err, 'paypal subscription creation error');
      return reply.code(500).send({ error: err.message || 'Error interno de PayPal al procesar suscripción.' });
    }
  }

  const totalUsd = items.reduce((sum, p) => sum + p.usd, 0);

  try {
    const accessToken = await getPaypalAccessToken();
    const response = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: quoteId,
          amount: {
            currency_code: 'USD',
            value: totalUsd.toFixed(2)
          },
          description: `DrakesCraft — ${items.map(p => p.name).join(', ')}`,
          custom_id: JSON.stringify({ nick, contact, notes, quoteId })
        }],
        application_context: {
          brand_name: 'DrakesCraft',
          locale: 'es-ES',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: 'https://web.drakescraft.cl/store.html?payment=paypal-success',
          cancel_url: 'https://web.drakescraft.cl/store.html?payment=paypal-cancel'
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      app.log.warn({ errText }, 'Error al crear orden de PayPal');
      return reply.code(500).send({ error: 'Error al crear orden en la pasarela de PayPal.' });
    }

    const order = await response.json();
    const approveLink = order.links.find(l => l.rel === 'approve')?.href;

    const quote = { id: quoteId, createdAt: new Date().toISOString(), nick, contact, items: items.map(p => p.id), notes, paypalOrderId: order.id };
    await fs.mkdir(dataDir, { recursive: true });
    await fs.appendFile(quoteFile, `${JSON.stringify(quote)}\n`, 'utf8');

    // Notificar a Discord la intención de pago
    await notifyQuoteDiscord({
      type: 'Nueva Intención de Pago (PayPal)',
      quoteId,
      items,
      nick,
      contact,
      notes,
      total: totalUsd,
      currency: 'USD'
    });

    return { ok: true, quoteId, init_point: approveLink, orderId: order.id, total_usd: totalUsd };
  } catch (err) {
    app.log.error(err, 'paypal checkout creation error');
    return reply.code(500).send({ error: 'Error interno de PayPal.' });
  }
});

// POST /api/store/paypal/capture — captura el pago de PayPal una vez aprobado
app.post('/api/store/paypal/capture', async (request, reply) => {
  const body = request.body || {};
  const orderId = body.orderId;
  if (!orderId) return reply.code(400).send({ error: 'Falta orderId' });

  try {
    const accessToken = await getPaypalAccessToken();
    const response = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      app.log.warn({ errText }, 'Error al capturar orden de PayPal');
      return reply.code(500).send({ error: 'No se pudo capturar el pago en la pasarela de PayPal.' });
    }

    const order = await response.json();
    const logFile = path.join(dataDir, 'paypal-payments.jsonl');
    await fs.mkdir(dataDir, { recursive: true });
    await fs.appendFile(logFile, `${JSON.stringify({ ts: new Date().toISOString(), ...order })}\n`, 'utf8');

    if (order.status === 'COMPLETED') {
      const purchaseUnit = order.purchase_units?.[0] || {};
      const customId = purchaseUnit.custom_id;
      let nick = '';
      let contact = '';
      let notes = '';
      let quoteId = '';

      try {
        if (customId) {
          const meta = JSON.parse(customId);
          nick = meta.nick || '';
          contact = meta.contact || '';
          notes = meta.notes || '';
          quoteId = meta.quoteId || '';
        }
      } catch (_) {}

      const captureDetails = purchaseUnit.payments?.captures?.[0] || {};
      const total = parseFloat(captureDetails.amount?.value || 0);

      // Cargar items de la cotización si es posible
      let items = [];
      try {
        const quotesContent = await fs.readFile(quoteFile, 'utf8');
        for (const line of quotesContent.split('\n')) {
          if (!line.trim()) continue;
          const q = JSON.parse(line);
          if (q.id === quoteId || q.paypalOrderId === orderId) {
            items = storeCatalog.products.filter(p => q.items.includes(p.id));
            break;
          }
        }
      } catch (_) {}

      // Si no los pudimos mapear, usar descripcion o nombres genericos
      if (!items.length) {
        items = [{ name: `Pedido PayPal (${orderId})` }];
      }

      await notifyPaymentDiscord({
        platform: 'PayPal',
        paymentId: order.id,
        status: order.status,
        items,
        nick,
        contact,
        amount: total,
        currency: 'USD'
      });

      // Agregar a la cola de entregas automáticas
      const pending = await loadPendingPurchases();
      for (const item of items) {
        if (!item.id) continue;
        const txnId = `pp_${order.id}_${item.id}`;
        if (!pending.some(p => p.id === txnId)) {
          pending.push({
            id: txnId,
            nick,
            productId: item.id,
            productName: item.name,
            timestamp: new Date().toISOString()
          });
        }
      }
      await savePendingPurchases(pending);

      return { ok: true, status: 'COMPLETED', orderId: order.id };
    }

    return { ok: false, status: order.status };
  } catch (err) {
    app.log.error(err, 'paypal capture error');
    return reply.code(500).send({ error: 'Error interno al capturar pago de PayPal.' });
  }
});

// POST /api/store/paypal/capture-subscription — valida la aprobación; la entrega espera el cobro confirmado
app.post('/api/store/paypal/capture-subscription', async (request, reply) => {
  const body = request.body || {};
  const subscriptionId = body.subscriptionId;
  if (!subscriptionId) return reply.code(400).send({ error: 'Falta subscriptionId' });

  try {
    const accessToken = await getPaypalAccessToken();
    const response = await fetch(`${paypalBaseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      app.log.warn({ errText }, 'Error al consultar suscripción de PayPal');
      return reply.code(500).send({ error: 'No se pudo consultar el estado de la suscripción en PayPal.' });
    }

    const subscription = await response.json();
    const status = subscription.status;

    if (status === 'ACTIVE' || status === 'APPROVED') {
      const subscriptions = await loadSubscriptions();
      const subRecord = subscriptions.find(s => s.id === subscriptionId);
      if (!subRecord) {
        return reply.code(400).send({ error: 'No se pudo asociar la suscripción con un producto válido.' });
      }

      return { ok: true, status, subscriptionId, paymentPending: true };
    }

    return { ok: false, status };
  } catch (err) {
    app.log.error(err, 'paypal subscription capture error');
    return reply.code(500).send({ error: 'Error interno al verificar la suscripción de PayPal.' });
  }
});

// POST /api/paypal/webhook — recibe notificaciones de PayPal (suscripciones recurrentes)
app.post('/api/paypal/webhook', async (request, reply) => {
  try {
    if (!await verifyPaypalWebhook(request)) {
      return reply.code(401).send({ error: 'Firma de PayPal inválida.' });
    }
  } catch (err) {
    app.log.error(err, 'Error verificando webhook de PayPal');
    return reply.code(503).send({ error: 'No se pudo verificar la notificación.' });
  }

  const body = request.body || {};
  const eventType = body.event_type;

  if (eventType !== 'PAYMENT.SALE.COMPLETED') {
    return reply.code(200).send('ignored');
  }

  const resource = body.resource || {};
  const billingAgreementId = resource.billing_agreement_id;

  if (!billingAgreementId) {
    return reply.code(200).send('ignored');
  }

  try {
    const subscriptions = await loadSubscriptions();
    const subRecord = subscriptions.find(s => s.id === billingAgreementId);

    if (!subRecord) {
      app.log.warn({ billingAgreementId }, 'Webhook de pago recibido para suscripción no registrada localmente.');
      return reply.code(200).send('ignored');
    }

    const nick = subRecord.nick;
    const contact = subRecord.contact;
    const productId = subRecord.productId;
    const productName = subRecord.productName;
    const saleId = resource.id;
    const amount = parseFloat(resource.amount?.total || 0);

    const pending = await loadPendingPurchases();
    const txnId = `pp_sale_${saleId}`;

    if (!pending.some(p => p.id === txnId)) {
      pending.push({
        id: txnId,
        nick,
        productId,
        productName,
        timestamp: new Date().toISOString()
      });
      await savePendingPurchases(pending);

      await notifyPaymentDiscord({
        platform: 'PayPal (Renovación Automática)',
        paymentId: saleId,
        status: 'COMPLETED',
        items: [{ id: productId, name: productName }],
        nick,
        contact,
        amount,
        currency: 'USD'
      });

      app.log.info({ saleId, billingAgreementId, nick }, 'Renovación automática de PayPal procesada y encolada.');
    }
    return reply.code(200).send('ok');
  } catch (err) {
    app.log.error(err, 'Error procesando webhook de pago de PayPal');
    return reply.code(500).send({ error: 'No se pudo procesar la notificación.' });
  }
});

const storeApiKey = process.env.STORE_API_KEY;
const pendingPurchasesFile = path.join(dataDir, 'pending-purchases.json');

async function loadPendingPurchases() {
  try {
    const data = await fs.readFile(pendingPurchasesFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code !== 'ENOENT') app.log.warn(error, 'No se pudo leer las compras pendientes');
    return [];
  }
}

async function savePendingPurchases(list) {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    const temporaryFile = `${pendingPurchasesFile}.tmp`;
    await fs.writeFile(temporaryFile, JSON.stringify(list, null, 2), 'utf8');
    await fs.rename(temporaryFile, pendingPurchasesFile);
  } catch (error) {
    app.log.error(error, 'No se pudo guardar las compras pendientes');
  }
}

// GET /api/store/pending
app.get('/api/store/pending', async (request, reply) => {
  const key = request.headers['x-api-key'];
  if (!storeApiKey) return reply.code(503).send({ error: 'API de entregas no configurada.' });
  if (!key || !safeEqualText(key, storeApiKey)) {
    return reply.code(401).send({ error: 'No autorizado' });
  }
  const pending = await loadPendingPurchases();
  return pending;
});

// POST /api/store/confirm
app.post('/api/store/confirm', async (request, reply) => {
  const key = request.headers['x-api-key'];
  if (!storeApiKey) return reply.code(503).send({ error: 'API de entregas no configurada.' });
  if (!key || !safeEqualText(key, storeApiKey)) {
    return reply.code(401).send({ error: 'No autorizado' });
  }
  const body = request.body || {};
  const id = body.id;
  if (!id) {
    return reply.code(400).send({ error: 'Falta id de transaccion' });
  }
  const pending = await loadPendingPurchases();
  const filtered = pending.filter(p => p.id !== id);
  await savePendingPurchases(filtered);
  return { ok: true };
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
      'three.min.js'
    ]);
    const normalized = pathname.replace(/^[/\\]+/, '').replaceAll('\\', '/');
    return publicFiles.has(normalized) || normalized.startsWith('assets/');
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
    const sig = request.headers['x-signature'] || '';
    const expected = createHmac('sha256', tebexWebhookSecret).update(request.rawBody || '').digest('hex');
    if (!tebexWebhookSecret || sig !== expected) {
      app.log.warn({ sig, expected }, 'Tebex webhook: firma inválida');
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
