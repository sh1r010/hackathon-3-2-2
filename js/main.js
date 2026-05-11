/* ============================================================
   S7 Kursk — main.js
   - Per-card сворачивание текста в блоке «Оборудование»:
     у каждой карточки своя кнопка «Подробнее»/«Скрыть»,
     раскрывается только её скрытый текст. Карточки работают
     независимо друг от друга.
   - Появление блоков при скролле (IntersectionObserver).
   Чистый нативный JavaScript. Без зависимостей.
   ============================================================ */

(function () {
    'use strict';

    document.documentElement.classList.remove('no-js');

    // -------- Сворачиваемый блок (универсальный, для любого
    //          элемента с [data-collapsible]) --------
    function initCollapsible(wrapper) {
        var body   = wrapper.querySelector('[data-collapsible-body]');
        var toggle = wrapper.querySelector('[data-collapsible-toggle]');
        var label  = toggle ? toggle.querySelector('[data-toggle-label]') : null;
        if (!body || !toggle) return;

        var LABEL_OPEN  = 'Подробнее';
        var LABEL_CLOSE = 'Скрыть';
        var EXPANDED_CLASS = 'is-expanded';

        function setMaxHeight() {
            if (wrapper.classList.contains(EXPANDED_CLASS)) {
                body.style.maxHeight = body.scrollHeight + 'px';
            } else {
                body.style.maxHeight = '0px';
            }
        }

        function toggleCollapsible() {
            var expanded = wrapper.classList.toggle(EXPANDED_CLASS);
            toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            if (label) label.textContent = expanded ? LABEL_CLOSE : LABEL_OPEN;
            setMaxHeight();
        }

        toggle.addEventListener('click', toggleCollapsible);

        // Пересчёт высоты при ресайзе (с дебаунсом).
        var resizeTimer = null;
        window.addEventListener('resize', function () {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(setMaxHeight, 120);
        });

        // Пересчёт после догрузки картинок внутри ката.
        var media = body.querySelectorAll('img');
        Array.prototype.forEach.call(media, function (img) {
            if (!img.complete) img.addEventListener('load', setMaxHeight);
        });

        // Старт — свёрнуто.
        setMaxHeight();
    }

    // -------- Появление на скролле --------
    function initRevealOnScroll() {
        var targets = document.querySelectorAll('.reveal');
        if (!targets.length) return;

        if (!('IntersectionObserver' in window)) {
            Array.prototype.forEach.call(targets, function (el) {
                el.classList.add('is-visible');
            });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '0px 0px -80px 0px',
            threshold: 0.05
        });

        Array.prototype.forEach.call(targets, function (el) {
            io.observe(el);
        });
    }

    function initAll() {
        var nodes = document.querySelectorAll('[data-collapsible]');
        Array.prototype.forEach.call(nodes, initCollapsible);
        initRevealOnScroll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }

})();
