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

console.log(`[SUCCESS] ${storeCatalog.products.length} productos auditados contra Tebex.`);
