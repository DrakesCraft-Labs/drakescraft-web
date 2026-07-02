# DrakesCraft — Sitio Web Oficial

<p align="center">
  <img src="assets/hero.svg" alt="DrakesCraft Hero Banner" width="800">
</p>

Sitio web oficial y portal de comunidad para **DrakesCraft**, un servidor de Minecraft Survival de alta gama con temática de **Odisea Cósmica**, integración profunda de **Slimefun** y soporte multiplataforma completo (Java y Bedrock).

> [!NOTE]
> El sitio oficial se ejecuta en el servidor `star` y está disponible en
> [https://web.drakescraft.cl](https://web.drakescraft.cl).

## Despliegue

El portal combina un frontend estático con un backend ligero basado en Fastify:

```text
Repositorio GitHub -> star -> Fastify en 127.0.0.1:8081 -> Cloudflare Tunnel -> web.drakescraft.cl
```

Cloudflare se utiliza únicamente como túnel y proxy público. El sitio no se
despliega mediante Cloudflare Pages.

El backend entrega health checks, contador persistente y datos de Discord con
caché para evitar depender directamente de servicios externos desde el navegador.

### Variables privadas de pagos

La configuración productiva vive únicamente en el `.env` del servidor:

```text
MP_ACCESS_TOKEN
MP_WEBHOOK_SECRET
PAYPAL_MODE
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
PAYPAL_WEBHOOK_ID
STORE_API_KEY
DISCORD_PAYMENTS_WEBHOOK
DISCORD_STORE_WEBHOOK
ADMIN_TOKEN
```

No se deben guardar tokens, claves API ni URLs completas de webhooks en Git.

---

## 🌌 Características de DrakesCraft

DrakesCraft no es un servidor Survival ordinario; ofrece una experiencia RPG y técnica avanzada que incluye:

*   **Lore de la Odisea Cósmica:** Una narrativa inmersiva donde los jugadores exploran mundos, facciones galácticas y misterios ancestrales.
*   **Integración de Slimefun 4:** Convierte tu partida de Minecraft en una experiencia tecnológica industrial similar a mods (mecanismos, reactores, magia y aleaciones), todo sin instalar nada en tu cliente.
*   **Crossplay Absoluto:** Conexión simultánea y optimizada tanto para jugadores de Java Edition (PC) como Bedrock Edition (Consolas, Móviles y Windows 10/11).
*   **Economía Balanceada y Tienda:** Sistema de comercio justo, reclamos de terrenos (`claims`) y rangos cosméticos de apoyo.

---

## 🗺️ Mapa de Navegación del Usuario

A continuación se detalla el flujo de navegación que experimenta un usuario al ingresar a la plataforma web de DrakesCraft:

```mermaid
graph TD
    classDef default fill:#0f0728,stroke:#a855f7,stroke-width:2px,color:#fff;
    classDef gold fill:#1e1405,stroke:#d4af37,stroke-width:2px,color:#ffeaa7;

    Start((Jugador Nuevo)) --> Landing[Inicio / Landing Page]
    
    Landing --> ActionCopy[Copiar IP: Java / Bedrock]
    Landing --> ActionLore[Explorar Lore Odisea]
    Landing --> ActionRules[Reglamento / rules.html]
    Landing --> ActionStore[Tienda / store.html]

    ActionCopy --> JoinServer[Conexión al Servidor de Minecraft]
    ActionLore --> JoinServer
    ActionRules --> PlaySafe[Jugar Cumpliendo Reglas]
    ActionStore --> Support[Apoyar al Servidor VIP]

    class Start,JoinServer,PlaySafe,Support gold;
```

---

## 📂 Contenido del Repositorio

El sitio web está construido bajo estándares web modernos y limpios usando HTML5 y CSS3 nativo (Vanilla CSS), asegurando una carga ultra rápida y excelente SEO:

| Archivo / Carpeta | Descripción |
| :--- | :--- |
| [index.html](file:///C:/Users/pablo/Documentos/GitHub/drakescraft-web/index.html) | Página principal con lore, características, FAQ de conexión y acordeones interactivos. |
| [rules.html](file:///C:/Users/pablo/Documentos/GitHub/drakescraft-web/rules.html) | Reglamento oficial de conducta, reglas de convivencia del servidor y términos. |
| [store.html](file:///C:/Users/pablo/Documentos/GitHub/drakescraft-web/store.html) | Catálogo de rangos VIP, llaves de cofres y métodos de donación soportados. |
| [styles.css](file:///C:/Users/pablo/Documentos/GitHub/drakescraft-web/styles.css) | Hoja de estilos unificada con paleta de color oscura, morada y dorada. |
| [script.js](file:///C:/Users/pablo/Documentos/GitHub/drakescraft-web/script.js) | Lógica interactiva: copiado automático de IP al portapapeles, filtros de tienda y FAQ. |
| [assets/](file:///C:/Users/pablo/Documentos/GitHub/drakescraft-web/assets/) | Logotipos y recursos vectoriales interactivos (`hero.svg`). |

---

## 💻 Desarrollo y Vista Local

El sitio es estático, por lo que no requiere ningún proceso de compilación previo. Puedes visualizarlo directamente abriendo el archivo `index.html` en tu navegador, o sirviéndolo localmente para probar comportamientos asíncronos y copiado:

```bash
# Servir usando Node.js (serve)
npx --yes serve .
```

---

## 👥 Comunidad y Enlaces

*   **Sitio Oficial:** [https://web.drakescraft.cl](https://web.drakescraft.cl)
*   **Servidor de Discord:** [discord.gg/rR7FbfCt9Y](https://discord.gg/rR7FbfCt9Y)

---

*Minecraft es una marca registrada de Mojang Synergies AB. Este sitio y servidor no están afiliados ni avalados por Mojang.*
