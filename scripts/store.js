function storeEscapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function storeMoney(value, product) {
    if (product?.coins) return `${product.coins.toLocaleString("es-CL")} ₯`;
    return Number.isFinite(value) ? `$${value.toLocaleString("es-CL")} CLP` : "Cotización";
}

function storeToast(message) {
    if (window.showToast) {
        window.showToast(message);
        return;
    }
    console.log(message);
}

document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("store-grid");
    const tabs = document.getElementById("store-tabs");
    const quoteItems = document.getElementById("quote-items");
    const quoteTotal = document.getElementById("quote-total");
    const quoteForm = document.getElementById("quote-form");
    if (!grid || !tabs || !quoteItems || !quoteTotal || !quoteForm) return;

    const modal = document.getElementById("store-modal");
    const modalBody = document.getElementById("store-modal-body");
    const modalClose = document.getElementById("store-modal-close");

    const state = {
        catalog: null,
        category: "monthly",
        selected: new Set()
    };

    const productById = (id) => state.catalog.products.find((product) => product.id === id);

    const renderTabs = () => {
        tabs.innerHTML = state.catalog.categories.map((category) => `
            <button class="btn ${state.category === category.id ? "btn-primary" : "btn-secondary"}" type="button" data-category="${category.id}">
                ${storeEscapeHtml(category.label)}
            </button>
        `).join("");
    };

    const renderProducts = () => {
        const products = state.catalog.products.filter((product) => product.category === state.category);
        grid.innerHTML = products.map((product) => {
            const selected = state.selected.has(product.id);
            const disabled = product.category === "economy-kits";
            return `
                <article class="store-card tilt-card">
                    <h3>${storeEscapeHtml(product.name)}</h3>
                    <p>${storeEscapeHtml(product.summary)}</p>
                    <p style="margin-top:0.8rem;color:var(--page-accent);font-weight:700;">${storeMoney(product.clp, product)}${Number.isFinite(product.usd) ? ` · USD ${product.usd}` : ""}</p>
                    <div class="hero__actions" style="margin-top:1rem;">
                        <button type="button" class="btn btn-secondary" data-detail="${product.id}">Ver detalle</button>
                        <button type="button" class="btn ${selected ? "btn-primary" : "btn-secondary"}" data-add="${product.id}" ${disabled ? "disabled" : ""}>
                            ${disabled ? "In-game" : (selected ? "Seleccionado" : "Agregar")}
                        </button>
                    </div>
                </article>
            `;
        }).join("");
    };

    const renderQuote = () => {
        const selected = Array.from(state.selected).map(productById).filter(Boolean);
        if (!selected.length) {
            quoteItems.innerHTML = "<p>No hay productos seleccionados todavía.</p>";
            quoteTotal.textContent = "$0 CLP";
            return;
        }
        const total = selected.reduce((sum, product) => sum + (Number.isFinite(product.clp) ? product.clp : 0), 0);
        quoteItems.innerHTML = selected.map((product) => `
            <div style="display:flex;justify-content:space-between;gap:0.75rem;padding:0.7rem 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                <div>
                    <strong>${storeEscapeHtml(product.name)}</strong>
                    <p style="margin-top:0.3rem;">${storeMoney(product.clp, product)}</p>
                </div>
                <button class="btn btn-secondary" type="button" data-remove="${product.id}">Quitar</button>
            </div>
        `).join("");
        quoteTotal.textContent = storeMoney(total);
    };

    const openModal = (product) => {
        if (!modal || !modalBody) return;
        modalBody.innerHTML = `
            <h3 style="margin-top:0;">${storeEscapeHtml(product.name)}</h3>
            <p>${storeEscapeHtml(product.summary)}</p>
            <ul style="margin-top:1rem;padding-left:1rem;">
                ${(product.includes || []).map((item) => `<li>${storeEscapeHtml(item)}</li>`).join("")}
            </ul>
        `;
        modal.classList.remove("hidden");
    };

    const renderAll = () => {
        renderTabs();
        renderProducts();
        renderQuote();
        if (window.setupTilt) window.setupTilt();
    };

    tabs.addEventListener("click", (event) => {
        const button = event.target.closest("[data-category]");
        if (!button) return;
        state.category = button.dataset.category;
        renderAll();
    });

    grid.addEventListener("click", (event) => {
        const detailButton = event.target.closest("[data-detail]");
        if (detailButton) {
            openModal(productById(detailButton.dataset.detail));
            return;
        }
        const addButton = event.target.closest("[data-add]");
        if (!addButton) return;
        const id = addButton.dataset.add;
        if (state.selected.has(id)) state.selected.delete(id);
        else state.selected.add(id);
        renderAll();
    });

    quoteItems.addEventListener("click", (event) => {
        const removeButton = event.target.closest("[data-remove]");
        if (!removeButton) return;
        state.selected.delete(removeButton.dataset.remove);
        renderAll();
    });

    if (modalClose && modal) {
        modalClose.addEventListener("click", () => modal.classList.add("hidden"));
        modal.addEventListener("click", (event) => {
            if (event.target === modal) modal.classList.add("hidden");
        });
    }

    quoteForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!state.selected.size) {
            storeToast("Selecciona al menos un producto.");
            return;
        }

        const formData = new FormData(quoteForm);
        const payload = {
            nick: formData.get("nick"),
            contact: formData.get("contact"),
            notes: formData.get("notes"),
            website: formData.get("website"),
            items: Array.from(state.selected)
        };

        const selectedProducts = state.catalog.products.filter((product) => payload.items.includes(product.id));
        const allTebex = selectedProducts.length > 0 && selectedProducts.every((product) => product.tebexEnabled);
        const result = document.getElementById("quote-result");

        try {
            if (allTebex) {
                const response = await fetch("/api/store/tebex/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "tebex failed");
                result.innerHTML = `
                    <strong>Checkout listo: ${storeEscapeHtml(data.quoteId)}</strong>
                    <p style="margin-top:0.6rem;">Tu compra está lista para pagar en Tebex.</p>
                    <a class="btn btn-primary" href="${storeEscapeHtml(data.init_point)}" target="_blank" rel="noopener" style="margin-top:0.9rem;">Ir al checkout</a>
                `;
                result.classList.remove("hidden");
                storeToast("Checkout Tebex generado.");
                return;
            }

            const response = await fetch("/api/store/quote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "quote failed");
            result.innerHTML = `
                <strong>Solicitud generada: ${storeEscapeHtml(data.quoteId)}</strong>
                <p style="margin-top:0.6rem;">Si hace falta respaldo manual, usa este texto en Discord.</p>
                <textarea rows="7" readonly style="width:100%;margin-top:0.9rem;background:#0a1020;color:#f4f6fb;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:0.8rem;">${storeEscapeHtml(data.ticketMessage)}</textarea>
            `;
            result.classList.remove("hidden");
            storeToast("Solicitud manual generada.");
        } catch (error) {
            result.innerHTML = "<strong>No se pudo generar el checkout.</strong><p style='margin-top:0.6rem;'>Prueba de nuevo o abre ticket en Discord.</p>";
            result.classList.remove("hidden");
            storeToast(error.message || "Error generando compra.");
        }
    });

    fetch("/api/store")
        .then((response) => response.json())
        .then((catalog) => {
            state.catalog = catalog;
            document.getElementById("store-health").textContent = "Catálogo sincronizado";
            document.getElementById("store-product-count").textContent = String(catalog.summary.products);
            document.getElementById("store-min-price").textContent = storeMoney(catalog.summary.minPrice);
            document.getElementById("store-max-price").textContent = storeMoney(catalog.summary.maxPrice);
            document.getElementById("store-updated").textContent = `Actualizado ${catalog.updatedAt}`;
            renderAll();
        })
        .catch(() => {
            grid.innerHTML = "<article class='store-card'><h3>Catálogo no disponible</h3><p>El backend de tienda no respondió.</p></article>";
            document.getElementById("store-health").textContent = "Sin conexión";
        });
});
