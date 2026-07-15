# Migracion operativa a Windows

Fecha de validacion: 2026-07-15

## Resultado

La migracion de la estacion de desarrollo y administracion de DrakesCraft a Windows se completó con exito. El trabajo local, los repositorios, la compilacion de plugins y la operacion remota vuelven a estar disponibles desde Windows.

Esta migracion no mueve el hosting web a Windows. `star` sigue siendo el host Linux de produccion para el portal.

## Evidencia validada

- `https://web.drakescraft.cl/` responde HTTP 200.
- `https://web.drakescraft.cl/api/health` responde HTTP 200 con estado del servicio.
- `https://web.drakescraft.cl/api/store/pending` responde HTTP 401 sin `X-API-Key`; el endpoint de entregas no quedó expuesto.
- `star` es accesible por SSH y mantiene el contenedor `drakescraft-web` en estado `healthy`.
- El Cloudflare Tunnel de `star` está activo.

## Operacion actual

```text
Windows (desarrollo y administracion)
  -> GitHub
  -> star: Docker drakescraft-web
  -> Cloudflare Tunnel
  -> https://web.drakescraft.cl/
```

El portal no se administra mediante un servicio `systemd` llamado `drakescraft-web`; el proceso activo es el contenedor Docker. Para diagnostico, verificar primero `docker ps` en `star` antes de tocar `systemctl`.

## Verificacion recurrente

```powershell
Invoke-WebRequest https://web.drakescraft.cl/api/health
ssh jack@100.86.86.50 "docker ps --format '{{.Names}} {{.Status}}'"
```
