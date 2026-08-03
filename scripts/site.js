/* Shared storefront interactions. Public pages are intentionally store-only. */
(function () {
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
        setupNavigation();
        setupProgress();
        setupCrestStage();
        document.querySelectorAll("[data-year]").forEach((node) => { node.textContent = String(new Date().getFullYear()); });
    });
}());
