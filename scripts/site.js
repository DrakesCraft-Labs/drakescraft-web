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

            const isTranslated = document.cookie.includes('googtrans=/es/en');
            const langItem = document.createElement("li");
            const langBtn = document.createElement("button");
            langBtn.className = "nav-lang-btn";
            langBtn.type = "button";
            langBtn.id = "nav-lang-toggle";
            langBtn.innerHTML = `🌐 <span>${isTranslated ? 'ES' : 'EN'}</span>`;
            langBtn.title = isTranslated ? "Cambiar a Español" : "Translate to English";
            langBtn.addEventListener("click", () => {
                if (isTranslated) {
                    resetGoogleTranslate();
                } else {
                    applyGoogleTranslate('en');
                }
            });
            langItem.appendChild(langBtn);
            fragment.appendChild(langItem);

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

    function setGoogleTranslateCookie(lang) {
        const domain = window.location.hostname.includes('drakescraft.cl') ? '.drakescraft.cl' : window.location.hostname;
        document.cookie = `googtrans=/es/${lang}; path=/;`;
        document.cookie = `googtrans=/es/${lang}; path=/; domain=${domain};`;
    }

    function applyGoogleTranslate(lang) {
        localStorage.setItem('drakes_lang_choice', lang);
        setGoogleTranslateCookie(lang);
        window.location.reload();
    }

    function resetGoogleTranslate() {
        localStorage.removeItem('drakes_lang_choice');
        const domain = window.location.hostname.includes('drakescraft.cl') ? '.drakescraft.cl' : window.location.hostname;
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
        window.location.reload();
    }

    function showLanguageBanner() {
        if (document.getElementById('dk-lang-banner')) return;
        const banner = document.createElement('aside');
        banner.className = 'dk-lang-banner';
        banner.id = 'dk-lang-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Language selection');
        banner.innerHTML = `
          <div class="dk-lang-banner__content">
            <span class="dk-lang-icon" aria-hidden="true">🌐</span>
            <div class="dk-lang-text">
              <strong>We noticed your browser is in English.</strong>
              <span>Would you like to translate DrakesCraft into English?</span>
            </div>
            <div class="dk-lang-actions">
              <button class="dk-lang-btn dk-lang-btn--primary" id="dk-lang-translate" type="button">🌐 Translate to English</button>
              <button class="dk-lang-btn dk-lang-btn--ghost" id="dk-lang-dismiss" type="button" aria-label="Dismiss">✕ Not now</button>
            </div>
          </div>
        `;
        document.body.appendChild(banner);

        document.getElementById('dk-lang-translate')?.addEventListener('click', () => {
            applyGoogleTranslate('en');
        });

        document.getElementById('dk-lang-dismiss')?.addEventListener('click', () => {
            localStorage.setItem('drakes_lang_dismissed', 'true');
            banner.classList.add('hidden');
            setTimeout(() => banner.remove(), 400);
        });
    }

    function initBilingualSystem() {
        if (!document.getElementById('google_translate_element')) {
            const gtDiv = document.createElement('div');
            gtDiv.id = 'google_translate_element';
            gtDiv.style.display = 'none';
            document.body.appendChild(gtDiv);
        }

        window.googleTranslateElementInit = function() {
            try {
                new google.translate.TranslateElement({
                    pageLanguage: 'es',
                    includedLanguages: 'en,es,pt,fr',
                    autoDisplay: false
                }, 'google_translate_element');
            } catch (ignored) {}
        };

        if (!document.querySelector('script[src*="translate.google.com"]')) {
            const s = document.createElement('script');
            s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            s.async = true;
            document.body.appendChild(s);
        }

        const isAlreadyEn = document.cookie.includes('googtrans=/es/en') || localStorage.getItem('drakes_lang_choice') === 'en';
        if (isAlreadyEn && !document.cookie.includes('googtrans=/es/en')) {
            setGoogleTranslateCookie('en');
        }

        const userLang = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
        const isNonSpanish = userLang && !userLang.startsWith('es');
        const dismissed = localStorage.getItem('drakes_lang_dismissed') === 'true';

        if (isNonSpanish && !isAlreadyEn && !dismissed) {
            showLanguageBanner();
        }
    }

    window.showToast = showToast;
    window.setupTilt = setupTilt;

    document.addEventListener("DOMContentLoaded", () => {
        renderPrimaryNavigation();
        setupNavigation();
        setupProgress();
        setupCrestStage();
        initBilingualSystem();
        document.querySelectorAll("[data-year]").forEach((node) => { node.textContent = String(new Date().getFullYear()); });
    });
}());
