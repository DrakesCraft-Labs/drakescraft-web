function storeEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[character]));
}

function storeMoney(value, product) {
    if (product?.coins) return `${product.coins.toLocaleString("es-CL")} ₯`;
    return Number.isFinite(value) ? `$${value.toLocaleString("es-CL")} CLP` : "Cotización";
}

function deliveryType(product) {
    if (product.category === "economy-kits") return "in-game";
    return product.tebexEnabled ? "tebex" : "manual";
}

const deliveryLabel = {
    tebex: "Checkout Tebex",
    manual: "Revisión manual",
    "in-game": "Se compra dentro del juego"
};

document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("store-grid");
    const tabs = document.getElementById("store-tabs");
    const form = document.getElementById("quote-form");
    if (!grid || !tabs || !form) return;

    const state = { catalog: null, category: "monthly", selected: new Set() };
    const productById = (id) => state.catalog.products.find((product) => product.id === id);
    const selectedProducts = () => [...state.selected].map(productById).filter(Boolean);
    const selectedMode = () => selectedProducts()[0] ? deliveryType(selectedProducts()[0]) : null;

    function renderTabs() {
        tabs.innerHTML = state.catalog.categories.map((category) => `<button class="store-tab ${category.id === state.category ? "is-active" : ""}" type="button" data-category="${storeEscape(category.id)}">${storeEscape(category.label)}</button>`).join("");
    }

    function renderProducts() {
        const products = state.catalog.products.filter((product) => product.category === state.category);
        const currentMode = selectedMode();
        grid.innerHTML = products.map((product) => {
            const mode = deliveryType(product);
            const selected = state.selected.has(product.id);
            const incompatible = currentMode && currentMode !== mode;
            const purchasable = mode !== "in-game";
            return `<article class="store-product">
                <div class="store-product__top"><div><span class="store-product__tag">${storeEscape(product.badge || deliveryLabel[mode])}</span><h3>${storeEscape(product.name)}</h3></div><strong class="store-product__price">${storeMoney(product.clp, product)}</strong></div>
                <p>${storeEscape(product.summary)}</p>
                <div class="store-product__delivery"><span>${deliveryLabel[mode]}</span><span>${mode === "tebex" && Number.isFinite(product.usd) ? `USD ${product.usd}` : ""}</span></div>
                <div class="store-product__actions"><button class="btn btn-secondary" type="button" data-detail="${storeEscape(product.id)}">Detalle</button><button class="btn ${selected ? "btn-primary" : "btn-secondary"}" type="button" data-select="${storeEscape(product.id)}" ${!purchasable || incompatible ? "disabled" : ""}>${!purchasable ? "In-game" : selected ? "Seleccionado" : incompatible ? "Otro flujo" : "Agregar"}</button></div>
            </article>`;
        }).join("");
    }

    function renderSelection() {
        const target = document.getElementById("quote-items");
        const note = document.getElementById("store-selection-note");
        const total = document.getElementById("quote-total");
        const products = selectedProducts();
        if (!products.length) {
            target.innerHTML = "";
            note.textContent = "Agrega un producto para ver su método de entrega.";
            total.textContent = "$0 CLP";
            return;
        }
        const mode = selectedMode();
        note.textContent = mode === "tebex" ? "Estos productos abren un checkout seguro de Tebex." : "Estos productos generan una solicitud para coordinar con el staff.";
        target.innerHTML = products.map((product) => `<div class="store-selection-item"><div><strong>${storeEscape(product.name)}</strong><p>${storeMoney(product.clp, product)} · ${deliveryLabel[deliveryType(product)]}</p></div><button type="button" data-remove="${storeEscape(product.id)}">Quitar</button></div>`).join("");
        total.textContent = storeMoney(products.reduce((sum, product) => sum + (Number.isFinite(product.clp) ? product.clp : 0), 0));
    }

    function renderAll() { renderTabs(); renderProducts(); renderSelection(); if (window.setupTilt) window.setupTilt(); }

    function openDetail(product) {
        const modal = document.getElementById("store-modal");
        const body = document.getElementById("store-modal-body");
        if (!modal || !body || !product) return;
        body.innerHTML = `<p class="eyebrow">${deliveryLabel[deliveryType(product)]}</p><h2>${storeEscape(product.name)}</h2><p>${storeEscape(product.summary)}</p><ul>${(product.includes || []).map((item) => `<li>${storeEscape(item)}</li>`).join("")}</ul>`;
        modal.classList.remove("hidden");
    }

    tabs.addEventListener("click", (event) => {
        const button = event.target.closest("[data-category]");
        if (!button) return;
        state.category = button.dataset.category;
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
    document.getElementById("store-modal-close")?.addEventListener("click", () => modal?.classList.add("hidden"));
    modal?.addEventListener("click", (event) => { if (event.target === modal) modal.classList.add("hidden"); });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const products = selectedProducts();
        if (!products.length) return window.showToast?.("Selecciona un producto antes de continuar.");
        const fields = new FormData(form);
        const payload = { nick: fields.get("nick"), contact: fields.get("contact"), notes: fields.get("notes"), website: fields.get("website"), items: products.map((product) => product.id) };
        const endpoint = selectedMode() === "tebex" ? "/api/store/tebex/checkout" : "/api/store/quote";
        const result = document.getElementById("quote-result");
        try {
            const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "No se pudo preparar la compra.");
            result.innerHTML = endpoint.includes("tebex") ? `<strong>Checkout listo.</strong><p>Serás dirigido a Tebex para completar el pago.</p><a class="btn btn-primary" href="${storeEscape(data.init_point)}" target="_blank" rel="noopener">Abrir checkout</a>` : `<strong>Solicitud registrada.</strong><p>La coordinación seguirá por Discord.</p><textarea rows="6" readonly>${storeEscape(data.ticketMessage)}</textarea>`;
            result.classList.remove("hidden");
            if (endpoint.includes("tebex")) window.open(data.init_point, "_blank", "noopener");
        } catch (error) {
            result.innerHTML = `<strong>No se pudo continuar.</strong><p>${storeEscape(error.message)}</p>`;
            result.classList.remove("hidden");
        }
    });

    fetch("/api/store").then((response) => response.ok ? response.json() : Promise.reject()).then((catalog) => {
        state.catalog = catalog;
        document.getElementById("store-health").textContent = "Catálogo conectado";
        document.getElementById("store-product-count").textContent = `${catalog.summary.products} productos`;
        document.getElementById("store-updated").textContent = `Actualizado ${catalog.updatedAt}`;
        renderAll();
    }).catch(() => { grid.innerHTML = "<article class='store-product'><h3>Catálogo no disponible</h3><p>El backend no respondió. Intenta más tarde.</p></article>"; });
});
