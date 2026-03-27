/* ═══════════════════════════════════════════
   DARK MODE TOGGLE
   Persists to localStorage, respects system preference
   ═══════════════════════════════════════════ */
function getPreferredTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return 'light';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Update particle canvas hint (for particle recolor)
    const particleCanvas = document.getElementById('particleCanvas');
    if (particleCanvas) {
        particleCanvas.dataset.theme = theme;
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

// Apply theme immediately on load (before paint)
applyTheme(getPreferredTheme());

// Listen for system preference changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
    }
});

// Bind toggle button — defer scripts run after DOM is parsed, so it's already available
(function bindToggle() {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleTheme);
    } else {
        // Fallback: if somehow called before DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            const btn = document.getElementById('themeToggle');
            if (btn) btn.addEventListener('click', toggleTheme);
        });
    }
})();

/* ═══════════════════════════════════════════
   THREE.JS 3D BACKGROUND — Floating Clay Shapes
   Full-screen ambient 3D scene with soft matte
   geometric objects drifting behind content
   ═══════════════════════════════════════════ */
function init3DBackground() {
    const canvas = document.getElementById('bg3DCanvas');
    if (!canvas || typeof THREE === 'undefined') {
        if (typeof THREE === 'undefined') {
            if (document.readyState === 'complete') {
                setTimeout(init3DBackground, 100);
            } else {
                window.addEventListener('load', init3DBackground);
            }
            return;
        }
        return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // ── Warm Clay Colors ──
    const palette = [
        0xe07a5f, // terracotta
        0x7c6aef, // violet
        0x81b29a, // sage
        0xf2cc8f, // amber
        0xf2a891, // light terracotta
        0xa594f9, // light violet
        0xadd4c0, // light sage
        0xf5e0c3, // cream
    ];

    // ── Create floating shapes ──
    const shapes = [];
    const shapeCount = 18;

    const geometries = [
        () => new THREE.IcosahedronGeometry(1, 0),
        () => new THREE.OctahedronGeometry(1, 0),
        () => new THREE.TorusGeometry(1, 0.4, 16, 32),
        () => new THREE.TorusKnotGeometry(0.8, 0.3, 64, 16),
        () => new THREE.SphereGeometry(1, 32, 32),
        () => new THREE.DodecahedronGeometry(1, 0),
        () => new THREE.CylinderGeometry(0.6, 0.6, 1.2, 6),
        () => new THREE.BoxGeometry(1.2, 1.2, 1.2),
    ];

    for (let i = 0; i < shapeCount; i++) {
        const geoFn = geometries[Math.floor(Math.random() * geometries.length)];
        const geo = geoFn();

        const color = palette[Math.floor(Math.random() * palette.length)];
        const isMatte = Math.random() > 0.3;

        const mat = new THREE.MeshPhysicalMaterial({
            color: color,
            roughness: isMatte ? 0.65 + Math.random() * 0.2 : 0.4 + Math.random() * 0.15,
            metalness: 0.02,
            transparent: true,
            opacity: 0.45 + Math.random() * 0.35,
            clearcoat: 0.15,
            clearcoatRoughness: 0.6,
            envMapIntensity: 0.3,
            side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geo, mat);

        // Scatter across viewport — use spherical distribution for depth
        const spread = 45;
        const x = (Math.random() - 0.5) * spread;
        const y = (Math.random() - 0.5) * spread * 0.7;
        const z = (Math.random() - 0.5) * 30 - 5;

        const scale = 0.4 + Math.random() * 1.8;
        mesh.scale.set(scale, scale, scale);
        mesh.position.set(x, y, z);
        mesh.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );

        mesh.castShadow = true;

        mesh.userData = {
            baseX: x,
            baseY: y,
            baseZ: z,
            rotSpeedX: (Math.random() - 0.5) * 0.008,
            rotSpeedY: (Math.random() - 0.5) * 0.008,
            rotSpeedZ: (Math.random() - 0.5) * 0.004,
            floatPhase: Math.random() * Math.PI * 2,
            floatSpeed: 0.15 + Math.random() * 0.3,
            floatAmplitude: 0.3 + Math.random() * 0.8,
            driftX: (Math.random() - 0.5) * 0.003,
            driftY: (Math.random() - 0.5) * 0.002,
            scale: scale,
        };

        shapes.push(mesh);
        scene.add(mesh);
    }

    // ── Lighting — soft, diffuse studio ──
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(10, 15, 20);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f0ff, 0.4);
    fillLight.position.set(-10, -5, 10);
    scene.add(fillLight);

    const warmAccent = new THREE.PointLight(0xe07a5f, 0.5, 60);
    warmAccent.position.set(-15, 10, 5);
    scene.add(warmAccent);

    const violetAccent = new THREE.PointLight(0x7c6aef, 0.3, 60);
    violetAccent.position.set(15, -10, 5);
    scene.add(violetAccent);

    const sageAccent = new THREE.PointLight(0x81b29a, 0.25, 60);
    sageAccent.position.set(0, 15, -5);
    scene.add(sageAccent);

    // ── Mouse tracking for parallax ──
    let mouseX = 0, mouseY = 0;
    let targetMouseX = 0, targetMouseY = 0;

    document.addEventListener('mousemove', (e) => {
        targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // ── Scroll parallax ──
    let scrollY = 0;
    window.addEventListener('scroll', () => {
        scrollY = window.scrollY;
    });

    // ── Animation loop ──
    function animate() {
        requestAnimationFrame(animate);
        const t = Date.now() * 0.001;

        // Smooth mouse follow
        mouseX += (targetMouseX - mouseX) * 0.03;
        mouseY += (targetMouseY - mouseY) * 0.03;

        // Camera reacts to mouse
        camera.position.x += (mouseX * 2 - camera.position.x) * 0.02;
        camera.position.y += (-mouseY * 1.5 - camera.position.y) * 0.02;
        camera.lookAt(0, 0, 0);

        // Scroll-based vertical offset
        const scrollOffset = scrollY * 0.008;

        shapes.forEach(shape => {
            const d = shape.userData;

            // Gentle rotation
            shape.rotation.x += d.rotSpeedX;
            shape.rotation.y += d.rotSpeedY;
            shape.rotation.z += d.rotSpeedZ;

            // Floating bob
            const floatY = Math.sin(t * d.floatSpeed + d.floatPhase) * d.floatAmplitude;
            const floatX = Math.cos(t * d.floatSpeed * 0.7 + d.floatPhase) * d.floatAmplitude * 0.4;

            // Slow drift
            shape.position.x = d.baseX + floatX + Math.sin(t * 0.05 + d.floatPhase) * 2;
            shape.position.y = d.baseY + floatY - scrollOffset;
            shape.position.z = d.baseZ + Math.sin(t * d.floatSpeed * 0.3 + d.floatPhase) * 0.5;

            // Subtle scale breathing
            const breathe = 1 + Math.sin(t * 0.4 + d.floatPhase) * 0.04;
            const s = d.scale * breathe;
            shape.scale.set(s, s, s);
        });

        renderer.render(scene, camera);
    }
    animate();

    // ── Resize ──
    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);
}
init3DBackground();

/* ═══════════════════════════════════════════
   PARTICLE SYSTEM
   ═══════════════════════════════════════════ */
const particleCanvas = document.getElementById('particleCanvas');
if (!particleCanvas) { console.warn('particleCanvas not found'); } else {
const ctx = particleCanvas.getContext('2d');
let particles = [];
let mouse = { x: -1000, y: -1000 };
let animFrame;

function getParticleStyle() {
    const s = getComputedStyle(document.documentElement);
    return {
        color: s.getPropertyValue('--particle-color').trim(),
        alpha: parseFloat(s.getPropertyValue('--particle-alpha')) || 0.25,
        lineAlpha: parseFloat(s.getPropertyValue('--particle-line-alpha')) || 0.06
    };
}

function resizeCanvas() {
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
}

function createParticles() {
    particles = [];
    const count = Math.min(80, Math.floor((particleCanvas.width * particleCanvas.height) / 18000));
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * particleCanvas.width,
            y: Math.random() * particleCanvas.height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            r: Math.random() * 2 + 1,
            baseAlpha: Math.random() * 0.5 + 0.3
        });
    }
}

