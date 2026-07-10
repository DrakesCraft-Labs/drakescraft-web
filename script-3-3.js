document.addEventListener('DOMContentLoaded', () => {
    setupVisitorStats();
    setupDiscordLivePanel();
    setupStoreExperience();
    setupBossesExperience();
    setupPortalEffects();
    setupAmbientSound();
    setupMcStatus();
    setupTiltPanels();

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

    const prefersReducedData = navigator.connection?.saveData;
    const lowPowerDevice = window.innerWidth < 900 || (navigator.hardwareConcurrency || 8) <= 4 || prefersReducedData;

    if (!window.THREE) {
        // fallback: simple 2D dots si Three.js no cargó
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        return;
    }

    const THREE = window.THREE;
    const page = document.body.dataset.page || 'default';
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(page === 'bosses' ? 0x090511 : 0x050816, page === 'bosses' ? 0.019 : 0.016);
    const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
    camera.position.z = 28;

    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: !lowPowerDevice,
        preserveDrawingBuffer: false,
        powerPreference: lowPowerDevice ? 'low-power' : 'high-performance',
    });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, lowPowerDevice ? 1 : 1.5));
    renderer.setClearColor(0x000000, 0);

    // Genera textura pixelada estilo Minecraft en canvas 2D
    function makeBlockTex(palette) {
        const S = 16;
        const c = document.createElement('canvas');
        c.width = c.height = S;
        const cx = c.getContext('2d');
        for (let y = 0; y < S; y++) {
            for (let x = 0; x < S; x++) {
                const border = x === 0 || y === 0 || x === S - 1 || y === S - 1;
                const col = border
                    ? palette[0]
                    : palette[1 + Math.floor(Math.random() * (palette.length - 1))];
                cx.fillStyle = col;
                cx.fillRect(x, y, 1, 1);
            }
        }
        const t = new THREE.CanvasTexture(c);
        t.magFilter = THREE.NearestFilter;
        t.minFilter = THREE.NearestFilter;
        return t;
    }

    const PALETTES = page === 'bosses' ? [
        ['#1f2937', '#ef4444', '#f97316', '#7f1d1d'],
        ['#111827', '#8b5cf6', '#c084fc', '#4c1d95'],
        ['#172554', '#38bdf8', '#60a5fa', '#1d4ed8'],
        ['#1a2e05', '#84cc16', '#4ade80', '#166534'],
        ['#2b0a3d', '#ec4899', '#fb7185', '#9d174d'],
        ['#2f1700', '#f59e0b', '#fbbf24', '#92400e'],
    ] : [
        ['#7c3aed', '#8b5cf6', '#a78bfa', '#6d28d9'],   // amatista
        ['#b45309', '#f59e0b', '#fbbf24', '#d97706'],   // oro
        ['#1e1b4b', '#2e1065', '#3b0764', '#312e81'],   // obsidiana
        ['#065f46', '#047857', '#059669', '#10b981'],   // esmeralda
        ['#6b7280', '#78716c', '#9ca3af', '#57534e'],   // piedra
        ['#831843', '#be185d', '#ec4899', '#9d174d'],   // netherita rosa
    ];

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const cubes = [];

    const cubeCount = lowPowerDevice ? (page === 'bosses' ? 22 : 24) : (page === 'bosses' ? 70 : 55);
    for (let i = 0; i < cubeCount; i++) {
        const pal = PALETTES[i % PALETTES.length];
        const mat = new THREE.MeshStandardMaterial({
            map: makeBlockTex(pal),
            roughness: 0.65,
            metalness: pal === PALETTES[1] ? 0.65 : 0.1,
            emissive: new THREE.Color(pal[1]).multiplyScalar(0.08),
        });
        const mesh = new THREE.Mesh(geo, mat);

        // Distribución esférica concentrada frente a la cámara
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = 5 + Math.random() * 16;
        mesh.position.set(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta) * 0.55,
            r * Math.cos(phi) - 4
        );
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        mesh.scale.setScalar(0.5 + Math.random() * 1.4);

        cubes.push({
            mesh,
            rx: (Math.random() - 0.5) * 0.008,
            ry: (Math.random() - 0.5) * 0.012,
            floatOff: Math.random() * Math.PI * 2,
            floatAmp: 0.15 + Math.random() * 0.25,
            baseY: mesh.position.y,
        });
        scene.add(mesh);
    }

    // Luces — dorado + morado para coincidir con la paleta del sitio
    scene.add(new THREE.AmbientLight(0xffffff, page === 'bosses' ? 1.35 : 1.6));
    const gold  = new THREE.PointLight(page === 'bosses' ? 0xef4444 : 0xf59e0b, 9, 90); gold.position.set(10, 5, 18);
    const purp  = new THREE.PointLight(0x8b5cf6, page === 'bosses' ? 8 : 7, 90); purp.position.set(-10, -3, 14);
    const cyan  = new THREE.PointLight(page === 'bosses' ? 0x38bdf8 : 0x06b6d4, 4, 70); cyan.position.set(0, 12, 16);
    const back  = new THREE.PointLight(page === 'bosses' ? 0xf97316 : 0xec4899, 3, 60); back.position.set(0, -8, -10);
    scene.add(gold, purp, cyan, back);

    // ── B: Partículas 3D (Points) ─────────────────────────────────────────
    const PART_COUNT = lowPowerDevice ? 140 : 420;
    const positions  = new Float32Array(PART_COUNT * 3);
    const partColors = new Float32Array(PART_COUNT * 3);
    const partSpeeds = new Float32Array(PART_COUNT);   // velocidad Z individual
    const partBaseZ  = new Float32Array(PART_COUNT);   // Z original para wrap

    const pColorSet = page === 'bosses' ? [
        new THREE.Color(0xef4444),
        new THREE.Color(0xf59e0b),
        new THREE.Color(0x8b5cf6),
        new THREE.Color(0x38bdf8),
        new THREE.Color(0xffffff),
    ] : [
        new THREE.Color(0x8b5cf6), // violeta
        new THREE.Color(0xf59e0b), // dorado
        new THREE.Color(0x06b6d4), // cyan
        new THREE.Color(0xec4899), // rosa
        new THREE.Color(0xffffff), // blanco estrella
    ];

    for (let i = 0; i < PART_COUNT; i++) {
        const i3 = i * 3;
        positions[i3]     = (Math.random() - 0.5) * 90;
        positions[i3 + 1] = (Math.random() - 0.5) * 55;
        positions[i3 + 2] = (Math.random() - 0.5) * 80;
        partBaseZ[i]      = positions[i3 + 2];
        partSpeeds[i]     = 0.015 + Math.random() * 0.04;

        const col = pColorSet[Math.floor(Math.random() * pColorSet.length)];
        partColors[i3]     = col.r;
        partColors[i3 + 1] = col.g;
        partColors[i3 + 2] = col.b;
    }

    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    partGeo.setAttribute('color',    new THREE.BufferAttribute(partColors, 3));

    // Textura circular suave para cada punto
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = dotCanvas.height = 32;
    const dotCtx = dotCanvas.getContext('2d');
    const grd = dotCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0,   'rgba(255,255,255,1)');
    grd.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    grd.addColorStop(1,   'rgba(255,255,255,0)');
    dotCtx.fillStyle = grd;
    dotCtx.fillRect(0, 0, 32, 32);
    const dotTex = new THREE.CanvasTexture(dotCanvas);

    const partMat = new THREE.PointsMaterial({
        size: 0.45,
        map: dotTex,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(partGeo, partMat);
    scene.add(points);

    // ── C: Isla de vóxeles flotante (InstancedMesh para performance) ─────────
    const IGRID = lowPowerDevice ? 9 : 13;
    const IHALF = Math.floor(IGRID / 2);
    const ivoxGeo = new THREE.BoxGeometry(0.46, 0.46, 0.46);

    const grassPos = [], dirtPos = [], stonePos = [];
    for (let ix = -IHALF; ix <= IHALF; ix++) {
        for (let iz = -IHALF; iz <= IHALF; iz++) {
            const d = Math.sqrt(ix * ix + iz * iz);
            if (d > IHALF + 0.5) continue;
            // Semilla fija por posición para reproducibilidad visual
            const seed = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453;
            const rand = seed - Math.floor(seed);
            const maxH = Math.max(1, Math.round((IHALF - d) * 0.85 + rand * 0.7));
            for (let iy = 0; iy < maxH; iy++) {
                const p = [ix * 0.5, iy * 0.5, iz * 0.5];
                if (iy === maxH - 1) grassPos.push(p);
                else if (iy < 2)     stonePos.push(p);
                else                 dirtPos.push(p);
            }
        }
    }

    function makeIM(posArr, color) {
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.88 });
        const im  = new THREE.InstancedMesh(ivoxGeo, mat, posArr.length);
        const dummy = new THREE.Object3D();
        posArr.forEach((p, i) => {
            dummy.position.set(p[0], p[1], p[2]);
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
        });
        im.instanceMatrix.needsUpdate = true;
        return im;
    }

    const islandGroup = new THREE.Group();
    islandGroup.add(makeIM(grassPos, 0x059669));
    islandGroup.add(makeIM(dirtPos,  0x92400e));
    islandGroup.add(makeIM(stonePos, 0x57534e));
    islandGroup.position.set(0, page === 'bosses' ? -7.8 : -7, page === 'bosses' ? -3.4 : -4);
    islandGroup.scale.setScalar(page === 'bosses' ? 2.45 : 2.2);
    scene.add(islandGroup);

    let ring = null;
    if (page === 'bosses') {
        const ringGeo = new THREE.TorusGeometry(7.4, 0.16, 14, 80);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            emissive: 0xf97316,
            emissiveIntensity: 0.25,
            roughness: 0.3,
            metalness: 0.8
        });
        ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.35;
        ring.position.set(0, 2.4, -4.5);
        scene.add(ring);
    }

    // Parallax de mouse
    const mouse = { x: 0, y: 0 };
    window.addEventListener('mousemove', e => {
        mouse.x = (e.clientX / innerWidth  - 0.5) * 2;
        mouse.y = (e.clientY / innerHeight - 0.5) * 2;
    });

    window.addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
        renderer.setPixelRatio(Math.min(devicePixelRatio, window.innerWidth < 900 ? 1 : 1.5));
    });

    let t = 0;
    let animationActive = true;
    document.addEventListener('visibilitychange', () => {
        animationActive = !document.hidden;
    });

    function animate3d() {
        requestAnimationFrame(animate3d);
        if (!animationActive) return;
        t += 0.008;

        camera.position.x += (mouse.x * 3.5 - camera.position.x) * 0.03;
        camera.position.y += (-mouse.y * 2.5  - camera.position.y) * 0.03;
        camera.lookAt(scene.position);

        cubes.forEach(c => {
            c.mesh.rotation.x += c.rx;
            c.mesh.rotation.y += c.ry;
            c.mesh.position.y  = c.baseY + Math.sin(t + c.floatOff) * c.floatAmp;
        });

        // Brillo pulsante en las luces
        gold.intensity = 7 + Math.sin(t * 0.9) * 2;
        purp.intensity = 5 + Math.sin(t * 1.3 + 1) * 2;
        islandGroup.position.y = (page === 'bosses' ? -7.8 : -7) + Math.sin(t * 0.4) * 0.6;

        // Isla: rotación lenta
        islandGroup.rotation.y += 0.0015;
        if (ring) {
            ring.rotation.z += 0.004;
            ring.position.y = 2.4 + Math.sin(t * 1.1) * 0.18;
        }

        // Animar partículas: avance en Z + wrap
        const pos = partGeo.attributes.position.array;
        for (let i = 0; i < PART_COUNT; i++) {
            const i3 = i * 3;
            pos[i3 + 2] += partSpeeds[i];
            if (pos[i3 + 2] > camera.position.z + 5) {
                pos[i3 + 2] = partBaseZ[i] - 80;
            }
        }
        partGeo.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
    }
    animate3d();
});

