function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function showToast(message) {
    let toast = document.querySelector(".toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function copyText(value) {
    navigator.clipboard.writeText(value).then(() => {
        showToast(`Copiado: ${value}`);
    }).catch(() => {
        showToast("No se pudo copiar automáticamente.");
    });
}

function setupNav() {
    const toggle = document.getElementById("nav-toggle");
    const menu = document.getElementById("nav-menu");
    if (!toggle || !menu) return;

    toggle.addEventListener("click", () => {
        const open = menu.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
    });
}

function normalizeNavigation() {
    const menu = document.getElementById("nav-menu");
    if (!menu || menu.dataset.normalized === "true") return;

    const current = location.pathname.split("/").pop() || "index.html";
    const routes = [
        ["index.html", "Inicio"], ["server.html", "Servidor"], ["odysseia.html", "Odysseia"],
        ["dioses.html", "Dioses"], ["slimefun.html", "Slimefun"], ["bosses.html", "Bosses"],
        ["store.html", "Tienda"], ["community.html", "Comunidad"]
    ];
    menu.innerHTML = routes.map(([href, label]) => `<li><a${href === current ? ' class="active"' : ""} href="${href}">${label}</a></li>`).join("")
        + '<li><a class="nav-discord" href="https://discord.gg/rR7FbfCt9Y" target="_blank" rel="noopener">Discord</a></li>';
    menu.dataset.normalized = "true";
}

function setupProgress() {
    const bar = document.getElementById("scroll-progress");
    if (!bar) return;

    const update = () => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
        bar.style.width = `${Math.max(0, Math.min(100, ratio))}%`;
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
}

function setupTilt() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.querySelectorAll(".tilt-card").forEach((card) => {
        card.addEventListener("mousemove", (event) => {
            const rect = card.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width;
            const py = (event.clientY - rect.top) / rect.height;
            card.style.transform = `rotateX(${(0.5 - py) * 6}deg) rotateY(${(px - 0.5) * 8}deg) translateY(-2px)`;
        });
        card.addEventListener("mouseleave", () => {
            card.style.transform = "";
        });
    });
}

window.setupTilt = setupTilt;
window.showToast = showToast;

function renderMetrics(items) {
    const target = document.getElementById("manifest-metrics");
    if (!target || !items?.length) return;
    target.innerHTML = items.map((item) => `
        <article class="metric-card tilt-card${String(item.value || '').length > 10 ? ' metric-card--compact' : ''}">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </article>
    `).join("");
}

function renderPanelGrid(targetId, items) {
    const target = document.getElementById(targetId);
    if (!target || !items?.length) return;
    target.innerHTML = items.map((item) => `
        <article class="panel-card tilt-card">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.text)}</p>
        </article>
    `).join("");
}

function renderFacts(items) {
    const target = document.getElementById("manifest-facts");
    if (!target || !items?.length) return;
    target.innerHTML = items.map((item) => `
        <article class="fact-card tilt-card">
            <h3>${escapeHtml(item.title)}</h3>
            <ul>
                ${(item.items || []).map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}
            </ul>
        </article>
    `).join("");
}

function renderRules(items) {
    const target = document.getElementById("rules-grid");
    if (!target || !items?.length) return;
    target.innerHTML = items.map((item, index) => `
        <article class="rule-card tilt-card">
            <h3>${index + 1}. ${escapeHtml(item.title)}</h3>
            <ul>
                ${(item.items || []).map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}
            </ul>
            <p style="margin-top:0.9rem;color:#ffd4ae;"><strong>Sanción:</strong> ${escapeHtml(item.sanction)}</p>
        </article>
    `).join("");
}

function renderCta(cta) {
    const target = document.getElementById("manifest-cta");
    if (!target || !cta) return;
    target.innerHTML = `
        <div>
            <h2>${escapeHtml(cta.title)}</h2>
            <p>${escapeHtml(cta.text)}</p>
        </div>
        <div class="cta-actions">
            ${cta.primary ? `<a class="btn btn-primary" href="${escapeHtml(cta.primary.href)}">${escapeHtml(cta.primary.label)}</a>` : ""}
            ${cta.secondary ? `<a class="btn btn-secondary" href="${escapeHtml(cta.secondary.href)}">${escapeHtml(cta.secondary.label)}</a>` : ""}
        </div>
    `;
}

function renderSequence(prev, next) {
    const target = document.getElementById("page-sequence");
    if (!target) return;
    if (!prev && !next) {
        target.classList.add("hidden");
        return;
    }
    target.innerHTML = `
        ${prev ? `<a class="sequence-link" href="${escapeHtml(prev.href)}"><small>Anterior</small><strong>${escapeHtml(prev.label)}</strong></a>` : '<span></span>'}
        ${next ? `<a class="sequence-link" href="${escapeHtml(next.href)}" style="text-align:right;"><small>Siguiente</small><strong>${escapeHtml(next.label)}</strong></a>` : '<span></span>'}
    `;
}

