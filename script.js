document.addEventListener('DOMContentLoaded', () => {
    setupVisitorStats();
    setupDiscordLivePanel();
    setupStoreExperience();
    setupPortalEffects();
    setupAmbientSound();

    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            const open = navMenu.classList.toggle('active');
            navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    }

    navLinks.forEach((link) => {
        link.addEventListener('click', () => {
            navMenu?.classList.remove('active');
            if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
        });
    });

    const tabBtns = document.querySelectorAll('.tab-btn');
    const storeCards = document.querySelectorAll('.store-card');
    if (tabBtns.length > 0 && storeCards.length > 0) {
        tabBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                tabBtns.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                const category = btn.getAttribute('data-category');
                storeCards.forEach((card) => {
                    if (card.classList.contains(`category-${category}`)) {
                        card.style.display = 'flex';
                        card.style.animation = 'fadeIn 0.5s ease';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
        tabBtns[0].click();
    }

    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach((question) => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            if (!answer || !answer.classList.contains('faq-answer')) return;

            const opening = !question.classList.contains('active');
            question.classList.toggle('active');
            question.setAttribute('aria-expanded', opening ? 'true' : 'false');

            if (question.classList.contains('active')) {
                answer.style.maxHeight = answer.scrollHeight + 'px';
            } else {
                answer.style.maxHeight = '0';
            }

            faqQuestions.forEach((other) => {
                if (other === question) return;
                other.classList.remove('active');
                other.setAttribute('aria-expanded', 'false');
                const a = other.nextElementSibling;
                if (a && a.classList.contains('faq-answer')) a.style.maxHeight = '0';
            });
        });
    });

    const sections = document.querySelectorAll('section[id], header[id]');
    if (sections.length && navLinks.length) {
        window.addEventListener('scroll', () => {
            let current = '';
            const y = window.scrollY;
            sections.forEach((section) => {
                const id = section.getAttribute('id');
                if (!id) return;
                if (y >= section.offsetTop - 160) current = id;
            });

            navLinks.forEach((link) => {
                const href = link.getAttribute('href') || '';
                const hash = href.includes('#') ? href.split('#').pop() : '';
                link.classList.remove('active');
                if (current && hash === current) link.classList.add('active');
            });
        });
    }

    const revealElements = document.querySelectorAll(
        '.feature-card, .store-card, .join-card, .section-title, .section-desc, .community-grid, .connect-card, .prose-card'
    );
    if (revealElements.length && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) entry.target.classList.add('visible');
                });
            },
            { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
        );
        revealElements.forEach((el) => {
            el.classList.add('reveal-on-scroll');
            observer.observe(el);
        });
    }

    const canvas = document.getElementById('particles-canvas');
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    let width;
    let height;
    const particles = [];

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.init();
        }
        init() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            const colors = ['rgba(6,182,212,', 'rgba(217,70,239,', 'rgba(234,179,8,'];
            this.colorBase = colors[Math.floor(Math.random() * colors.length)];
            this.size = Math.random() * 2 + 0.5;
            this.alpha = Math.random() * 0.5 + 0.2;
            this.wobble = Math.random() * Math.PI * 2;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.wobble += 0.05;
            this.x += Math.sin(this.wobble) * 0.1;
            if (this.x < -10) this.x = width + 10;
            if (this.x > width + 10) this.x = -10;
            if (this.y < -10) this.y = height + 10;
            if (this.y > height + 10) this.y = -10;
        }
    }

    for (let i = 0; i < 55; i++) particles.push(new Particle());

    function animate() {
        ctx.clearRect(0, 0, width, height);
        const scrollY = window.scrollY;
        particles.forEach((p) => {
            p.update();
            const py = p.y - scrollY * 0.05 * p.size;
            let finalY = py % height;
            if (finalY < 0) finalY += height;
            ctx.beginPath();
            ctx.arc(p.x, finalY, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.colorBase + p.alpha + ')';
            ctx.fill();
        });
        requestAnimationFrame(animate);
    }
    animate();
});

