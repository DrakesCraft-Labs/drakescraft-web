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
    if (!grid || !tabs || !form) return;

    form.elements.nick?.insertAdjacentHTML("afterend", '<p class="store-bedrock-notice"><strong>¿Juegas desde Bedrock?</strong> Escribe tu nick exacto incluyendo el punto inicial. Ejemplo: <code>.JackStar</code>.</p>');

    const requestedCategory = new URLSearchParams(window.location.search).get("categoria");
    const state = { catalog: null, category: requestedCategory || "monthly", selected: new Set() };
    const productById = (id) => state.catalog.products.find((product) => product.id === id);
    const selectedProducts = () => [...state.selected].map(productById).filter(Boolean);
    const selectedMode = () => selectedProducts()[0] ? deliveryType(selectedProducts()[0]) : null;
    let productObserver = null;
    let lastFocusedElement = null;

    function revealProducts() {
        productObserver?.disconnect();
        const cards = [...grid.querySelectorAll(".store-product")];
        if (!("IntersectionObserver" in window)) {
            cards.forEach((card) => card.classList.add("is-visible"));
            return;
        }
        productObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                productObserver.unobserve(entry.target);
            });
        }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
        cards.forEach((card, index) => {
            card.style.setProperty("--reveal-delay", `${Math.min(index * 70, 280)}ms`);
            productObserver.observe(card);
        });
    }

    function renderTabs() {
        tabs.innerHTML = state.catalog.categories.map((category) => `<button class="store-tab ${category.id === state.category ? "is-active" : ""}" type="button" data-category="${storeEscape(category.id)}">${storeEscape(category.label)}</button>`).join("");
        const category = state.catalog.categories.find((entry) => entry.id === state.category);
        document.getElementById("store-category-title").textContent = category?.label || "Catálogo DrakesCraft";
        document.getElementById("store-category-description").textContent = category?.tagline || "Revisa cada beneficio antes de añadirlo al carrito.";
    }

    function renderProducts() {
        const products = state.catalog.products.filter((product) => product.category === state.category);
        const currentMode = selectedMode();
        grid.innerHTML = products.map((product) => {
            const mode = deliveryType(product);
            const selected = state.selected.has(product.id);
            const incompatible = currentMode && currentMode !== mode;
            const purchasable = mode !== "in-game" && mode !== "unavailable";
            return `<article class="store-product" data-accent="${storeEscape(product.accent || "emerald")}" data-product="${storeEscape(product.id)}">
                <div class="store-product__top"><div><span class="store-product__tag">${storeEscape(product.badge || deliveryLabel[mode])}</span><h3>${storeEscape(product.name)}</h3></div><strong class="store-product__price">${storeMoney(product.clp, product)}</strong></div>
                <p>${storeEscape(product.summary)}</p>
                <div class="store-product__delivery"><span>${deliveryLabel[mode]}</span><span>${mode === "tebex" && Number.isFinite(product.usd) ? `USD ${product.usd}` : ""}</span></div>
                <div class="store-product__actions"><button class="btn btn-secondary" type="button" data-detail="${storeEscape(product.id)}">Detalle</button><button class="btn ${selected ? "btn-primary" : "btn-secondary"}" type="button" data-select="${storeEscape(product.id)}" aria-pressed="${selected}" ${!purchasable || incompatible ? "disabled" : ""}>${mode === "unavailable" ? "No disponible" : !purchasable ? "In-game" : selected ? "Seleccionado" : incompatible ? "Otro flujo" : "Agregar"}</button></div>
            </article>`;
        }).join("");
        revealProducts();
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
            target.innerHTML = "";
            note.textContent = "Agrega un producto para ver su método de entrega.";
            total.textContent = "$0 CLP";
            return;
        }
        const mode = selectedMode();
        note.textContent = "Estos productos abren un checkout seguro de Tebex.";
        target.innerHTML = products.map((product) => `<div class="store-selection-item"><div><strong>${storeEscape(product.name)}</strong><p>${storeMoney(product.clp, product)} · ${deliveryLabel[deliveryType(product)]}</p></div><button type="button" data-remove="${storeEscape(product.id)}">Quitar</button></div>`).join("");
        total.textContent = storeMoney(products.reduce((sum, product) => sum + (Number.isFinite(product.clp) ? product.clp : 0), 0));
    }

    function renderAll() { renderTabs(); renderProducts(); renderSelection(); if (window.setupTilt) window.setupTilt(); }

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
        body.innerHTML = `<p class="eyebrow">${deliveryLabel[deliveryType(product)]}</p><h2>${storeEscape(product.name)}</h2><p>${storeEscape(product.summary)}</p><ul>${(product.includes || []).map((item) => `<li>${storeEscape(item)}</li>`).join("")}</ul>`;
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

    document.getElementById("quote-items").addEventListener("click", (event) => {
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

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const products = selectedProducts();
        if (!products.length) return window.showToast?.("Selecciona un producto antes de continuar.");
        const fields = new FormData(form);
        const payload = { nick: fields.get("nick"), contact: fields.get("contact"), notes: fields.get("notes"), website: fields.get("website"), items: products.map((product) => product.id) };
        const endpoint = "/api/store/tebex/checkout";
        const result = document.getElementById("quote-result");
        const submit = form.querySelector('button[type="submit"]');
        const originalLabel = submit?.textContent;
        try {
            if (submit) {
                submit.disabled = true;
                submit.textContent = "Preparando pago seguro...";
            }
            const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "No se pudo preparar la compra.");
            if (!data.init_point) throw new Error("Tebex no devolvió una URL de pago.");
            result.innerHTML = `<strong>Checkout listo.</strong><p>Redirigiendo a Tebex...</p><a class="btn btn-primary" href="${storeEscape(data.init_point)}">Continuar al pago</a>`;
            result.classList.remove("hidden");
            window.location.assign(data.init_point);
        } catch (error) {
            result.innerHTML = `<strong>No se pudo continuar.</strong><p>${storeEscape(error.message)}</p>`;
            result.classList.remove("hidden");
            if (submit) {
                submit.disabled = false;
                submit.textContent = originalLabel;
            }
        }
    });

    fetch("/api/store").then((response) => response.ok ? response.json() : Promise.reject()).then((catalog) => {
        state.catalog = catalog;
        if (!catalog.categories.some((category) => category.id === state.category)) {
            state.category = catalog.categories[0]?.id || "monthly";
        }
        document.getElementById("store-health").textContent = "Catálogo conectado";
        document.getElementById("store-product-count").textContent = `${catalog.summary.products} productos`;
        document.getElementById("store-updated").textContent = `Actualizado ${catalog.updatedAt}`;
        renderAll();
    }).catch(() => { grid.innerHTML = "<article class='store-product is-visible'><h3>Catálogo no disponible</h3><p>El backend no respondió. Intenta más tarde.</p></article>"; });
});
