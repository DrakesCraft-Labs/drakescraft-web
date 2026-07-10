# DrakesCraft Web

Portal oficial de **DrakesCraft** desplegado en `star` con frontend estático y backend Fastify.

## Estructura actual

La web ya no se organiza como una landing única revuelta. Ahora el recorrido principal vive en páginas separadas, cada una con su propio `HTML`, `CSS` y `JSON`:

- `index.html`
- `server.html`
- `jack.html`
- `odysseia.html`
- `slimefun.html`
- `community.html`
- `bosses.html`
- `store.html`
- `rules.html`

Los estilos compartidos están en [styles/base.css](/home/jack/Proyectos/drakescraft-web/styles/base.css) y cada página suma su hoja dedicada dentro de `styles/`.

Los textos y bloques estructurales de cada página viven en `data/*.json`.

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
- endpoints de checkout y delivery para la tienda

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