function copyIp(ip) {
    navigator.clipboard.writeText(ip).then(() => {
        showToast('Copiado: ' + ip);
    }).catch(() => {
        alert('Copia manualmente: ' + ip);
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#10B981',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '8px',
        boxShadow: '0 5px 20px rgba(0,0,0,0.3)',
        zIndex: '9999',
        fontSize: '1rem',
        fontWeight: '500',
        opacity: '0',
        transition: 'opacity 0.3s',
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

function setupVisitorStats() {
    const visitCountEl = document.getElementById('visit-count');
    const viewerLocationEl = document.getElementById('viewer-location');
    const viewerDateTimeEl = document.getElementById('viewer-datetime');
    if (!visitCountEl || !viewerLocationEl || !viewerDateTimeEl) return;

    const updateDateTime = (timeZone) => {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('es-CL', {
            dateStyle: 'full',
            timeStyle: 'medium',
            timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
        });
        viewerDateTimeEl.textContent = formatter.format(now);
    };

    fetch('/api/overview')
        .then((res) => {
            if (!res.ok) throw new Error('overview error');
            return res.json();
        })
        .then((data) => {
            visitCountEl.textContent = Number(data.visits || 0).toLocaleString('es-CL');
            viewerLocationEl.textContent = data.city || data.region || 'La Odisea';
        })
        .catch(() => {
            visitCountEl.textContent = 'N/D';
            viewerLocationEl.textContent = 'La Odisea';
        });

    updateDateTime();
    setInterval(() => updateDateTime(), 1000);
}

function setupDiscordLivePanel() {
    const statusDot = document.getElementById('discord-status-dot');
    const statusText = document.getElementById('discord-status-text');
    const presenceCount = document.getElementById('discord-presence-count');
    const totalCount = document.getElementById('discord-total-count');
    const channelsList = document.getElementById('discord-channels-list');
    const membersGrid = document.getElementById('discord-members');
    const heroDiscordCount = document.getElementById('hero-discord-count');
    if (!statusDot || !statusText || !presenceCount || !totalCount || !channelsList) return;

    const setOffline = () => {
        statusDot.classList.remove('online');
        statusDot.classList.add('offline');
        statusText.textContent = 'Sin conexion';
        channelsList.innerHTML = '<li>Discord no disponible temporalmente</li>';
    };

    const renderChannels = (channels) => {
        if (!Array.isArray(channels) || channels.length === 0) {
            channelsList.innerHTML = '<li>No hay canales visibles en el widget</li>';
            return;
        }

        const names = channels
            .map((channel) => channel && channel.name ? channel.name : '')
            .filter(Boolean)
            .slice(0, 12);

        channelsList.innerHTML = names.map((name) => '<li># ' + name + '</li>').join('');
    };

    const fetchDiscordData = () => {
        fetch('/api/discord')
            .then((res) => {
                if (!res.ok) throw new Error('discord widget json error');
                return res.json();
            })
            .then((data) => {
                const online = Number.isFinite(data.online) ? data.online : 0;
                const estimatedTotal = Array.isArray(data.members) ? data.members.length : null;

                statusDot.classList.remove('offline');
                statusDot.classList.add('online');
                statusText.textContent = 'En linea';
                presenceCount.textContent = online.toLocaleString('es-CL');
                totalCount.textContent = Number(data.listed || estimatedTotal || 0).toLocaleString('es-CL');
                if (heroDiscordCount) heroDiscordCount.textContent = online.toLocaleString('es-CL');
                renderChannels(data.channels);
                if (membersGrid) {
                    membersGrid.innerHTML = (data.members || []).map((member) => `
                        <article class="member-chip" title="${escapeHtml(member.activity || member.status)}">
                            <span class="member-avatar-wrap"><img src="${member.avatarUrl}" alt="" loading="lazy"><i class="${member.status}"></i></span>
                            <span><strong>${escapeHtml(member.username)}</strong><small>${escapeHtml(member.activity || member.status)}</small></span>
                        </article>
                    `).join('');
                }
            })
            .catch(() => {
                setOffline();
            });
    };

    fetchDiscordData();
    setInterval(fetchDiscordData, 60000);
}

function escapeHtml(value) {
    const element = document.createElement('span');
    element.textContent = String(value || '');
    return element.innerHTML;
}

function setupPortalEffects() {
    const progress = document.getElementById('scroll-progress');
    const dragon = document.querySelector('.hero-dragon');
    const deck = document.querySelector('.command-deck');
    let ticking = false;

    const update = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (progress) progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
        if (dragon) dragon.style.transform = `translate3d(${window.scrollY * -0.035}px, ${window.scrollY * 0.08}px, 0) rotate(${window.scrollY * 0.006}deg)`;
        ticking = false;
    };
    window.addEventListener('scroll', () => {
        if (!ticking) requestAnimationFrame(update);
        ticking = true;
    }, { passive: true });

    if (deck && matchMedia('(pointer:fine)').matches) {
        deck.addEventListener('pointermove', (event) => {
            const box = deck.getBoundingClientRect();
            const x = (event.clientX - box.left) / box.width - 0.5;
            const y = (event.clientY - box.top) / box.height - 0.5;
            deck.style.transform = `perspective(900px) rotateY(${x * 5}deg) rotateX(${y * -5}deg)`;
        });
        deck.addEventListener('pointerleave', () => { deck.style.transform = ''; });
    }
    update();
}

function setupAmbientSound() {
    const button = document.getElementById('sound-toggle');
    if (!button) return;
    let context;
    let gain;
    let oscillators = [];

    const stop = () => {
        oscillators.forEach((oscillator) => oscillator.stop());
        oscillators = [];
        context?.close();
        context = null;
        button.classList.add('muted');
        button.setAttribute('aria-label', 'Activar ambientación sonora');
    };

    button.addEventListener('click', () => {
        try {
            if (context) return stop();
            context = new AudioContext();
            gain = context.createGain();
            gain.gain.value = 0.025;
            gain.connect(context.destination);
            [55, 82.41, 110].forEach((frequency, index) => {
                const oscillator = context.createOscillator();
                const localGain = context.createGain();
                oscillator.type = index === 1 ? 'triangle' : 'sine';
                oscillator.frequency.value = frequency;
                localGain.gain.value = 0.5 / (index + 1);
                oscillator.connect(localGain).connect(gain);
                oscillator.start();
                oscillators.push(oscillator);
            });
            button.classList.remove('muted');
            button.setAttribute('aria-label', 'Desactivar ambientación sonora');
        } catch (_error) {
            stop();
        }
    });
}

function setupStoreExperience() {
    const grid = document.getElementById('store-grid');
    const tabs = document.getElementById('store-tabs');
    const quoteItems = document.getElementById('quote-items');
    const quoteTotal = document.getElementById('quote-total');
    const quoteForm = document.getElementById('quote-form');
    if (!grid || !tabs || !quoteItems || !quoteTotal || !quoteForm) return;

    const state = {
        catalog: null,
        category: 'monthly',
        selected: new Set()
    };

    const money = (value) => Number.isFinite(value)
        ? '$' + value.toLocaleString('es-CL') + ' CLP'
        : 'Cotización';

    const productById = (id) => state.catalog.products.find((product) => product.id === id);

    const renderTabs = () => {
        tabs.innerHTML = state.catalog.categories.map((category) => `
            <button type="button" class="tab-btn ${category.id === state.category ? 'active' : ''}" data-store-category="${category.id}">
                <span>${escapeHtml(category.label)}</span>
                <small>${escapeHtml(category.tagline)}</small>
            </button>
        `).join('');
    };

    const renderProducts = () => {
        const products = state.catalog.products.filter((product) => product.category === state.category);
        grid.innerHTML = products.map((product) => `
            <article class="store-card store-card--modern ${product.featured ? 'featured' : ''} accent-${product.accent}">
                <div class="card-header">
                    <div class="rank-badge ${product.featured ? 'monthly' : 'permanent'}">${escapeHtml(product.badge)}</div>
                    <h3>${escapeHtml(product.name)}</h3>
                    <p class="store-card-subtitle">${escapeHtml(product.summary)}</p>
                    <div class="price">${money(product.clp)}${Number.isFinite(product.usd) ? `<span>/ USD ${product.usd}</span>` : ''}</div>
                </div>
                <ul class="benefits-list">
                    ${product.includes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                </ul>
                <button type="button" class="btn-store ${state.selected.has(product.id) ? 'selected' : ''}" data-product-id="${product.id}">
                    ${state.selected.has(product.id) ? 'Seleccionado' : 'Agregar a solicitud'}
                </button>
            </article>
        `).join('');
    };

    const renderQuote = () => {
        const selected = Array.from(state.selected).map(productById).filter(Boolean);
        if (!selected.length) {
            quoteItems.innerHTML = '<p>No hay productos seleccionados todavía.</p>';
            quoteTotal.textContent = '$0 CLP';
            return;
        }

        const total = selected.reduce((sum, product) => sum + (Number.isFinite(product.clp) ? product.clp : 0), 0);
        quoteTotal.textContent = money(total);
        quoteItems.innerHTML = selected.map((product) => `
            <div class="quote-item">
                <span>${escapeHtml(product.name)}</span>
                <strong>${money(product.clp)}</strong>
                <button type="button" data-remove-product="${product.id}" aria-label="Quitar ${escapeHtml(product.name)}">×</button>
            </div>
        `).join('');
    };

    const renderAll = () => {
        renderTabs();
        renderProducts();
        renderQuote();
    };

    tabs.addEventListener('click', (event) => {
        const button = event.target.closest('[data-store-category]');
        if (!button) return;
        state.category = button.dataset.storeCategory;
        renderAll();
    });

    grid.addEventListener('click', (event) => {
        const button = event.target.closest('[data-product-id]');
        if (!button) return;
        const id = button.dataset.productId;
        if (state.selected.has(id)) state.selected.delete(id);
        else state.selected.add(id);
        renderAll();
    });

    quoteItems.addEventListener('click', (event) => {
        const button = event.target.closest('[data-remove-product]');
        if (!button) return;
        state.selected.delete(button.dataset.removeProduct);
        renderAll();
    });

    quoteForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const result = document.getElementById('quote-result');
        if (!state.selected.size) {
            showToast('Selecciona algo de la tienda primero.');
            return;
        }
        const formData = new FormData(quoteForm);
        const payload = {
            nick: formData.get('nick'),
            contact: formData.get('contact'),
            notes: formData.get('notes'),
            website: formData.get('website'),
            items: Array.from(state.selected)
        };

        const selectedProducts = state.catalog?.products?.filter(p => Array.from(state.selected).includes(p.id)) || [];
        const hasClp = selectedProducts.some(p => Number.isFinite(p.clp) && p.clp > 0);
        const hasUsd = selectedProducts.some(p => Number.isFinite(p.usd) && p.usd > 0);

        try {
            const response = await fetch('/api/store/quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('quote failed');
            const data = await response.json();

            let paymentButtons = '';
            if (hasClp || hasUsd) {
                let mpButton = '';
                let paypalButton = '';

                if (hasClp) {
                    try {
                        const mpRes = await fetch('/api/store/checkout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        if (mpRes.ok) {
                            const mpData = await mpRes.json();
                            if (mpData.init_point) {
                                mpButton = `<a class="btn-mp" href="${escapeHtml(mpData.init_point)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;justify-content:center;width:100%;margin-bottom:8px;">
                                    <img src="assets/mp-logo.svg" alt="" width="20" height="20" style="vertical-align:middle;margin-right:8px;border-radius:4px;">
                                    Pagar con MercadoPago (CLP)
                                </a>`;
                            }
                        }
                    } catch (_) {}
                }

                if (hasUsd) {
                    try {
                        const ppRes = await fetch('/api/store/paypal/checkout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        if (ppRes.ok) {
                            const ppData = await ppRes.json();
                            if (ppData.init_point) {
                                paypalButton = `<a class="btn-paypal" href="${escapeHtml(ppData.init_point)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;justify-content:center;width:100%;margin-bottom:8px;">
                                    <img src="assets/paypal-logo.svg" alt="" width="20" height="20" style="vertical-align:middle;margin-right:8px;border-radius:4px;">
                                    Pagar con PayPal (USD)
                                </a>`;
                            }
                        }
                    } catch (_) {}
                }

                if (mpButton || paypalButton) {
                    paymentButtons = `<div class="store-payment-options" style="display:flex;flex-direction:column;gap:8px;margin:1.25rem 0 0.75rem 0;">
                        ${mpButton}
                        ${paypalButton}
                    </div>`;
                }
            }

            if (result) {
                result.hidden = false;
                result.innerHTML = `
                    <strong>Solicitud ${escapeHtml(data.quoteId)} lista.</strong>
                    ${paymentButtons}
                    <details style="margin-top:0.75rem">
                        <summary style="cursor:pointer;font-size:0.85rem;opacity:0.7">O abre ticket manual en Discord</summary>
                        <textarea readonly rows="7" style="margin-top:0.5rem">${escapeHtml(data.ticketMessage)}</textarea>
                        <a class="btn-discord" href="${escapeHtml(data.discordUrl)}" target="_blank" rel="noopener" style="width:100%;justify-content:center;margin-top:0.5rem;">Abrir Discord</a>
                    </details>
                `;
            }
            showToast('Solicitud generada.');
        } catch (_error) {
            showToast('No se pudo generar la solicitud.');
        }
    });

    fetch('/api/store')
        .then((response) => {
            if (!response.ok) throw new Error('store unavailable');
            return response.json();
        })
        .then((catalog) => {
            state.catalog = catalog;
            document.getElementById('store-health').textContent = 'Catálogo online';
            document.getElementById('store-product-count').textContent = catalog.summary.products.toLocaleString('es-CL');
            document.getElementById('store-min-price').textContent = money(catalog.summary.minPrice);
            document.getElementById('store-max-price').textContent = money(catalog.summary.maxPrice);
            document.getElementById('store-updated').textContent = 'Actualizado ' + catalog.updatedAt;
            renderAll();

            // Detección de retorno de pago en la URL
            const urlParams = new URLSearchParams(window.location.search);
            const paymentStatus = urlParams.get('payment');
            const paypalToken = urlParams.get('token');

            if (paymentStatus === 'success') {
                showToast('¡Pago de MercadoPago recibido con éxito! El staff procesará tu entrega.');
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (paymentStatus === 'failure') {
                showToast('El pago de MercadoPago fue cancelado o rechazado.');
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (paymentStatus === 'paypal-success' && paypalToken) {
                showToast('Procesando confirmación de PayPal...');
                fetch('/api/store/paypal/capture', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: paypalToken })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.ok && data.status === 'COMPLETED') {
                        showToast('¡Pago de PayPal aprobado con éxito! Rangos en proceso de entrega.');
                    } else {
                        showToast('No se pudo confirmar el estado del pago de PayPal.');
                    }
                })
                .catch(() => {
                    showToast('Error de conexión al capturar el pago de PayPal.');
                })
                .finally(() => {
                    window.history.replaceState({}, document.title, window.location.pathname);
                });
            } else if (paymentStatus === 'paypal-cancel') {
                showToast('El pago de PayPal fue cancelado.');
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        })
        .catch(() => {
            grid.innerHTML = '<article class="store-loading-card">La tienda no está disponible temporalmente.</article>';
            document.getElementById('store-health').textContent = 'Sin conexión';
        });
}
