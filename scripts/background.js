(() => {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas || !window.THREE || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const compact = window.innerWidth < 900 || navigator.connection?.saveData;
    const THREE = window.THREE;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !compact, powerPreference: 'low-power' });
    const page = document.body.dataset.page || 'index';
    const bossPage = page === 'bosses';
    const colors = bossPage ? [0xef4444, 0xf59e0b, 0x8b5cf6, 0x38bdf8] : [0xf4c95d, 0x79d7ff, 0x9588ff, 0x64f2bf];
    const cubes = [];
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);

    renderer.setPixelRatio(Math.min(devicePixelRatio, compact ? 1 : 1.5));
    renderer.setSize(innerWidth, innerHeight);
    camera.position.z = 28;
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));

    colors.forEach((color, index) => {
        const light = new THREE.PointLight(color, 4, 55);
        light.position.set(index % 2 ? 12 : -12, index < 2 ? 8 : -8, 14);
        scene.add(light);
    });

    const cubeTotal = compact ? 18 : 46;
    for (let index = 0; index < cubeTotal; index += 1) {
        const material = new THREE.MeshStandardMaterial({
            color: colors[index % colors.length],
            roughness: 0.55,
            metalness: 0.3,
            transparent: true,
            opacity: 0.78
        });
        const cube = new THREE.Mesh(cubeGeometry, material);
        cube.position.set((Math.random() - 0.5) * 46, (Math.random() - 0.5) * 28, -Math.random() * 35);
        cube.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        cube.scale.setScalar(0.25 + Math.random() * 0.9);
        scene.add(cube);
        cubes.push({ cube, speed: 0.001 + Math.random() * 0.003, baseY: cube.position.y, phase: Math.random() * Math.PI * 2 });
    }

    const points = new Float32Array((compact ? 100 : 280) * 3);
    for (let index = 0; index < points.length; index += 3) {
        points[index] = (Math.random() - 0.5) * 80;
        points[index + 1] = (Math.random() - 0.5) * 48;
        points[index + 2] = -Math.random() * 55;
    }
    const stars = new THREE.BufferGeometry();
    stars.setAttribute('position', new THREE.BufferAttribute(points, 3));
    scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xffffff, size: 0.16, transparent: true, opacity: 0.75 })));

    const pointer = { x: 0, y: 0 };
    window.addEventListener('pointermove', (event) => {
        pointer.x = (event.clientX / innerWidth - 0.5) * 2;
        pointer.y = (event.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
    window.addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(devicePixelRatio, window.innerWidth < 900 ? 1 : 1.5));
        renderer.setSize(innerWidth, innerHeight);
    });

    let tick = 0;
    const render = () => {
        tick += 0.01;
        camera.position.x += (pointer.x * 1.8 - camera.position.x) * 0.025;
        camera.position.y += (-pointer.y * 1.1 - camera.position.y) * 0.025;
        camera.lookAt(scene.position);
        cubes.forEach(({ cube, speed, baseY, phase }) => {
            cube.rotation.x += speed;
            cube.rotation.y += speed * 1.4;
            cube.position.y = baseY + Math.sin(tick + phase) * 0.45;
        });
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    };
    render();
})();
