// ===== Performance Optimization: Reduce Particles =====
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particlesArray = [];
// Reduced from 100 to 30 for better performance
const numberOfParticles = window.innerWidth < 768 ? 15 : 30;

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = Math.random() * 1.5 - 0.75;
        this.speedY = Math.random() * 1.5 - 0.75;
        this.opacity = Math.random() * 0.4 + 0.2;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
        if (this.y > canvas.height || this.y < 0) this.speedY *= -1;
    }

    draw() {
        ctx.fillStyle = `rgba(214, 0, 111, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initParticles() {
    particlesArray = [];
    for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();

        // Connect particles - reduced connection distance for performance
        for (let j = i; j < particlesArray.length; j++) {
            const dx = particlesArray[i].x - particlesArray[j].x;
            const dy = particlesArray[i].y - particlesArray[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 80) {
                ctx.strokeStyle = `rgba(214, 0, 111, ${0.15 * (1 - distance / 80)})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
                ctx.stroke();
            }
        }
    }

    requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

// Resize handler with debounce for performance
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles();
    }, 250);
});

// ===== Preloader =====
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    setTimeout(() => {
        preloader.classList.add('hidden');
        setTimeout(() => preloader.remove(), 500);
    }, 2000);
});

// ===== Scroll Progress Indicator =====
const scrollProgress = document.getElementById('scrollProgress');

function updateScrollProgress() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercentage = (scrollTop / scrollHeight);

    scrollProgress.style.transform = `scaleX(${scrollPercentage})`;
}

// Throttle scroll events for performance
let scrollTimeout;
window.addEventListener('scroll', () => {
    if (!scrollTimeout) {
        scrollTimeout = setTimeout(() => {
            updateScrollProgress();
            scrollTimeout = null;
        }, 10);
    }
});

// ===== Smooth Scrolling =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ===== Navbar Scroll Effect =====
const navbar = document.querySelector('.nav-bar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// ===== Typing Effect =====
const typingText = document.querySelector('.typing-text');
const text = 'Future-Driven Creator & Innovator';
let index = 0;

function typeWriter() {
    if (index < text.length) {
        typingText.textContent = text.substring(0, index + 1);
        index++;
        setTimeout(typeWriter, 100);
    }
}

setTimeout(typeWriter, 1000);

// ===== Counter Animation =====
const counters = document.querySelectorAll('.stat-value');
const speed = 50;

const animateCounter = (counter) => {
    const target = +counter.getAttribute('data-target');
    const increment = target / speed;
    let current = 0;

    const updateCounter = () => {
        current += increment;
        if (current < target) {
            counter.textContent = Math.ceil(current);
            setTimeout(updateCounter, 20);
        } else {
            counter.textContent = target;
        }
    };

    updateCounter();
};

// ===== Intersection Observer for Animations =====
const observerOptions = {
    threshold: 0.3,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Animate counters
            if (entry.target.classList.contains('stats-container')) {
                counters.forEach(counter => animateCounter(counter));
            }

            // Animate skills
            if (entry.target.classList.contains('skills-section')) {
                const skills = document.querySelectorAll('.skill-item');
                skills.forEach((skill, index) => {
                    setTimeout(() => {
                        skill.classList.add('animate');
                        const progress = skill.querySelector('.skill-progress');
                        const targetWidth = progress.getAttribute('data-progress');
                        progress.style.width = targetWidth + '%';
                    }, index * 200);
                });
            }

            // Animate cards
            if (entry.target.classList.contains('glass-card')) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(50px)';
                setTimeout(() => {
                    entry.target.style.transition = 'all 0.6s ease';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
            }
        }
    });
}, observerOptions);

// Observe elements
document.querySelector('.stats-container') && observer.observe(document.querySelector('.stats-container'));
document.querySelector('.skills-section') && observer.observe(document.querySelector('.skills-section'));
document.querySelectorAll('.glass-card').forEach(card => observer.observe(card));

