# Storefront DrakesCraft

## Límite público

La web pública tiene una sola tarea: mostrar productos, preparar el checkout de
Tebex y orientar el soporte de compras. La portada es la tienda; las únicas
páginas auxiliares son `support.html` y `terms.html`.

## Compatibilidad que se conserva

- `GET /api/store` sigue entregando el catálogo a la interfaz.
- `POST /api/store/tebex/checkout` mantiene el checkout Headless de Tebex.
- `POST /api/tebex/webhook` conserva validación HMAC y notificaciones de venta.
  La entrega en juego la ejecuta Tebex directamente contra
  `odysseiapurchase deliver`, que registra cada transacción de forma idempotente.
- `/resourcepack/` permanece aislado para clientes de Minecraft.
- Las rutas de traducción, estado e ingesta Odysseia siguen operativas y no se
  exponen desde la navegación pública.

## Fuente de verdad

`catalog/store-catalog.js` contiene el texto, precios y categorías visibles.
`server.js` contiene únicamente los IDs de paquetes Tebex y reglas de checkout.
Los IDs de producto son contratos: no se renombran sin migrar Tebex y Odysseia.

## Próximos cortes

1. Conciliar cada producto del catálogo con el paquete real de Tebex.
2. Añadir una campaña explícita por producto, con fecha, precio anterior y
   descuento, antes de mostrar una oferta.
3. Mantener cada comando de Tebex en el motor de compras de Odysseia; no usar
   comandos directos de LuckPerms, Essentials ni ProtectionStones.
4. Desplegar primero en staging y comprobar móvil, checkout y endpoints del
   pack antes de reemplazar el contenedor de producción.
