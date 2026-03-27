/* ═══════════════════════════════════════════
   PARTICLE SYSTEM
   ═══════════════════════════════════════════ */
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
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
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function createParticles() {
    particles = [];
    const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 18000));
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            r: Math.random() * 2 + 1,
            baseAlpha: Math.random() * 0.5 + 0.3
        });
    }
}

function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

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

/* ═══════════════════════════════════════════
   CURSOR GLOW
   ═══════════════════════════════════════════ */
const glow = document.getElementById('cursorGlow');
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

/* ═══════════════════════════════════════════
   THEME TOGGLE
   ═══════════════════════════════════════════ */
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);

    document.getElementById('sunIcon').style.display = next === 'light' ? '' : 'none';
    document.getElementById('moonIcon').style.display = next === 'dark' ? '' : 'none';
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
                const duration = 1800;
                const start = performance.now();

                function update(now) {
                    const elapsed = now - start;
                    const progress = Math.min(elapsed / duration, 1);
                    // Ease out expo
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
   3D TILT CARDS
   ═══════════════════════════════════════════ */
document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rotateX = ((y - cy) / cy) * -5;
        const rotateY = ((x - cx) / cx) * 5;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0)';
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
    if (current > 100) {
        nav.style.boxShadow = '0 4px 30px rgba(0,0,0,0.06)';
    } else {
        nav.style.boxShadow = 'none';
    }
    lastScroll = current;
});