// ===== Button Click Effects =====
document.getElementById('exploreBtn')?.addEventListener('click', () => {
    document.querySelector('#about').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('contactBtn')?.addEventListener('click', () => {
    document.querySelector('#contact').scrollIntoView({ behavior: 'smooth' });
});

// ===== Scroll to Top Button =====
const scrollToTopBtn = document.getElementById('scrollToTop');

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollToTopBtn.classList.add('visible');
    } else {
        scrollToTopBtn.classList.remove('visible');
    }
});

scrollToTopBtn?.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// ===== Portfolio Filter =====
const filterBtns = document.querySelectorAll('.filter-btn');
const portfolioCards = document.querySelectorAll('.portfolio-card');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.getAttribute('data-filter');

        portfolioCards.forEach(card => {
            const category = card.getAttribute('data-category');

            if (filter === 'all' || category === filter) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    });
});

// ===== Parallax Effect (Light version for performance) =====
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const cube = document.querySelector('.cube-container');

    if (cube && window.innerWidth > 768) {
        // Only apply on desktop
        cube.style.transform = `translateY(${scrolled * 0.2}px)`;
    }
});

// ===== Form Submission =====
const form = document.querySelector('.contact-form');
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get form values
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;

        // Simple validation
        if (name && email && message) {
            // Create success message
            const successMsg = document.createElement('div');
            successMsg.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #d6006f, #c9004d);
                color: white;
                padding: 2rem 3rem;
                border-radius: 20px;
                font-size: 1.2rem;
                z-index: 10000;
                box-shadow: 0 20px 60px rgba(214, 0, 111, 0.6);
                animation: slideIn 0.5s ease;
            `;
            successMsg.textContent = 'Message sent successfully! 🎉';
            document.body.appendChild(successMsg);

            // Reset form
            form.reset();

            // Remove message after 3 seconds
            setTimeout(() => {
                successMsg.style.animation = 'slideOut 0.5s ease';
                setTimeout(() => successMsg.remove(), 500);
            }, 3000);
        }
    });
}

// Add CSS animations for success message
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translate(-50%, -60%);
        }
        to {
            opacity: 1;
            transform: translate(-50%, -50%);
        }
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translate(-50%, -50%);
        }
        to {
            opacity: 0;
            transform: translate(-50%, -40%);
        }
    }
`;
document.head.appendChild(style);

// ===== Optimized Cursor Trail Effect (Mobile-Disabled) =====
if (window.innerWidth > 768) {
    let mouseX = 0;
    let mouseY = 0;
    const trail = [];
    const trailLength = 5; // Reduced from 10 for performance

    for (let i = 0; i < trailLength; i++) {
        const dot = document.createElement('div');
        dot.style.cssText = `
            position: fixed;
            width: ${8 - i}px;
            height: ${8 - i}px;
            background: rgba(214, 0, 111, ${0.8 - i / trailLength});
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            transition: all 0.15s ease;
        `;
        document.body.appendChild(dot);
        trail.push(dot);
    }

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        trail.forEach((dot, index) => {
            setTimeout(() => {
                dot.style.left = mouseX + 'px';
                dot.style.top = mouseY + 'px';
            }, index * 30);
        });
    });
}

// ===== Glitch Effect on Hover (Optimized) =====
const glitchTitle = document.querySelector('.glitch');
let glitchInterval;

if (glitchTitle) {
    glitchTitle.addEventListener('mouseenter', () => {
        let count = 0;
        glitchInterval = setInterval(() => {
            glitchTitle.style.textShadow = `
                ${Math.random() * 10 - 5}px ${Math.random() * 10 - 5}px 0 #d6006f,
                ${Math.random() * 10 - 5}px ${Math.random() * 10 - 5}px 0 #00ffff
            `;
            count++;
            if (count > 10) clearInterval(glitchInterval); // Auto-stop after 10 iterations
        }, 50);
    });

    glitchTitle.addEventListener('mouseleave', () => {
        clearInterval(glitchInterval);
        glitchTitle.style.textShadow = 'none';
    });
}

// ===== Page Load Animation =====
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
});

console.log('%c🚀 เทพเต๋า Portfolio | Designed with ❤️', 'color: #d6006f; font-size: 20px; font-weight: bold;');
