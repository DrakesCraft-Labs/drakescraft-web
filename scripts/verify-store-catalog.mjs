import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { storeCatalog } from '../catalog/store-catalog.js';

const serverFile = fileURLToPath(new URL('../server.js', import.meta.url));
const source = await readFile(serverFile, 'utf8');
const mapMatch = source.match(/const tebexPackageIds = \{([\s\S]*?)\n\};/);

assert.ok(mapMatch, 'No se encontró el mapa de paquetes Tebex.');

const mappedProductIds = new Set(
  [...mapMatch[1].matchAll(/^\s*['"]?([^'":\s]+)['"]?\s*:\s*\d+,?$/gm)].map((match) => match[1])
);

const missing = storeCatalog.products
  .filter((product) => product.purchaseAvailable !== false)
  .filter((product) => !mappedProductIds.has(product.id))
  .map((product) => product.id);

assert.deepEqual(
  missing,
  [],
  `Productos publicados sin paquete Tebex: ${missing.join(', ')}`
);

const invalidMarkup = storeCatalog.products.flatMap((product) =>
  (product.includes || []).flatMap((item) => {
    const tags = [...item.matchAll(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi)]
      .map((match) => match[1].toLowerCase());
    const opens = item.match(/<code>/g)?.length || 0;
    const closes = item.match(/<\/code>/g)?.length || 0;
    return tags.some((tag) => tag !== 'code') || opens !== closes ? [product.id] : [];
  })
);

assert.deepEqual(
  invalidMarkup,
  [],
  `Productos con marcado inline inseguro o desbalanceado: ${[...new Set(invalidMarkup)].join(', ')}`
);

console.log(`[SUCCESS] ${storeCatalog.products.length} productos auditados contra Tebex y marcado inline seguro.`);
