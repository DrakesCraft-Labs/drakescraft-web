# Tebex — lo que hay que corregir en el panel

Auditoría del 2026-08-04 contra la Headless API de Tebex, `purchases.yml` de Odysseia,
el catálogo de esta web y los `.toml` reales de ProtectionStones en el servidor.

Nada de esto se puede automatizar desde el repo: **son ediciones en el Creator Panel
de Tebex** (`drakescraft-v2.tebex.io`). Todo lo que sí vivía en código ya está corregido.

---

## 1. Landing — reemplazar (prioridad alta)

La portada de la tienda arrastra contenido de otro servidor. Lo que anuncia hoy y **no existe**:

- Rango **"NEÓN $4.99"** con `/fly`, `+1 /sethome`, `+5% en Jobs`, `/hat` y prefijo `[Neón]`.
- **"Versión 1.20.x"** — el servidor corre Purpur **1.21.11**.
- Plugins listados que no están instalados: EliteMobs, ItemsAdder, Movecraft, PlayerKits2,
  VanguardRanks, EconomyShopGUI, Minetorio, Quaptics, DracFun, EMCTech, Wildernether,
  Regions, MarriageMaster, SpiritsUnchained, AxiomPaper.
- Pestañas "Rangos Permanentes" y "Dinero del Juego" que no corresponden a las categorías reales.

**Reemplazo listo:** [`tebex-landing.html`](tebex-landing.html) en esta misma carpeta.

Aplicar en: **Tebex → Appearance → Pages → Home**, pegando el HTML completo.

El criterio del reemplazo es que Tebex sea solo la pasarela: el catálogo y el detalle de
cada paquete viven en `web.drakescraft.cl`, que se mantiene junto al servidor. Así la
landing deja de ser una segunda fuente de verdad que se desactualiza sola.

---

## 2. Paquete 7510370 «Protección 177x177» — descripción contradictoria

El texto actual dice las dos cosas a la vez:

> - Entrega rápida por staff en el servidor
> - Revisión y ayuda de ubicación incluida
>
> ### Activacion
> - Entrega automatica por Tebex al entrar al servidor.

La entrega **es automática** (Odysseia la hace por la API de ProtectionStones). Hay que
borrar las dos líneas de staff. Es el único paquete de los 25 con ese texto legacy.

---

## 3. Los 8 rangos de Titanes y dioses — no crear todavía

`purchases.yml` los tiene con IDs placeholder **9000001–9000008**, fuera del rango real de
Tebex (75xxxxx) para que ningún webhook pueda activarlos, y marcados `UNVERIFIED_PRODUCTION`.
En el catálogo web están como "Próximamente" con `purchaseAvailable: false`.

**No crearlos en Tebex hasta cerrar el rebalance**, por lo que ya está anotado en la hoja
de ruta: se especificaron como "5x" numéricamente sin balancear contra lo que entrega Zeus.

---

## Lo que se revisó y está correcto

- **Los 25 paquetes publicados entregan lo que prometen.** Cada tamaño de protección
  anunciado coincide con el `x_radius` del `.toml` real:

  | Paquete | Anuncia | `.toml` | Radio |
  |---|---|---|---|
  | Hércules | 49x49 | `drakes_vip_hercules` | 24 |
  | Hestia | 81x81 | `drakes_vip_hestia` | 40 |
  | Hermes | 113x113 | `drakes_vip_hermes` | 56 |
  | Hefesto | 177x177 | `drakes_vip_hefesto` | 88 |
  | Artemisa | 241x241 | `drakes_vip_artemisa` | 120 |
  | Afrodita | 353x353 | `drakes_vip_afrodita` | 176 |
  | Zeus | 481x481 | `drakes_vip_zeus` | 240 |
  | Coloso del Nether | 501x501 | `drakes_titan_nether_colossus` | 250 |
  | Coloso del End | 501x501 | `drakes_titan_end_colossus` | 250 |
  | Dominio de Atlas | 1001x1001 | `drakes_titan_atlas` | 500 |

- **No hay paquetes que se cobren sin entrega.** Los 25 de Tebex tienen su producto en
  `purchases.yml`, y los 26 del mapeo de la web apuntan a paquetes que existen.

- **`protection-481` (7510371)** ya no se vende en Tebex y está en `unavailableTebexProductIds`
  de `server.js`, así que el checkout lo rechaza con un mensaje claro antes de llamar a
  Tebex. Sigue en `purchases.yml` para honrar compras antiguas, que es lo correcto.

- **El checkout de la web funciona.** Verificado creando un basket real contra la Headless
  API: devuelve `pay.tebex.io` con el total correcto.

---

## Nota sobre los materiales duplicados de ProtectionStones

Cuatro pares de bloques comparten material:

| Material | Bloques |
|---|---|
| `COPPER_BLOCK` | novato (31x31) · vipthor (601x601) |
| `NETHERITE_BLOCK` | titanjapeto (1001x1001) · olympos (1501x1501) |
| `GOLD_BLOCK` | olympia (361x361) · titanhiperion (1601x1601) |
| `AMETHYST_BLOCK` | thera (961x961) · titancronos (2001x2001) |

**Ya no afecta a compras ni a kits:** ambos entregan por la API usando el alias, que es
único. Solo importa si el staff usa `/ps give` a mano, porque ese comando resuelve por
material y daría el bloque equivocado. Reasignar el `type` de un bloque con regiones ya
colocadas es riesgoso, así que va en una ventana propia.