function setupTiltPanels() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cards = document.querySelectorAll('.store-card--compact, .boss-codex-card, .boss-guide-card, .prose-card--myth');
    cards.forEach((card) => {
        card.addEventListener('mousemove', (event) => {
            const rect = card.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width;
            const py = (event.clientY - rect.top) / rect.height;
            const rx = (0.5 - py) * 8;
            const ry = (px - 0.5) * 10;
            card.style.transform = `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

function setupBossesExperience() {
    const grid = document.getElementById('boss-codex-grid');
    if (!grid) return;

    const countEl = document.getElementById('bosses-count');
    const totalEl = document.getElementById('bosses-total');
    const naturalEl = document.getElementById('bosses-natural');
    const topDifficultyEl = document.getElementById('bosses-top-difficulty');
    const stepsEl = document.getElementById('summon-steps');
    const noteEl = document.getElementById('summon-note');

    const difficultyClass = (value) => {
        const normalized = (value || '').toLowerCase();
        if (normalized.includes('extrema')) return 'boss-difficulty--extrema';
        if (normalized.includes('media')) return 'boss-difficulty--media-alta';
        return 'boss-difficulty--alta';
    };

    fetch('/api/bosses')
        .then((response) => {
            if (!response.ok) throw new Error('bosses unavailable');
            return response.json();
        })
        .then((catalog) => {
            if (countEl) countEl.textContent = String(catalog.summary.bosses);
            if (totalEl) totalEl.textContent = `${catalog.summary.bosses} entidades míticas activas en el códice`;
            if (naturalEl) naturalEl.textContent = catalog.summary.naturalSpawnEnabled ? 'Activo' : 'Desactivado';
            if (topDifficultyEl) topDifficultyEl.textContent = catalog.summary.topDifficulty;
            if (stepsEl && Array.isArray(catalog.invocation.steps)) {
                stepsEl.innerHTML = catalog.invocation.steps.map((step, index) => `
                    <article class="summon-step">
                        <span>${String(index + 1).padStart(2, '0')}</span>
                        <p>${escapeHtml(step)}</p>
                    </article>
                `).join('');
            }
            if (noteEl) noteEl.textContent = catalog.invocation.note || '';

            grid.innerHTML = catalog.bosses.map((boss) => `
                <article class="boss-codex-card accent-${escapeHtml(boss.accent || 'violet')}">
                    <div class="boss-codex-card__top">
                        <div class="boss-codex-card__title">
                            <h3>${escapeHtml(boss.name)}</h3>
                            <p>${escapeHtml(boss.title)}</p>
                        </div>
                        <span class="boss-difficulty ${difficultyClass(boss.difficulty)}">${escapeHtml(boss.difficulty)}</span>
                    </div>
                    <div class="boss-codex-card__chips">
                        <span class="boss-chip">${escapeHtml(boss.pantheon)}</span>
                        <span class="boss-chip">${escapeHtml(boss.invocationItem)}</span>
                    </div>
                    <div class="boss-codex-card__meta">
                        <p>${escapeHtml(boss.arena)}</p>
                    </div>
                    <div class="boss-codex-card__drops">
                        <strong>Drops confirmados</strong>
                        <ul>${(boss.drops || []).map((drop) => `<li>${escapeHtml(drop)}</li>`).join('')}</ul>
                    </div>
                    <div class="boss-codex-card__reward">
                        <strong>Fantasia del loot</strong>
                        <p>${escapeHtml(boss.rewards)}</p>
                    </div>
                </article>
            `).join('');
            setupTiltPanels();
        })
        .catch(() => {
            grid.innerHTML = '<article class="store-loading-card">No se pudo cargar el códice mítico desde star.</article>';
        });
}

function setupMcStatus() {
    const dot      = document.getElementById('mc-status-dot');
    const label    = document.getElementById('mc-status-label');
    const motdEl   = document.getElementById('mc-status-motd');
    const playersEl= document.getElementById('mc-status-players');
    const verEl    = document.getElementById('mc-status-version');
    const javaHint = document.getElementById('java-status-hint');
    const bedHint  = document.getElementById('bedrock-status-hint');
    if (!dot) return;

    const update = async () => {
        try {
            const res = await fetch('/api/mcstatus');
            if (!res.ok) throw new Error('status error');
            const d = await res.json();
            const j = d.java || {};
            const b = d.bedrock || {};

            if (j.online) {
                dot.className = 'mc-status-dot online';
                label.textContent = 'Servidor EN LÍNEA';
                motdEl.textContent = j.motd ? `"${j.motd}"` : '';
                playersEl.textContent = `${j.players.online} / ${j.players.max} jugadores`;
                verEl.textContent = j.version ? `Java ${j.version}` : '';
                if (javaHint) javaHint.innerHTML = `<span class="live-pulse" style="margin-right:4px;"></span>En línea — ${j.players.online} jugadores conectados`;
            } else {
                dot.className = 'mc-status-dot offline';
                label.textContent = 'Servidor FUERA DE LÍNEA';
                motdEl.textContent = '';
                playersEl.textContent = '';
                verEl.textContent = '';
                if (javaHint) javaHint.textContent = 'El servidor no responde en este momento';
            }

            if (bedHint) {
                bedHint.textContent = b.online
                    ? `Bedrock activo — ${b.players.online} jugadores`
                    : 'Bedrock no responde (Geyser puede estar iniciando)';
            }
        } catch {
            dot.className = 'mc-status-dot';
            label.textContent = 'Estado no disponible';
        }
    };

    update();
    setInterval(update, 60_000);
}

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

    const money = (value, product) => {
        if (product && product.coins) {
            return product.coins.toLocaleString('es-CL') + ' ₯';
        }
        return Number.isFinite(value)
            ? '$' + value.toLocaleString('es-CL') + ' CLP'
            : 'Cotización';
    };

    const productById = (id) => state.catalog.products.find((product) => product.id === id);

    const renderTabs = () => {
        tabs.innerHTML = state.catalog.categories.map((category) => `
            <button type="button" class="tab-btn ${category.id === state.category ? 'active' : ''}" data-store-category="${category.id}">
                <span>${escapeHtml(category.label)}</span>
                <small>${escapeHtml(category.tagline)}</small>
            </button>
        `).join('');
    };

    // Modal de detalle
    let modalProduct = null;
    const modal = document.getElementById('product-modal');
    const modalOverlay = document.getElementById('modal-overlay');

    const openModal = (product) => {
        modalProduct = product;
        const inGameOnly = product.category === 'economy-kits';
        const isSelected = state.selected.has(product.id);
        document.getElementById('modal-badge').textContent = product.badge;
        document.getElementById('modal-badge').className = `rank-badge ${product.featured ? 'monthly' : 'permanent'}`;
        document.getElementById('modal-name').textContent = product.name;
        document.getElementById('modal-summary').textContent = product.summary;
        document.getElementById('modal-price').innerHTML = money(product.clp, product)
            + (Number.isFinite(product.usd) ? `<span>/ USD ${product.usd}</span>` : '')
            + ((product.category === 'monthly' || product.category === 'roles') ? '<span class="modal-period"> · suscripción mensual (30 días)</span>' : '');
        document.getElementById('modal-includes').innerHTML = (product.includes || [])
            .map(i => `<li>${escapeHtml(i)}</li>`).join('');
        const btn = document.getElementById('modal-add-btn');
        if (inGameOnly) {
            btn.textContent = 'Disponible In-Game';
            btn.disabled = true;
            btn.className = 'btn-store btn-store--disabled';
        } else {
            btn.disabled = false;
            btn.className = `btn-store${isSelected ? ' selected' : ''}`;
            btn.textContent = isSelected ? '✓ Seleccionado' : 'Agregar a solicitud';
            btn.onclick = () => {
                if (state.selected.has(product.id)) state.selected.delete(product.id);
                else state.selected.add(product.id);
                renderAll();
                openModal(product);
            };
        }
        modal.hidden = false;
        document.body.classList.add('modal-open');
    };

    const closeModal = () => {
        modal.hidden = true;
        document.body.classList.remove('modal-open');
        modalProduct = null;
    };

    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    document.getElementById('modal-close')?.addEventListener('click', closeModal);

    const renderProducts = () => {
        const products = state.catalog.products.filter((product) => product.category === state.category);
        grid.innerHTML = products.map((product) => {
            const isSelected = state.selected.has(product.id);
            const inGameOnly = product.category === 'economy-kits';
            const priceHtml = money(product.clp, product);
            const usdHtml = Number.isFinite(product.usd) ? `<span class="card-usd">USD ${product.usd}</span>` : '';
            return `
            <article class="store-card store-card--compact ${product.featured ? 'featured' : ''} accent-${product.accent} ${isSelected ? 'is-selected' : ''}">
                <div class="card-top">
                    <span class="rank-badge ${product.featured ? 'monthly' : 'permanent'}">${escapeHtml(product.badge)}</span>
                    ${product.featured ? '<span class="card-star">★</span>' : ''}
                </div>
                <h3 class="card-name">${escapeHtml(product.name)}</h3>
                <p class="card-summary">${escapeHtml(product.summary)}</p>
                <div class="card-price">${priceHtml}${usdHtml}${(product.category === 'monthly' || product.category === 'roles') ? '<span class="card-period">/mes · 30 días</span>' : ''}</div>
                <div class="card-actions">
                    <button type="button" class="btn-detail" data-detail-id="${product.id}">Ver detalles</button>
                    ${inGameOnly
                        ? `<button type="button" class="btn-store btn-store--disabled" disabled>In-Game</button>`
                        : `<button type="button" class="btn-store btn-add ${isSelected ? 'selected' : ''}" data-product-id="${product.id}">
                            ${isSelected ? '✓' : '+'}
                           </button>`
                    }
                </div>
            </article>`;
        }).join('');

        grid.querySelectorAll('[data-detail-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = state.catalog.products.find(x => x.id === btn.dataset.detailId);
                if (p) openModal(p);
            });
        });
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
                <strong>${money(product.clp, product)}</strong>
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
        const submitButton = quoteForm.querySelector('button[type="submit"]');
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
        const allTebex = selectedProducts.length > 0 && selectedProducts.every((product) => product.tebexEnabled);

        try {
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Procesando...';
            }

            if (allTebex) {
                const response = await fetch('/api/store/tebex/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'tebex checkout failed');
                if (result) {
                    result.hidden = false;
                    result.innerHTML = `
                        <strong>Checkout ${escapeHtml(data.quoteId)} listo.</strong>
                        <div class="store-payment-options" style="display:flex;flex-direction:column;gap:8px;margin:1.25rem 0 0.75rem 0;">
                            <a class="btn-paypal" href="${escapeHtml(data.init_point)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;justify-content:center;width:100%;margin-bottom:8px;">
                                Ir a Tebex Checkout (USD $${data.total_usd})
                            </a>
                        </div>
                        <p style="font-size:0.82rem;opacity:0.72;margin:0;">Tebex procesará el pago y el delivery automático lo ejecutará desde la cola oficial.</p>
                    `;
                }
                showToast('Checkout Tebex generado.');
                window.open(data.init_point, '_blank', 'noopener');
                return;
            }

            const response = await fetch('/api/store/quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('quote failed');
            const data = await response.json();
            if (result) {
                result.hidden = false;
                result.innerHTML = `
                    <strong>Solicitud ${escapeHtml(data.quoteId)} lista.</strong>
                    <details open style="margin-top:0.75rem">
                        <summary style="cursor:pointer;font-size:0.85rem;opacity:0.7">Abrir ticket manual en Discord</summary>
                        <textarea readonly rows="7" style="margin-top:0.5rem">${escapeHtml(data.ticketMessage)}</textarea>
                        <a class="btn-discord" href="${escapeHtml(data.discordUrl)}" target="_blank" rel="noopener" style="width:100%;justify-content:center;margin-top:0.5rem;">Abrir Discord</a>
                    </details>
                `;
            }
            showToast('Solicitud manual generada.');
        } catch (error) {
            console.error('checkout error', error);
            if (result) {
                result.hidden = false;
                result.innerHTML = '<strong>No se pudo generar el checkout.</strong><p style="margin:0.75rem 0 0 0;opacity:0.78;">Intenta nuevamente. Si persiste, abre ticket en Discord.</p>';
            }
            showToast('No se pudo generar el checkout.');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Generar checkout';
            }
        }
    });

    fetch('/api/store')
        .then((response) => {
            if (!response.ok) throw new Error('store unavailable');
            return response.json();
        })
        .then((catalog) => {
            state.catalog = catalog;
            document.getElementById('store-health').textContent = 'Catálogo y checkout online';
            document.getElementById('store-product-count').textContent = catalog.summary.products.toLocaleString('es-CL');
            document.getElementById('store-min-price').textContent = money(catalog.summary.minPrice);
            document.getElementById('store-max-price').textContent = money(catalog.summary.maxPrice);
            document.getElementById('store-updated').textContent = 'Actualizado ' + catalog.updatedAt;
            renderAll();

            // Detección de retorno de pago en la URL
            const urlParams = new URLSearchParams(window.location.search);
            const paymentStatus = urlParams.get('payment');

            if (paymentStatus === 'tebex-success') {
                showToast('Pago completado en Tebex. El delivery automático procesará tu compra.');
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (paymentStatus === 'tebex-cancel') {
                showToast('El checkout de Tebex fue cancelado.');
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        })
        .catch(() => {
            grid.innerHTML = '<article class="store-loading-card">La tienda no está disponible temporalmente.</article>';
            document.getElementById('store-health').textContent = 'Sin conexión';
        });
}
