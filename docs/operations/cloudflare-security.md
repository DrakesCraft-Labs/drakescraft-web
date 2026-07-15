# Cloudflare - proteccion del portal

La tienda usa solamente Tebex. Tebex ejecuta la entrega en Minecraft y Odysseia
procesa los comandos; `drakescraft-web` no entrega beneficios ni acepta pagos
de Mercado Pago o PayPal.

## Controles aplicados en la aplicacion

- `POST /api/store/tebex/checkout` acepta hasta cinco intentos por IP cada diez
  minutos. La IP viene de `CF-Connecting-IP` cuando Cloudflare la proporciona.
- Las rutas de pago retiradas responden `410 Gone` y no cargan SDKs ni
  credenciales de Mercado Pago/PayPal.
- El webhook de Tebex queda fuera de ese limite y exige su firma HMAC.
- Las respuestas incluyen cabeceras anti-frame, anti-MIME-sniffing y una
  politica de permisos restrictiva.

## Reglas que deben estar activas en Cloudflare

Estas reglas se crean en la zona que sirve `web.drakescraft.cl`, en este orden.
No aplicar challenges al webhook de Tebex.

1. En **Security > Settings**, activar **Bot Fight Mode** si el plan lo ofrece.
   Si la zona usa Super Bot Fight Mode, dejar los controles administrados en
   modo challenge para automatizacion detectada.
2. En **Security > WAF > Rate limiting rules**, crear `Checkout Tebex`:
   - Expresion: `http.request.uri.path eq "/api/store/tebex/checkout" and http.request.method eq "POST"`
   - Caracteristica: IP de visitante
   - Umbral: 5 solicitudes por 10 minutos
   - Accion: bloquear durante 10 minutos
3. En **Security > WAF > Custom rules**, crear `Challenge trafico de alto riesgo`:
   - Expresion: `cf.threat_score gt 14 and http.request.uri.path ne "/api/tebex/webhook"`
   - Accion: Managed Challenge
4. Confirmar que `/api/tebex/webhook` no coincida con ninguna regla de
   challenge o bloqueo. Su autenticacion valida es la firma `X-Signature` de
   Tebex, no un desafio de navegador.

Cloudflare debe seguir usando el Tunnel como unico origen publicado. No abrir
el puerto interno del contenedor al exterior.
