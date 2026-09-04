function storeEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[character]));
}

function storeMoney(value, product) {
    if (product?.coins) return `${product.coins.toLocaleString("es-CL")} ₯`;
    return Number.isFinite(value) ? `$${value.toLocaleString("es-CL")} CLP` : "No disponible";
}

function deliveryType(product) {
    if (product.purchaseAvailable === false) return "unavailable";
    if (product.category === "economy-kits") return "in-game";
    return product.tebexEnabled ? "tebex" : "unavailable";
}

function storeInlineMarkup(value) {
    return storeEscape(value)
        .replaceAll("&lt;code&gt;", "<code>")
        .replaceAll("&lt;/code&gt;", "</code>");
}

const deliveryLabel = {
    tebex: "Checkout Tebex",
    "in-game": "Se compra dentro del juego",
    unavailable: "Temporalmente no disponible"
};

document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("store-grid");
    const tabs = document.getElementById("store-tabs");
    const form = document.getElementById("quote-form");
    const cartCount = document.getElementById("store-cart-count");
    const cartJump = document.getElementById("store-cart-jump");
    const cartJumpCount = document.getElementById("store-cart-jump-count");
    const nickInput = document.getElementById("input-nick");
    const avatarImg = document.getElementById("player-avatar");
    const platformJava = document.getElementById("btn-platform-java");
    const platformBedrock = document.getElementById("btn-platform-bedrock");
    const nickHint = document.getElementById("nick-platform-hint");

    if (!grid || !tabs || !form) return;

    let selectedPlatform = "java";
    let avatarDebounceTimer = null;

    // Actualizador de Avatar y Validación de Plataforma
    function updateAvatar() {
        const rawNick = (nickInput?.value || "").trim();
        if (!rawNick || rawNick.length < 3) {
            if (avatarImg) avatarImg.src = "https://minotar.net/helm/Steve/48.png";
            return;
        }

        // Limpiar el nick para la llamada al CDN de skins (ignorar punto en bedrock para la skin)
        const skinLookup = rawNick.startsWith(".") ? rawNick.substring(1) : rawNick;
        if (avatarImg) {
            avatarImg.src = `https://minotar.net/helm/${encodeURIComponent(skinLookup)}/48.png`;
            avatarImg.onerror = () => {
                avatarImg.src = "https://minotar.net/helm/Steve/48.png";
            };
        }
    }

    function setPlatform(platform) {
        selectedPlatform = platform;
        if (platform === "bedrock") {
            platformBedrock?.classList.add("is-active");
            platformJava?.classList.remove("is-active");
            if (nickHint) {
                nickHint.innerHTML = "📱 <strong>Bedrock detectado:</strong> Si juegas en móvil/consola/Win10, asegúrate de que tu nick incluya el punto inicial (ejemplo: <code>.TuNick</code>).";
            }
            if (nickInput && nickInput.value && !nickInput.value.startsWith(".")) {
                nickInput.value = "." + nickInput.value;
            }
        } else {
            platformJava?.classList.add("is-active");
            platformBedrock?.classList.remove("is-active");
            if (nickHint) {
                nickHint.innerHTML = "☕ <strong>Java Edition:</strong> Escribe tu nick tal cual aparece en el juego (sin puntos al inicio).";
            }
            if (nickInput && nickInput.value.startsWith(".")) {
                nickInput.value = nickInput.value.substring(1);
            }
        }
        updateAvatar();
    }

    platformJava?.addEventListener("click", () => setPlatform("java"));
    platformBedrock?.addEventListener("click", () => setPlatform("bedrock"));

    nickInput?.addEventListener("input", () => {
        clearTimeout(avatarDebounceTimer);
        avatarDebounceTimer = setTimeout(updateAvatar, 400);
    });

    const requestedCategory = new URLSearchParams(window.location.search).get("categoria");
    const state = { catalog: null, category: requestedCategory || "monthly", selected: new Set() };
    const productById = (id) => state.catalog.products.find((product) => product.id === id);
    const selectedProducts = () => [...state.selected].map(productById).filter(Boolean);
    const selectedMode = () => selectedProducts()[0] ? deliveryType(selectedProducts()[0]) : null;
    let lastFocusedElement = null;

    function renderTabs() {
        if (!state.catalog?.categories) return;
        const validCategories = state.catalog.categories.filter((cat) => state.catalog.products?.some((p) => p.category === cat.id && p.purchaseAvailable !== false));
        tabs.innerHTML = validCategories.map((category) => 
            `<button class="store-tab ${category.id === state.category ? "is-active" : ""}" type="button" data-category="${storeEscape(category.id)}">${storeEscape(category.label)}</button>`
        ).join("");
        
        const category = (validCategories || state.catalog.categories).find((entry) => entry.id === state.category);
        const titleElem = document.getElementById("store-category-title");
        if (titleElem) titleElem.textContent = category?.label || "Catálogo DrakesCraft";
    }

    function renderProducts() {
        if (!state.catalog?.products) return;
        const products = state.catalog.products.filter((product) => product.category === state.category);
        const currentMode = selectedMode();
        
        grid.innerHTML = products.map((product) => {
            const mode = deliveryType(product);
            const selected = state.selected.has(product.id);
            const incompatible = currentMode && currentMode !== mode;
            const purchasable = mode !== "in-game" && mode !== "unavailable";
            return `<article class="store-product" data-accent="${storeEscape(product.accent || "emerald")}" data-product="${storeEscape(product.id)}">
                <div class="store-product__top">
                    <div>
                        <span class="store-product__tag">${storeEscape(product.badge || deliveryLabel[mode])}</span>
                        <h3>${storeEscape(product.name)}</h3>
                    </div>
                    <strong class="store-product__price">${storeMoney(product.clp, product)}</strong>
                </div>
                <p>${storeEscape(product.summary)}</p>
                <div class="store-product__delivery">
                    <span>${deliveryLabel[mode]}</span>
                    <span>${mode === "tebex" && Number.isFinite(product.usd) ? `USD $${product.usd}` : ""}</span>
                </div>
                <div class="store-product__actions">
                    <button class="btn btn-secondary" type="button" data-detail="${storeEscape(product.id)}">Ver Detalle</button>
                    <button class="btn ${selected ? "btn-primary" : "btn-secondary"}" type="button" data-select="${storeEscape(product.id)}" aria-pressed="${selected}" ${!purchasable || incompatible ? "disabled" : ""}>
                        ${mode === "unavailable" ? "No disponible" : !purchasable ? "In-game" : selected ? "✓ En Carrito" : incompatible ? "Otro flujo" : "+ Agregar"}
                    </button>
                </div>
            </article>`;
        }).join("");
    }

    function renderSelection() {
        const target = document.getElementById("quote-items");
        const note = document.getElementById("store-selection-note");
        const total = document.getElementById("quote-total");
        const products = selectedProducts();
        const itemCount = products.length;

        if (cartCount) cartCount.textContent = String(itemCount);
        if (cartJumpCount) cartJumpCount.textContent = String(itemCount);
        cartJump?.classList.toggle("hidden", itemCount === 0);

        if (!products.length) {
            if (target) target.innerHTML = "";
            if (note) {
                note.textContent = "Selecciona un producto del catálogo para continuar.";
                note.classList.remove("hidden");
            }
            if (total) total.textContent = "$0 CLP";
            return;
        }

        if (note) note.classList.add("hidden");
        if (target) {
            target.innerHTML = products.map((product) => 
                `<div class="store-selection-item">
                    <div>
                        <strong>${storeEscape(product.name)}</strong>
                        <p>${storeMoney(product.clp, product)} · ${deliveryLabel[deliveryType(product)]}</p>
                    </div>
                    <button type="button" data-remove="${storeEscape(product.id)}">Quitar</button>
                </div>`
            ).join("");
        }

        if (total) {
            total.textContent = storeMoney(products.reduce((sum, product) => sum + (Number.isFinite(product.clp) ? product.clp : 0), 0));
        }
    }

    function renderAll() {
        renderTabs();
        renderProducts();
        renderSelection();
    }

    function closeDetail() {
        const modal = document.getElementById("store-modal");
        if (!modal || modal.classList.contains("hidden")) return;
        modal.classList.add("hidden");
        lastFocusedElement?.focus?.();
    }

    function openDetail(product) {
        const modal = document.getElementById("store-modal");
        const body = document.getElementById("store-modal-body");
        if (!modal || !body || !product) return;
        lastFocusedElement = document.activeElement;
        body.innerHTML = `
            <span class="store-product__tag">${deliveryLabel[deliveryType(product)]}</span>
            <h2>${storeEscape(product.name)}</h2>
            <p>${storeEscape(product.summary)}</p>
            <ul>${(product.includes || []).map((item) => `<li>${storeInlineMarkup(item)}</li>`).join("")}</ul>
        `;
        modal.classList.remove("hidden");
        document.getElementById("store-modal-close")?.focus();
    }

    tabs.addEventListener("click", (event) => {
        const button = event.target.closest("[data-category]");
        if (!button) return;
        state.category = button.dataset.category;
        const url = new URL(window.location.href);
        url.searchParams.set("categoria", state.category);
        window.history.replaceState({}, "", url);
        renderAll();
    });

    grid.addEventListener("click", (event) => {
        const detail = event.target.closest("[data-detail]");
        if (detail) return openDetail(productById(detail.dataset.detail));
        const select = event.target.closest("[data-select]");
        if (!select || select.disabled) return;
        const id = select.dataset.select;
        state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id);
        renderAll();
    });

    document.getElementById("quote-items")?.addEventListener("click", (event) => {
        const remove = event.target.closest("[data-remove]");
        if (!remove) return;
        state.selected.delete(remove.dataset.remove);
        renderAll();
    });

    const modal = document.getElementById("store-modal");
    document.getElementById("store-modal-close")?.addEventListener("click", closeDetail);
    modal?.addEventListener("click", (event) => { if (event.target === modal) closeDetail(); });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeDetail();
    });

    cartJump?.addEventListener("click", () => {
        document.getElementById("carrito")?.scrollIntoView({ behavior: "smooth" });
    });

    // Carga inicial del Catálogo desde la API backend
    async function loadCatalog() {
        const healthBadge = document.getElementById("store-health");
        const countBadge = document.getElementById("store-product-count");
        try {
            const response = await fetch("/api/store");
            if (!response.ok) throw new Error("No se pudo cargar el catálogo.");
            state.catalog = await response.json();
            if (healthBadge) healthBadge.textContent = "Catálogo Online";
            if (countBadge) countBadge.textContent = `${state.catalog.products?.length || 0} productos`;
            renderAll();
        } catch (error) {
            if (healthBadge) healthBadge.textContent = "Error de conexión";
            console.error("Fallo cargando catálogo de la tienda:", error);
        }
    }

    // Manejador de Submit hacia Tebex Checkout (Backend API intacta)
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const products = selectedProducts();
        if (!products.length) {
            alert("Por favor agrega al menos un producto al carrito antes de continuar.");
            return;
        }

        const fields = new FormData(form);
        const nickVal = (fields.get("nick") || "").trim();
        if (!nickVal) {
            alert("Por favor escribe tu nick exacto de Minecraft.");
            return;
        }

        const payload = {
            nick: nickVal,
            contact: fields.get("contact") || "",
            notes: fields.get("notes") || "",
            website: fields.get("website") || "",
            items: products.map((product) => product.id)
        };

        const endpoint = "/api/store/tebex/checkout";
        const result = document.getElementById("quote-result");
        const submit = document.getElementById("btn-submit-checkout");

        try {
            if (submit) {
                submit.disabled = true;
                submit.innerHTML = '<span>⏳ Conectando con Tebex...</span>';
            }
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "No se pudo preparar la orden en Tebex.");
            if (!data.init_point) throw new Error("Tebex no devolvió una URL de pago válida.");

            if (result) {
                result.innerHTML = `<strong>✅ Orden creada con éxito.</strong><p>Redirigiendo al checkout seguro de Tebex...</p><a class="btn btn-primary" href="${storeEscape(data.init_point)}" style="display:inline-block;margin-top:0.5rem;">Ir al Pago Seguro</a>`;
                result.classList.remove("hidden");
            }
            window.location.assign(data.init_point);
        } catch (error) {
            if (result) {
                result.innerHTML = `<strong>⚠️ Error al procesar:</strong><p>${storeEscape(error.message)}</p>`;
                result.classList.remove("hidden");
            }
            if (submit) {
                submit.disabled = false;
                submit.innerHTML = '<span class="btn-icon">🔒</span><span>Ir al Pago Seguro en Tebex</span>';
            }
        }
    });

    loadCatalog();
});
