import fs from 'node:fs/promises';
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
  reply.header('X-Frame-Options', 'SAMEORIGIN');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src * data:; font-src 'self' data:; connect-src 'self' https://discord.com;");
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


// ─── MercadoPago Configuration ───────────────────────────────────────────────
const mpAccessToken = process.env.MP_ACCESS_TOKEN;
let mp = null;
if (mpAccessToken) {
  mp = new MercadoPagoConfig({ accessToken: mpAccessToken });
}

// ─── PayPal Configuration ───────────────────────────────────────────────────
const paypalClientId = process.env.PAYPAL_CLIENT_ID;
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
const paypalMode = process.env.PAYPAL_MODE || 'live'; // por defecto live
const paypalBaseUrl = paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

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

async function notifyPaymentDiscord({ platform, paymentId, status, items, nick, contact, amount, currency }) {
  const webhook = process.env.DISCORD_PAYMENTS_WEBHOOK;
  if (!webhook) return;

  const names = items.map(p => p.name).join(', ');
  const emoji = status === 'approved' || status === 'COMPLETED' ? '✅' : '⚠️';
  const color = status === 'approved' || status === 'COMPLETED' ? 3066993 : 15158332;
  const formattedAmount = currency === 'CLP' 
    ? `$${amount.toLocaleString('es-CL')} CLP` 
    : `$${amount.toFixed(2)} USD`;

  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'DrakesCraft · Pagos',
      embeds: [{
        title: `${emoji} Pago ${status} via ${platform} — ${names}`,
        color,
        fields: [
          { name: '🎮 Nick', value: nick || '—', inline: true },
          { name: '💬 Contacto', value: contact || '—', inline: true },
          { name: '💰 Monto', value: formattedAmount, inline: true },
          { name: '🏦 Plataforma', value: platform, inline: true },
          { name: '🔑 ID Transacción', value: `\`${paymentId}\``, inline: false },
        ],
        footer: { text: `DrakesCraft · ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}` }
      }]
    })
  }).catch(() => {});
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

  if (body.website) return reply.code(204).send();
  if (!items.length) return reply.code(400).send({ error: 'Selecciona al menos un producto con precio.' });
  if (!mp) return reply.code(503).send({ error: 'Pagos locales con Mercado Pago no configurados.' });

  const quoteId = `dq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  
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

    return { ok: true, quoteId, init_point: prefData.init_point };
  } catch (err) {
    app.log.error(err, 'mp preference creation error');
    return reply.code(500).send({ error: 'Error al generar preferencia de Mercado Pago.' });
  }
});

// POST /api/mp/webhook — recibe notificaciones de pago de MercadoPago
app.post('/api/mp/webhook', async (request, reply) => {
  reply.code(200).send('ok'); // responder rápido a MP
  const body = request.body || {};
  if (body.type !== 'payment' || !body.data?.id || !mp) return;

  try {
    const paymentApi = new Payment(mp);
    const payment = await paymentApi.get({ id: String(body.data.id) });
    const logFile = path.join(dataDir, 'mp-payments.jsonl');
    await fs.mkdir(dataDir, { recursive: true });
    await fs.appendFile(logFile, `${JSON.stringify({ ts: new Date().toISOString(), ...payment })}\n`, 'utf8');

    if (payment.status === 'approved' || payment.status === 'in_process') {
      const meta = payment.metadata || {};
      const nick = meta.nick || payment.external_reference || '';
      const contact = meta.contact || '';
      const itemIds = Array.isArray(payment.additional_info?.items)
        ? payment.additional_info.items.map(i => i.id)
        : [];
      const items = storeCatalog.products.filter(p => itemIds.includes(p.id));
      await notifyPaymentDiscord({
        platform: 'Mercado Pago',
        paymentId: payment.id,
        status: payment.status,
        items,
        nick,
        contact,
        amount: payment.transaction_amount,
        currency: 'CLP'
      });
    }
  } catch (err) {
    app.log.warn(err, 'mp webhook error');
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

  if (body.website) return reply.code(204).send();
  if (!items.length) return reply.code(400).send({ error: 'Selecciona al menos un producto con precio en USD.' });
  if (!paypalClientId || !paypalClientSecret) {
    return reply.code(503).send({ error: 'Pagos internacionales con PayPal no configurados.' });
  }

  const totalUsd = items.reduce((sum, p) => sum + p.usd, 0);
  const quoteId = `dq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

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

    return { ok: true, quoteId, init_point: approveLink, orderId: order.id };
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

      return { ok: true, status: 'COMPLETED', orderId: order.id };
    }

    return { ok: false, status: order.status };
  } catch (err) {
    app.log.error(err, 'paypal capture error');
    return reply.code(500).send({ error: 'Error interno al capturar pago de PayPal.' });
  }
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
