// Buscador y filtros de la guia. Todo el contenido ya esta en el HTML: aqui solo se oculta lo
// que no calza, para que la pagina siga siendo util sin JavaScript.
(() => {
    const input = document.getElementById("guide-q");
    const count = document.getElementById("guide-count");
    const empty = document.getElementById("guide-empty");
    const filters = [...document.querySelectorAll(".guide-filters button")];
    const sections = [...document.querySelectorAll(".guide-section[data-cat]")];
    const rows = [...document.querySelectorAll(".guide-section[data-cat] .guide-row")];
    if (!input || !rows.length) return;

    // Se indexa una vez: el texto de cada fila no cambia.
    const index = rows.map((row) => ({
        row,
        section: row.closest(".guide-section"),
        text: row.textContent.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
    }));

    let category = "all";

    const normalize = (value) => value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();

    function apply() {
        const terms = normalize(input.value).split(/\s+/).filter(Boolean);
        let visible = 0;

        for (const entry of index) {
            const matchesCategory = category === "all" || entry.section.dataset.cat === category;
            const matchesText = terms.every((term) => entry.text.includes(term));
            const show = matchesCategory && matchesText;
            entry.row.classList.toggle("is-hidden", !show);
            if (show) visible++;
        }

        // Una seccion sin filas visibles solo estorba.
        for (const section of sections) {
            const anyVisible = section.querySelector(".guide-row:not(.is-hidden)");
            section.classList.toggle("is-hidden", !anyVisible);
        }

        empty?.classList.toggle("is-hidden", visible > 0);
        if (count) {
            count.textContent = terms.length || category !== "all"
                ? `${visible} de ${index.length} comandos`
                : `${index.length} comandos documentados`;
        }
    }

    input.addEventListener("input", apply);

    filters.forEach((button) => {
        button.addEventListener("click", () => {
            category = button.dataset.filter || "all";
            filters.forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
            apply();
        });
    });

    apply();
})();