function renderEditorialExperience(page, manifest) {
    // These pages provide their own composition. The manifest fills their content
    // but must never flatten their distinct hero and navigation hierarchy.
    if (!new Set([]).has(page)) return false;

    const hero = document.querySelector(".hero");
    const main = document.querySelector("main");
    if (!hero || !main) return false;

    hero.className = "brief-hero";
    hero.innerHTML = `<div class="container brief-hero__inner">
        <p class="eyebrow">${escapeHtml(manifest.eyebrow || "DrakesCraft")}</p>
        <h1>${escapeHtml(manifest.title || "DrakesCraft")}</h1>
        <p class="brief-hero__tagline">${escapeHtml(manifest.tagline || "")}</p>
        <p class="brief-hero__intro">${escapeHtml(manifest.intro || "")}</p>
        <div class="brief-hero__actions" id="brief-hero-actions"></div>
    </div>`;

    main.className = "editorial-main";
    main.innerHTML = `<section class="editorial-section"><div class="container">
        <div class="editorial-heading"><p class="eyebrow">Lo esencial</p><h2>${page === "rules" ? "Un marco claro para jugar" : "Qué resuelve esta parte del proyecto"}</h2></div>
        <div class="editorial-grid" id="editorial-pillars"></div>
    </div></section>
    ${page === "community" ? `<section class="editorial-section editorial-section--tint"><div class="container"><div class="editorial-heading"><p class="eyebrow">Actividad pública</p><h2>Discord</h2><p>Canales y presencia disponibles en este momento.</p></div><div class="live-grid" id="discord-live"></div></div></section>` : ""}
    ${page === "rules" ? `<section class="editorial-section"><div class="container"><div class="editorial-heading"><p class="eyebrow">Reglamento</p><h2>Lo que protege el servidor</h2></div><div class="editorial-grid editorial-grid--rules" id="rules-grid"></div></div></section>` : ""}
    <section class="editorial-section editorial-section--tint"><div class="container"><div class="facts-grid editorial-facts" id="editorial-facts"></div></div></section>
    <section class="editorial-section"><div class="container"><div class="cta-banner" id="editorial-cta"></div></div></section>`;

    const actionTarget = document.getElementById("brief-hero-actions");
    if (actionTarget && manifest.cta) {
        actionTarget.innerHTML = `${manifest.cta.primary ? `<a class="btn btn-primary" href="${escapeHtml(manifest.cta.primary.href)}">${escapeHtml(manifest.cta.primary.label)}</a>` : ""}${manifest.cta.secondary ? `<a class="btn btn-secondary" href="${escapeHtml(manifest.cta.secondary.href)}">${escapeHtml(manifest.cta.secondary.label)}</a>` : ""}`;
    }
    renderPanelGrid("editorial-pillars", manifest.pillars);
    renderFactsForTarget("editorial-facts", manifest.facts);
    renderRules(manifest.rules);
    renderCtaForTarget("editorial-cta", manifest.cta);
    return true;
}

function renderFactsForTarget(targetId, items) {
    const target = document.getElementById(targetId);
    if (!target || !items?.length) return;
    target.innerHTML = items.map((item) => `<article class="fact-card"><h3>${escapeHtml(item.title)}</h3><ul>${(item.items || []).map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul></article>`).join("");
}

function renderCtaForTarget(targetId, cta) {
    const target = document.getElementById(targetId);
    if (!target || !cta) return;
    target.innerHTML = `<div><h2>${escapeHtml(cta.title)}</h2><p>${escapeHtml(cta.text)}</p></div><div class="cta-actions">${cta.primary ? `<a class="btn btn-primary" href="${escapeHtml(cta.primary.href)}">${escapeHtml(cta.primary.label)}</a>` : ""}${cta.secondary ? `<a class="btn btn-secondary" href="${escapeHtml(cta.secondary.href)}">${escapeHtml(cta.secondary.label)}</a>` : ""}</div>`;
}

