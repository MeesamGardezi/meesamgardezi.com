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
   BACKGROUND — hex grid + large hexes + mouse glow
   ═══════════════════════════════════════════ */
(function initBackground() {
    const canvas = document.getElementById('hexCanvas');
    const ctx    = canvas ? canvas.getContext('2d') : null;
    if (!canvas || !ctx) return;

    const BASE_R   = 24;          // resting hex circumradius
    const MAX_GROW = 10;          // max extra radius near cursor
    const INFLUENCE = 120;        // px — cursor influence radius
    const cW = BASE_R * Math.sqrt(3);
    const rH = BASE_R * 1.5;

    let W = window.innerWidth, H = window.innerHeight;
    let mouseX = -9999, mouseY = -9999;

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

    // Pointy-top hex path
    function hexPath(cx, cy, r) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = Math.PI / 180 * (60 * i - 30);
            i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
                    : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
        }
        ctx.closePath();
    }

    function frame() {
        ctx.clearRect(0, 0, W, H);

        const cols = Math.ceil(W / cW) + 2;
        const rows = Math.ceil(H / rH) + 2;

        for (let row = -1; row < rows; row++) {
            for (let col = -1; col < cols; col++) {
                const cx = cW * col + (row & 1 ? cW / 2 : 0);
                const cy = rH * row;

                // Proximity factor: smoothstep falloff
                const dist = Math.hypot(mouseX - cx, mouseY - cy);
                const t = Math.max(0, 1 - dist / INFLUENCE);
                const smooth = t * t * (3 - 2 * t); // smoothstep

                const r = BASE_R - 1 + MAX_GROW * smooth;
                const opacity = 0.055 + 0.30 * smooth;

                ctx.strokeStyle = smooth > 0.01
                    ? `rgba(224,122,95,${opacity})`
                    : 'rgba(0,0,0,0.055)';
                ctx.lineWidth = 0.6 + smooth * 1.4;

                hexPath(cx, cy, r);
                ctx.stroke();
            }
        }

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // ── Mouse glow ──
    const glow = document.getElementById('bgMouseGlow');
    if (!glow) return;
    let glowX = W / 2, glowY = H / 2;
    let curX = glowX, curY = glowY;
    let glowVisible = false;

    document.addEventListener('mousemove', e => {
        glowX = e.clientX; glowY = e.clientY;
        if (!glowVisible) { glow.style.opacity = '1'; glowVisible = true; }
    });
    document.addEventListener('mouseleave', () => { glow.style.opacity = '0'; glowVisible = false; });
    (function glowAnimate() {
        curX += (glowX - curX) * 0.06;
        curY += (glowY - curY) * 0.06;
        glow.style.left = curX + 'px';
        glow.style.top  = curY + 'px';
        requestAnimationFrame(glowAnimate);
    })();
})();

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
   CUSTOM CURSOR
   ═══════════════════════════════════════════ */
(function initCursor() {
    const label = document.getElementById('cursorLabel');
    if (!label) return;
    if (window.matchMedia('(hover: none)').matches) return;

    let visible = false;

    document.addEventListener('mousemove', (e) => {
        label.style.left = e.clientX + 'px';
        label.style.top  = e.clientY + 'px';
        if (!visible) {
            label.style.opacity = '1';
            visible = true;
        }
    });

    document.addEventListener('mouseleave', () => {
        label.style.opacity = '0';
        visible = false;
    });

    const hoverTargets = 'a, button, [role="button"], input, textarea, select, label, .magnetic, .project-card, .tilt-card';
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest(hoverTargets)) {
            document.body.classList.add('cursor-hover');
        }
    });
    document.addEventListener('mouseout', (e) => {
        if (e.target.closest(hoverTargets)) {
            document.body.classList.remove('cursor-hover');
        }
    });
})();

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
