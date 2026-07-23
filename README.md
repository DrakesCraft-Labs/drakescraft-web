# DrakesCraft Web

Portal oficial de **DrakesCraft** desplegado en `star` con frontend estático y backend Fastify.

## Estructura actual

La web ya no se organiza como una landing única revuelta. Ahora el recorrido principal vive en páginas separadas, cada una con su propio `HTML`, `CSS` y `JSON`:

- `index.html`
- `server.html`
- `jack.html`
- `odysseia.html`
- `dioses.html` (códice público de DiosesDrakes)
- `slimefun.html`
- `community.html`
- `bosses.html`
- `store.html`
- `rules.html`

Los estilos compartidos están en [styles/base.css](/home/jack/Projects/drakescraft-web/styles/base.css) y cada página suma su hoja dedicada dentro de `styles/`.

Los textos y bloques estructurales de cada página viven en `data/*.json`.

`dioses.html` mantiene además un catálogo versionado en `scripts/dioses.js`: cada
patrón expone su pasiva, activa y postura inicial, junto con el sistema de costes,
recargas, protecciones y mantenimiento. Debe actualizarse junto a `SkillCatalog`
cuando se implemente una rama nueva.

La lógica común de navegación/render vive en `scripts/site.js`, mientras que las páginas con backend operativo usan:

- `scripts/store.js`
- `scripts/bosses.js`

## Backend

`server.js` sirve:

- archivos estáticos del portal
- `/api/overview`
- `/api/discord`
- `/api/store`
- `/api/bosses`
- checkout Tebex y notificaciones de venta firmadas

## Desarrollo

```bash
npm install
npm run check
npm start
```

## Despliegue

```text
GitHub -> star -> Fastify -> Cloudflare Tunnel -> web.drakescraft.cl
```

## Operacion

- [Migracion de la estacion operativa a Windows (2026-07-15)](docs/operations/windows-migration-2026-07-15.md)
- [Proteccion Cloudflare y checkout Tebex](docs/operations/cloudflare-security.md)