function drawParticles() {
    ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    const style = getParticleStyle();
    const maxDist = 150;
    const mouseDist = 200;

    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseDist) {
            const force = (mouseDist - dist) / mouseDist * 0.015;
            p.vx += dx * force;
            p.vy += dy * force;
        }

        // Dampen velocity
        p.vx *= 0.99;
        p.vy *= 0.99;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < -10) p.x = particleCanvas.width + 10;
        if (p.x > particleCanvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = particleCanvas.height + 10;
        if (p.y > particleCanvas.height + 10) p.y = -10;

        // Draw particle
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 1.5);
        gradient.addColorStop(0, `rgba(${style.color}, ${p.baseAlpha * style.alpha * 1.2})`);
        gradient.addColorStop(1, `rgba(${style.color}, 0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const cdx = p.x - p2.x;
            const cdy = p.y - p2.y;
            const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
            if (cdist < maxDist) {
                const opacity = (1 - cdist / maxDist) * style.lineAlpha;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(${style.color}, ${opacity})`;
                ctx.lineWidth = 0.6;
                ctx.stroke();
            }
        }
    }

    animFrame = requestAnimationFrame(drawParticles);
}

window.addEventListener('resize', () => {
    resizeCanvas();
    createParticles();
});

document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

document.addEventListener('mouseleave', () => {
    mouse.x = -1000;
    mouse.y = -1000;
});

resizeCanvas();
createParticles();
drawParticles();
} // end particleCanvas else block

/* ═══════════════════════════════════════════
   CURSOR GLOW
   ═══════════════════════════════════════════ */
