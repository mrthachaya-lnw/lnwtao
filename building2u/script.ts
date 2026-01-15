(() => {
    type SliderElements = {
        root: HTMLElement;
        viewport: HTMLElement;
        track: HTMLElement;
        slides: HTMLElement[];
        prevBtn: HTMLButtonElement;
        nextBtn: HTMLButtonElement;
        dotsRoot: HTMLElement;
    };

    type SliderState = {
        index: number;
        isDragging: boolean;
        startX: number;
        deltaX: number;
        autoTimer: number | null;
    };

    function qs<T extends Element>(root: ParentNode, selector: string): T {
        const el = root.querySelector(selector);
        if (!el) throw new Error(`Missing element: ${selector}`);
        return el as T;
    }

    function qsa<T extends Element>(root: ParentNode, selector: string): T[] {
        return Array.from(root.querySelectorAll(selector)) as T[];
    }

    function clampIndex(index: number, count: number): number {
        if (count <= 0) return 0;
        const mod = index % count;
        return mod < 0 ? mod + count : mod;
    }

    function setNavOpen(nav: HTMLElement, toggleBtn: HTMLButtonElement, open: boolean) {
        nav.classList.toggle('is-open', open);
        toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function initMobileNav() {
        const toggleBtn = document.querySelector<HTMLButtonElement>('.nav-toggle');
        const nav = document.querySelector<HTMLElement>('.nav');

        if (!toggleBtn || !nav) return;

        toggleBtn.addEventListener('click', () => {
            const isOpen = nav.classList.contains('is-open');
            setNavOpen(nav, toggleBtn, !isOpen);
        });

        nav.addEventListener('click', (e) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            if (target.matches('a[href^="#"]')) {
                setNavOpen(nav, toggleBtn, false);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                setNavOpen(nav, toggleBtn, false);
            }
        });
    }

    function buildSliderElements(root: HTMLElement): SliderElements {
        const viewport = qs<HTMLElement>(root, '[data-slider-viewport]');
        const track = qs<HTMLElement>(root, '[data-slider-track]');
        const slides = qsa<HTMLElement>(root, '[data-slide]');
        const prevBtn = qs<HTMLButtonElement>(root, '[data-slider-prev]');
        const nextBtn = qs<HTMLButtonElement>(root, '[data-slider-next]');
        const dotsRoot = qs<HTMLElement>(root, '[data-slider-dots]');

        return { root, viewport, track, slides, prevBtn, nextBtn, dotsRoot };
    }

    function renderDots(el: SliderElements, state: SliderState) {
        el.dotsRoot.innerHTML = '';

        el.slides.forEach((_, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'dot';
            btn.setAttribute('aria-label', `ไปที่รูปที่ ${i + 1}`);
            btn.setAttribute('aria-current', i === state.index ? 'true' : 'false');
            btn.addEventListener('click', () => {
                goTo(el, state, i, true);
            });
            el.dotsRoot.appendChild(btn);
        });
    }

    function applyTransform(el: SliderElements, state: SliderState) {
        const offsetPercent = state.index * 100;
        el.track.style.transform = `translateX(-${offsetPercent}%)`;

        const dots = Array.from(el.dotsRoot.querySelectorAll<HTMLButtonElement>('.dot'));
        dots.forEach((d, i) => d.setAttribute('aria-current', i === state.index ? 'true' : 'false'));
    }

    function stopAuto(state: SliderState) {
        if (state.autoTimer !== null) {
            window.clearInterval(state.autoTimer);
            state.autoTimer = null;
        }
    }

    function startAuto(el: SliderElements, state: SliderState) {
        stopAuto(state);

        state.autoTimer = window.setInterval(() => {
            goTo(el, state, state.index + 1, false);
        }, 6500);
    }

    function goTo(el: SliderElements, state: SliderState, index: number, userInitiated: boolean) {
        state.index = clampIndex(index, el.slides.length);
        applyTransform(el, state);

        if (userInitiated) {
            startAuto(el, state);
        }
    }

    function initSlider(root: HTMLElement) {
        const el = buildSliderElements(root);
        const state: SliderState = {
            index: 0,
            isDragging: false,
            startX: 0,
            deltaX: 0,
            autoTimer: null
        };

        renderDots(el, state);
        applyTransform(el, state);

        el.prevBtn.addEventListener('click', () => goTo(el, state, state.index - 1, true));
        el.nextBtn.addEventListener('click', () => goTo(el, state, state.index + 1, true));

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') goTo(el, state, state.index - 1, true);
            if (e.key === 'ArrowRight') goTo(el, state, state.index + 1, true);
        };

        el.root.addEventListener('mouseenter', () => stopAuto(state));
        el.root.addEventListener('mouseleave', () => startAuto(el, state));
        el.root.addEventListener('focusin', () => stopAuto(state));
        el.root.addEventListener('focusout', () => startAuto(el, state));

        el.root.addEventListener('keydown', onKeyDown);
        el.root.setAttribute('tabindex', '0');

        const pointerDown = (e: PointerEvent) => {
            state.isDragging = true;
            state.startX = e.clientX;
            state.deltaX = 0;
            stopAuto(state);
            el.viewport.setPointerCapture(e.pointerId);
        };

        const pointerMove = (e: PointerEvent) => {
            if (!state.isDragging) return;
            state.deltaX = e.clientX - state.startX;
        };

        const pointerUp = () => {
            if (!state.isDragging) return;
            state.isDragging = false;

            const threshold = 50;
            if (state.deltaX > threshold) {
                goTo(el, state, state.index - 1, true);
            } else if (state.deltaX < -threshold) {
                goTo(el, state, state.index + 1, true);
            } else {
                startAuto(el, state);
            }

            state.deltaX = 0;
        };

        el.viewport.addEventListener('pointerdown', pointerDown);
        el.viewport.addEventListener('pointermove', pointerMove);
        el.viewport.addEventListener('pointerup', pointerUp);
        el.viewport.addEventListener('pointercancel', pointerUp);

        startAuto(el, state);
    }

    function initDemoForm() {
        const form = document.querySelector<HTMLFormElement>('form.form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
            if (btn) {
                const original = btn.textContent;
                btn.disabled = true;
                btn.textContent = 'รับข้อมูลแล้ว';
                window.setTimeout(() => {
                    btn.disabled = false;
                    btn.textContent = original || 'ส่งข้อมูล';
                    form.reset();
                }, 1200);
            }
        });
    }

    function boot() {
        initMobileNav();

        const sliderRoot = document.querySelector<HTMLElement>('[data-slider]');
        if (sliderRoot) initSlider(sliderRoot);

        initDemoForm();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
