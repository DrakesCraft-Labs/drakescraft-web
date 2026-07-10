function bossesEscapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

document.addEventListener("DOMContentLoaded", () => {
    const steps = document.getElementById("summon-steps");
    const note = document.getElementById("summon-note");
    const obtain = document.getElementById("summon-obtain");
    const grid = document.getElementById("boss-codex-grid");
    if (!steps || !note || !grid) return;

    fetch("/api/bosses")
        .then((response) => response.json())
        .then((catalog) => {
            document.getElementById("bosses-count").textContent = String(catalog.summary.bosses);
            document.getElementById("bosses-total").textContent = `${catalog.summary.bosses} entidades del panteón`;
            document.getElementById("bosses-natural").textContent = catalog.summary.naturalSpawnEnabled ? "Activo" : "Desactivado";
            document.getElementById("bosses-top-difficulty").textContent = catalog.summary.topDifficulty;

            steps.innerHTML = (catalog.invocation.steps || []).map((item, index) => `
                <article class="journey-card tilt-card">
                    <span class="journey-card__step">${index + 1}</span>
                    <h3>Paso ${index + 1}</h3>
                    <p>${bossesEscapeHtml(item)}</p>
                </article>
            `).join("");

            note.textContent = catalog.invocation.note || "";

            if (obtain && catalog.invocation.obtain) {
                obtain.innerHTML = `
                    <article class="panel-card tilt-card">
                        <h3>${bossesEscapeHtml(catalog.invocation.obtain.title || "Cómo se consiguen")}</h3>
                        <ul style="margin:0;padding-left:1rem;">
                            ${(catalog.invocation.obtain.items || []).map((item) => `<li>${bossesEscapeHtml(item)}</li>`).join("")}
                        </ul>
                    </article>
                `;
            }

            grid.innerHTML = catalog.bosses.map((boss) => `
                <article class="boss-card tilt-card">
                    <h3>${bossesEscapeHtml(boss.name)}</h3>
                    <p style="color:var(--page-accent);margin-bottom:0.6rem;">${bossesEscapeHtml(boss.title)}</p>
                    <p>${bossesEscapeHtml(boss.arena)}</p>
                    <ul style="margin-top:0.9rem;">
                        <li><strong>Invocador:</strong> ${bossesEscapeHtml(boss.invocationItem)}</li>
                        <li><strong>Dificultad:</strong> ${bossesEscapeHtml(boss.difficulty)}</li>
                        <li><strong>Drops:</strong> ${bossesEscapeHtml((boss.drops || []).join(", "))}</li>
                        <li><strong>Rol:</strong> ${bossesEscapeHtml(boss.rewards)}</li>
                    </ul>
                </article>
            `).join("");
        })
        .catch(() => {
            note.textContent = "No se pudo cargar la guía de invocación.";
            grid.innerHTML = "<article class='boss-card'><h3>Bosses no disponibles</h3><p>La API del panteón no respondió.</p></article>";
        });
});