const glow = document.getElementById('cursorGlow');
if (glow) {
    let glowVisible = false;
    let glowX = 0, glowY = 0, currentGlowX = 0, currentGlowY = 0;

    document.addEventListener('mousemove', (e) => {
        glowX = e.clientX;
        glowY = e.clientY;
        if (!glowVisible) {
            glow.style.opacity = '1';
            glowVisible = true;
        }
    });

    document.addEventListener('mouseleave', () => {
        glow.style.opacity = '0';
        glowVisible = false;
    });

    // Smooth glow follow
    function updateGlow() {
        currentGlowX += (glowX - currentGlowX) * 0.08;
        currentGlowY += (glowY - currentGlowY) * 0.08;
        glow.style.left = currentGlowX + 'px';
        glow.style.top = currentGlowY + 'px';
        requestAnimationFrame(updateGlow);
    }
    updateGlow();
}

/* ═══════════════════════════════════════════
   MOBILE NAV
   ═══════════════════════════════════════════ */
function toggleNav() {
    document.getElementById('navLinks').classList.toggle('open');
    document.getElementById('hamburger').classList.toggle('open');
}

function closeNav() {
    document.getElementById('navLinks').classList.remove('open');
    document.getElementById('hamburger').classList.remove('open');
}

/* ═══════════════════════════════════════════
   PROJECT FILTERING
   ═══════════════════════════════════════════ */
function filterProjects(category, btn) {
    document.querySelectorAll('.projects-nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('#projectsGrid .project-card').forEach((card, i) => {
        if (category === 'all' || card.dataset.category === category) {
            card.style.display = '';
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, i * 60);
        } else {
            card.style.display = 'none';
        }
    });
}

const projectsNav = document.querySelector('.projects-nav');
if (projectsNav) {
    projectsNav.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-filter]');
        if (btn) filterProjects(btn.dataset.filter, btn);
    });
}

/* ═══════════════════════════════════════════
   SCROLL REVEAL
   ═══════════════════════════════════════════ */
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ═══════════════════════════════════════════
   COUNTER ANIMATION
   ═══════════════════════════════════════════ */
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.querySelectorAll('.stat-number').forEach(num => {
                const target = parseInt(num.dataset.target);
                if (isNaN(target)) return; // static text like "Many" — skip animation
                const duration = 1800;
                const start = performance.now();

                function update(now) {
                    const elapsed = now - start;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 4);
                    const current = Math.round(eased * target);
                    num.textContent = current >= 1000 ? current.toLocaleString() : current;
                    if (progress < 1) requestAnimationFrame(update);
                }

                requestAnimationFrame(update);
            });
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stats').forEach(el => counterObserver.observe(el));

/* ═══════════════════════════════════════════
   MAGNETIC BUTTONS
   ═══════════════════════════════════════════ */
document.querySelectorAll('.magnetic').forEach(el => {
    const strength = parseInt(el.dataset.strength) || 15;

    el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width * strength;
        const dy = (e.clientY - cy) / rect.height * strength;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
    });

    el.addEventListener('mouseleave', () => {
        el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        el.style.transform = 'translate(0, 0)';
        setTimeout(() => { el.style.transition = ''; }, 500);
    });
});

/* ═══════════════════════════════════════════
   3D TILT CARDS (Clay feel)
   ═══════════════════════════════════════════ */
document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rotateX = ((y - cy) / cy) * -4;
        const rotateY = ((x - cx) / cx) * 4;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.6s ease';
        card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0) scale(1)';
        setTimeout(() => { card.style.transition = ''; }, 600);
    });
});

/* ═══════════════════════════════════════════
   SMOOTH SCROLL
   ═══════════════════════════════════════════ */
function scrollToSection(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

/* ═══════════════════════════════════════════
   NAV SCROLL EFFECT
   ═══════════════════════════════════════════ */
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    const current = window.scrollY;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (current > 100) {
        nav.style.boxShadow = isDark
            ? '8px 8px 18px rgba(0,0,0,0.4), -4px -4px 12px rgba(255,255,255,0.03), inset 0 -2px 4px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.04)'
            : '10px 10px 20px rgba(0,0,0,0.1), -5px -5px 14px rgba(255,255,255,0.95), inset 0 -2px 4px rgba(0,0,0,0.03), inset 0 2px 4px rgba(255,255,255,0.8)';
    } else {
        nav.style.boxShadow = '';
    }
    lastScroll = current;
});

/* ═══════════════════════════════════════════
   EASTER EGG: Konami Code
   ═══════════════════════════════════════════ */
let konamiIndex = 0;
const konamiCode = [38,38,40,40,37,39,37,39,66,65]; // up up down down left right left right b a
document.addEventListener('keydown', (e) => {
    if (e.keyCode === konamiCode[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
            konamiIndex = 0;
            document.body.style.transition = 'filter 1s';
            document.body.style.filter = 'hue-rotate(180deg)';
            setTimeout(() => {
                document.body.style.filter = '';
            }, 3000);
        }
    } else {
        konamiIndex = 0;
    }
});