async function loadManifest() {
    const page = document.body.dataset.page;
    if (!page) return;

    const response = await fetch(`content/${page}.json`);
    if (!response.ok) throw new Error(`manifest ${page} unavailable`);
    const manifest = await response.json();

    document.title = manifest.metaTitle || document.title;
    const description = document.querySelector('meta[name="description"]');
    if (description && manifest.metaDescription) {
        description.setAttribute("content", manifest.metaDescription);
    }

    const heroEyebrow = document.getElementById("hero-eyebrow");
    const heroTitle = document.getElementById("hero-title");
    const heroTagline = document.getElementById("hero-tagline");
    const heroIntro = document.getElementById("hero-intro");

    if (heroEyebrow) heroEyebrow.textContent = manifest.eyebrow || "";
    if (heroTitle) heroTitle.textContent = manifest.title || "";
    if (heroTagline) heroTagline.textContent = manifest.tagline || "";
    if (heroIntro) heroIntro.textContent = manifest.intro || "";

    if (renderEditorialExperience(page, manifest)) {
        setupTilt();
        return;
    }

    renderMetrics(manifest.metrics);
    renderPanelGrid("manifest-pillars", manifest.pillars);
    renderFacts(manifest.facts);
    renderRules(manifest.rules);
    renderCta(manifest.cta);
    renderSequence(manifest.prev, manifest.next);

    setupTilt();
}

async function loadOverview() {
    const target = document.getElementById("overview-live");
    if (!target) return;
    try {
        const response = await fetch("/api/overview");
        if (!response.ok) throw new Error("overview unavailable");
        const data = await response.json();
        target.innerHTML = `
            <article class="live-card tilt-card">
                <h3>Visitas</h3>
                <p>${escapeHtml(String(data.visits))}</p>
            </article>
            <article class="live-card tilt-card">
                <h3>Región</h3>
                <p>${escapeHtml(data.city ? `${data.city}, ${data.region}` : data.region)}</p>
            </article>
            <article class="live-card tilt-card">
                <h3>Despliegue</h3>
                <p>${escapeHtml(data.deployment)} vía ${escapeHtml(data.transport)}</p>
            </article>
        `;
        setupTilt();
    } catch (_error) {
        target.innerHTML = '<article class="live-card"><h3>Estado</h3><p>No se pudo cargar la telemetría del portal.</p></article>';
    }
}

async function loadDiscord() {
    const target = document.getElementById("discord-live");
    if (!target) return;
    try {
        const response = await fetch("/api/discord");
        if (!response.ok) throw new Error("discord unavailable");
        const data = await response.json();
        const online = Number.isFinite(data.presence_count) ? data.presence_count : null;
        const channels = Array.isArray(data.channels) ? data.channels.length : 0;
        target.innerHTML = `
            <article class="live-card tilt-card">
                <h3>Actividad del Discord</h3>
                <p>${online === null ? "Widget disponible" : `${escapeHtml(String(online))} personas visibles ahora`}</p>
            </article>
            <article class="live-card tilt-card">
                <h3>Canales públicos</h3>
                <p>${channels > 0 ? `${escapeHtml(String(channels))} espacios visibles para conversación y soporte.` : "Información visible desde el servidor de Discord."}</p>
            </article>
            <article class="live-card tilt-card">
                <h3>Entrar al servidor</h3>
                <p><a class="text-link" href="https://discord.gg/rR7FbfCt9Y" target="_blank" rel="noopener">Abrir Discord <span>↗</span></a></p>
            </article>
        `;
        setupTilt();
    } catch (_error) {
        target.innerHTML = '<article class="live-card"><h3>Discord</h3><p>No se pudo sincronizar el widget ahora mismo.</p></article>';
    }
}

function setupCopyButtons() {
        `;
        setupTilt();
    } catch (_error) {
        target.innerHTML = '<article class="live-card"><h3>Discord</h3><p>No se pudo sincronizar el widget ahora mismo.</p></article>';
    }
}

function setupCopyButtons() {
    document.querySelectorAll("[data-copy]").forEach((button) => {
        button.addEventListener("click", () => copyText(button.dataset.copy));
    });
}

function setupCrestStage() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const stages = [
        { stageId: "heroCrestStage", containerSelector: ".hero-visual" },
        { stageId: "storeCrestStage", containerSelector: ".store-visual" }
    ];

    stages.forEach(({ stageId, containerSelector }) => {
        const stage = document.getElementById(stageId);
        const container = document.querySelector(containerSelector);
        if (!stage || !container) return;

        container.addEventListener("mousemove", (e) => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            const rotateX = (-y / rect.height) * 28;
            const rotateY = (x / rect.width) * 28;
            stage.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
        });

        container.addEventListener("mouseleave", () => {
            stage.style.transform = "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
        });
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    normalizeNavigation();
    setupNav();
    setupProgress();
    setupCopyButtons();
    setupCrestStage();
    document.querySelectorAll("[data-year]").forEach((node) => {
        node.textContent = String(new Date().getFullYear());
    });

    try {
        await loadManifest();
    } catch (_error) {
        showToast("No se pudo cargar el contenido de esta página.");
    }

    await Promise.all([loadOverview(), loadDiscord()]);
});
