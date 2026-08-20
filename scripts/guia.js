// Buscador y filtros de la guia con soporte para acordeones desplegables
(() => {
    const input = document.getElementById("guide-q");
    const count = document.getElementById("guide-count");
    const empty = document.getElementById("guide-empty");
    const filters = [...document.querySelectorAll(".guide-filters button, .guide-chips button")];
    const accordions = [...document.querySelectorAll(".guide-accordion")];
    const sections = [...document.querySelectorAll(".guide-section")];
    const rows = [...document.querySelectorAll(".guide-row")];
    const btnExpandAll = document.getElementById("btn-expand-all");
    const btnCollapseAll = document.getElementById("btn-collapse-all");

    if (!input || !rows.length) return;

    // Indexar texto de cada fila
    const index = rows.map((row) => ({
        row,
        accordion: row.closest(".guide-accordion"),
        section: row.closest(".guide-section"),
        text: row.textContent.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
    }));

    let category = "all";

    const normalize = (value) => value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();

    function apply() {
        const query = normalize(input.value);
        const terms = query.split(/\s+/).filter(Boolean);
        let visible = 0;
        const matchingAccordions = new Set();

        for (const entry of index) {
            const accCat = entry.accordion?.dataset.cat || entry.section?.dataset.cat || "all";
            const matchesCategory = category === "all" || accCat === category;
            const matchesText = terms.every((term) => entry.text.includes(term));
            const show = matchesCategory && matchesText;
            
            entry.row.classList.toggle("is-hidden", !show);
            if (show) {
                visible++;
                if (entry.accordion) {
                    matchingAccordions.add(entry.accordion);
                }
            }
        }

        // Gestionar visibilidad y auto-apertura de acordeones
        accordions.forEach((acc) => {
            const accCat = acc.dataset.cat || "all";
            const matchesCategory = category === "all" || accCat === category;
            const hasVisibleRows = matchingAccordions.has(acc);
            const isMatch = matchesCategory && (terms.length === 0 || hasVisibleRows);

            acc.classList.toggle("is-hidden", !isMatch);

            // Si hay búsqueda activa y tiene coincidencia, abrirlo automáticamente
            if (terms.length > 0 && hasVisibleRows) {
                acc.open = true;
            }
        });

        // Secciones simples sin acordeón
        sections.forEach((section) => {
            if (!section.classList.contains("guide-accordion")) {
                const anyVisible = section.querySelector(".guide-row:not(.is-hidden)");
                section.classList.toggle("is-hidden", !anyVisible);
            }
        });

        empty?.classList.toggle("is-hidden", visible > 0);
        if (count) {
            count.textContent = terms.length || category !== "all"
                ? `${visible} de ${index.length} entradas encontradas`
                : `${index.length} mecánicas y recetas catalogadas`;
        }
    }

    input.addEventListener("input", apply);

    filters.forEach((button) => {
        button.addEventListener("click", () => {
            category = button.dataset.filter || "all";
            filters.forEach((other) => {
                const isSelected = other === button;
                other.setAttribute("aria-pressed", String(isSelected));
                other.classList.toggle("is-active", isSelected);
            });
            apply();
        });
    });

    if (btnExpandAll) {
        btnExpandAll.addEventListener("click", () => {
            accordions.forEach(acc => {
                if (!acc.classList.contains("is-hidden")) acc.open = true;
            });
        });
    }

    if (btnCollapseAll) {
        btnCollapseAll.addEventListener("click", () => {
            accordions.forEach(acc => acc.open = false);
        });
    }

    apply();
})();
