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
        <article class="metric-card tilt-card">
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

function renderJourney(items) {
    const target = document.getElementById("manifest-journey");
    if (!target || !items?.length) return;
    target.innerHTML = items.map((item) => `
        <article class="journey-card tilt-card">
            <span class="journey-card__step">${escapeHtml(item.step)}</span>
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

async function loadManifest() {
    const page = document.body.dataset.page;
    if (!page) return;

    const response = await fetch(`data/${page}.json`);
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

    renderMetrics(manifest.metrics);
    renderPanelGrid("manifest-pillars", manifest.pillars);
    renderJourney(manifest.journey);
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
        const members = (data.members || []).slice(0, 6).map((member) => `<li>${escapeHtml(member.username)}</li>`).join("");
        const channels = (data.channels || []).slice(0, 6).map((channel) => `<li>${escapeHtml(channel.name)}</li>`).join("");
        target.innerHTML = `
            <article class="live-card tilt-card">
                <h3>Miembros visibles</h3>
                <p>${escapeHtml(String(data.instant_invite ? data.presence_count ?? "--" : "--"))}</p>
            </article>
            <article class="live-card tilt-card">
                <h3>Canales</h3>
                <ul>${channels || "<li>Sin datos visibles</li>"}</ul>
            </article>
            <article class="live-card tilt-card">
                <h3>Tripulación</h3>
                <ul>${members || "<li>Sin presencias listadas</li>"}</ul>
            </article>
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

document.addEventListener("DOMContentLoaded", async () => {
    setupNav();
    setupProgress();
    setupCopyButtons();
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
