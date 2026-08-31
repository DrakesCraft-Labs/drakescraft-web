/* Shared storefront interactions. Public pages are intentionally store-only. */
(function () {
    /**
     * Construye una única navegación para todo el portal y evita que cada
     * página mantenga una copia distinta de enlaces, títulos y estados activos.
     */
    function renderPrimaryNavigation() {
        const navigation = document.querySelector(".site-nav");
        const menu = document.getElementById("nav-menu");
        const brandSubtitle = document.querySelector(".brand__meta span");
        if (!navigation || !menu) return;

        const path = window.location.pathname.split("/").pop() || "index.html";
        const activeKey = path === "index.html" ? "home"
            : path === "store.html" ? "store"
                : path === "guia.html" ? "server"
                    : path === "guia-comandos.html" ? "commands"
                        : path === "guia-rangos.html" ? "ranks"
                            : path === "guia-slimefun.html" ? "slimefun"
                                : path === "metricas.html" ? "metrics"
                                    : path === "apoya.html" ? "support"
                                        : path === "support.html" || path === "terms.html" ? "help"
                                            : "";
        const items = [
            ["home", "Inicio", "/"],
            ["server", "El servidor", "guia.html"],
            ["commands", "Comandos", "guia-comandos.html"],
            ["ranks", "Rangos", "guia-rangos.html"],
            ["slimefun", "Slimefun", "guia-slimefun.html"],
            ["store", "Tienda", "store.html"],
            ["metrics", "Métricas", "metricas.html"],
            ["support", "Apoyar", "apoya.html"],
            ["help", "Soporte", "support.html"]
        ];

        try {
            const fragment = document.createDocumentFragment();
            items.forEach(([key, label, href]) => {
                const listItem = document.createElement("li");
                const link = document.createElement("a");
                link.href = href;
                link.textContent = label;
                if (key === activeKey) {
                    link.classList.add("active");
                    link.setAttribute("aria-current", "page");
                }
                listItem.appendChild(link);
                fragment.appendChild(listItem);
            });

            const discordItem = document.createElement("li");
            const discordLink = document.createElement("a");
            discordLink.className = "nav-discord";
            discordLink.href = "https://discord.gg/rv3vtXZTk7";
            discordLink.target = "_blank";
            discordLink.rel = "noopener";
            discordLink.textContent = "Discord";
            discordItem.appendChild(discordLink);
            fragment.appendChild(discordItem);

            menu.replaceChildren(fragment);
            navigation.classList.remove("home-nav");
            if (brandSubtitle) brandSubtitle.textContent = "Portal oficial";
        } catch (error) {
            console.error("No se pudo unificar la navegación principal", error);
        }
    }

    function showToast(message) {
        let toast = document.querySelector(".toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.className = "toast";
            toast.setAttribute("role", "status");
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add("is-visible");
        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
    }

    function setupNavigation() {
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
            const total = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.width = `${Math.max(0, Math.min(100, total > 0 ? (window.scrollY / total) * 100 : 0))}%`;
        };
        window.addEventListener("scroll", update, { passive: true });
        update();
    }

    function setupTilt() {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        document.querySelectorAll(".tilt-card").forEach((card) => {
            card.addEventListener("mousemove", (event) => {
                const rect = card.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width;
                const y = (event.clientY - rect.top) / rect.height;
                card.style.transform = `rotateX(${(0.5 - y) * 5}deg) rotateY(${(x - 0.5) * 7}deg) translateY(-2px)`;
            });
            card.addEventListener("mouseleave", () => { card.style.transform = ""; });
        });
    }

    function setupCrestStage() {
        const stage = document.getElementById("storeCrestStage");
        const container = stage?.closest(".store-visual");
        if (!stage || !container || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        container.addEventListener("mousemove", (event) => {
            const rect = container.getBoundingClientRect();
            const x = event.clientX - rect.left - rect.width / 2;
            const y = event.clientY - rect.top - rect.height / 2;
            stage.style.transform = `rotateX(${(-y / rect.height) * 20}deg) rotateY(${(x / rect.width) * 20}deg) scale3d(1.03, 1.03, 1.03)`;
        });
        container.addEventListener("mouseleave", () => { stage.style.transform = ""; });
    }

    window.showToast = showToast;
    window.setupTilt = setupTilt;

    document.addEventListener("DOMContentLoaded", () => {
        renderPrimaryNavigation();
        setupNavigation();
        setupProgress();
        setupCrestStage();
        document.querySelectorAll("[data-year]").forEach((node) => { node.textContent = String(new Date().getFullYear()); });
    });
}());
