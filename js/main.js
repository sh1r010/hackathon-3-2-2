/* ============================================================
   S7 Kursk — main.js
   - Per-card сворачивание текста в блоке «Оборудование».
   - Слайдер врачей (стрелки + точки + свайп + ресайз).
   - Появление блоков при скролле (IntersectionObserver).
   Чистый нативный JavaScript. Без зависимостей.
   ============================================================ */

(function () {
    'use strict';

    document.documentElement.classList.remove('no-js');

    // -------- Сворачиваемый блок (универсальный) --------
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

        var resizeTimer = null;
        window.addEventListener('resize', function () {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(setMaxHeight, 120);
        });

        var media = body.querySelectorAll('img');
        Array.prototype.forEach.call(media, function (img) {
            if (!img.complete) img.addEventListener('load', setMaxHeight);
        });

        setMaxHeight();
    }

    // -------- Слайдер врачей (ТЗ п.4) --------
    function initDoctorsSlider(root) {
        var track  = root.querySelector('[data-doctors-track]');
        var prev   = root.querySelector('[data-doctors-prev]');
        var next   = root.querySelector('[data-doctors-next]');
        var dotsEl = root.querySelector('[data-doctors-dots]');
        if (!track || !prev || !next) return;

        var cards = track.querySelectorAll('.doctors__card');
        if (!cards.length) return;

        // Запоминаем позицию слайдера в sessionStorage,
        // чтобы при возврате со страницы врача слайдер остался на той же карточке.
        var STORAGE_KEY = 's7_doctors_slider_idx';
        var idx = 0;
        try {
            var saved = sessionStorage.getItem(STORAGE_KEY);
            if (saved !== null) {
                var n = parseInt(saved, 10);
                if (!isNaN(n) && n >= 0) idx = n;
            }
        } catch (e) { /* sessionStorage недоступен — игнор */ }

        function saveIdx() {
            try { sessionStorage.setItem(STORAGE_KEY, String(idx)); } catch (e) {}
        }

        // При клике на любую карточку — сохраняем текущую позицию ДО перехода.
        Array.prototype.forEach.call(
            track.querySelectorAll('.doctors__card-link'),
            function (link) {
                link.addEventListener('click', saveIdx);
            }
        );

        function step() {
            var card = cards[0];
            var styles = getComputedStyle(track);
            var gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
            return card.offsetWidth + gap;
        }

        function visibleCount() {
            var trackWidth = track.parentElement.clientWidth;
            var s = step();
            if (s <= 0) return 1;
            return Math.max(1, Math.round(trackWidth / s));
        }

        function maxIndex() {
            return Math.max(0, cards.length - visibleCount());
        }

        function buildDots() {
            if (!dotsEl) return;
            var n = maxIndex() + 1;
            // Если кол-во точек уже верное — оставляем
            if (dotsEl.children.length === n && n > 0) return;
            dotsEl.innerHTML = '';
            for (var i = 0; i < n; i++) {
                (function (i) {
                    var li = document.createElement('li');
                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'doctors__dot';
                    btn.setAttribute('aria-label', 'Перейти к слайду ' + (i + 1));
                    btn.addEventListener('click', function () {
                        idx = i;
                        update();
                    });
                    li.appendChild(btn);
                    dotsEl.appendChild(li);
                })(i);
            }
        }

        function updateDots() {
            if (!dotsEl) return;
            var dots = dotsEl.querySelectorAll('.doctors__dot');
            for (var i = 0; i < dots.length; i++) {
                dots[i].classList.toggle('is-active', i === idx);
            }
        }

        function update() {
            var maxI = maxIndex();
            if (idx > maxI) idx = maxI;
            if (idx < 0) idx = 0;
            track.style.transform = 'translateX(' + (-idx * step()) + 'px)';
            prev.disabled = idx <= 0;
            next.disabled = idx >= maxI;
            updateDots();
            saveIdx();
        }

        prev.addEventListener('click', function () { idx--; update(); });
        next.addEventListener('click', function () { idx++; update(); });

        // Свайп на тач-устройствах
        var startX = 0, startY = 0, isTouch = false;
        track.addEventListener('touchstart', function (e) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isTouch = true;
        }, { passive: true });
        track.addEventListener('touchend', function (e) {
            if (!isTouch) return;
            isTouch = false;
            var dx = e.changedTouches[0].clientX - startX;
            var dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
                idx += (dx > 0 ? -1 : 1);
                update();
            }
        });

        // Ресайз — пересчёт ширин и количества точек
        var rt = null;
        window.addEventListener('resize', function () {
            if (rt) clearTimeout(rt);
            rt = setTimeout(function () {
                buildDots();
                update();
            }, 120);
        });

        buildDots();
        update();
    }

    // -------- Услуги: лукбук с фильтр-чипсами, переключением категорий и сайдбар-картой «Ваш выбор» (ТЗ п.3) --------
    function initServicesLookbook(root) {
        var section  = root.closest('.services') || document;
        var menuEl   = root.querySelector('[data-services-menu]');
        var panelsEl = root.querySelector('[data-services-panels]');
        var chipsEl  = section.querySelector('[data-services-chips]');
        // Карточка «Ваш выбор» в сайдбаре
        var cart     = root.querySelector('[data-services-cart]');
        var cartList = root.querySelector('[data-services-cart-list]');
        var cartCnt  = root.querySelector('[data-services-cart-count]');
        var cartTotal= root.querySelector('[data-services-cart-total]');
        var cartReset= root.querySelector('[data-services-cart-reset]');
        if (!menuEl || !panelsEl) return;

        var items  = menuEl.querySelectorAll('.services__menu-item');
        var panels = panelsEl.querySelectorAll('.services__panel');
        if (!items.length || !panels.length) return;

        // --- Активация категории ---
        function setActive(id) {
            for (var i = 0; i < items.length; i++) {
                items[i].classList.toggle('is-active', items[i].getAttribute('data-cat') === id);
            }
            for (var j = 0; j < panels.length; j++) {
                var match = panels[j].getAttribute('data-panel') === id;
                if (match) {
                    panels[j].removeAttribute('hidden');
                    // Force reflow для перезапуска stagger-анимации строк
                    panels[j].classList.remove('is-active');
                    void panels[j].offsetWidth;
                    panels[j].classList.add('is-active');
                } else {
                    panels[j].classList.remove('is-active');
                    panels[j].setAttribute('hidden', '');
                }
            }
        }

        // Стартовая активация — первая видимая категория
        function activateFirstVisible() {
            for (var i = 0; i < items.length; i++) {
                if (!items[i].hasAttribute('hidden')) {
                    setActive(items[i].getAttribute('data-cat'));
                    return;
                }
            }
        }
        setActive(items[0].getAttribute('data-cat'));

        // --- Клик по категории слева ---
        Array.prototype.forEach.call(items, function (item) {
            item.addEventListener('click', function () {
                setActive(item.getAttribute('data-cat'));
            });
        });

        // --- Quick-chips фильтр групп ---
        if (chipsEl) {
            var chips = chipsEl.querySelectorAll('.services__chip');
            Array.prototype.forEach.call(chips, function (chip) {
                chip.addEventListener('click', function () {
                    // Переключаем активный чип
                    Array.prototype.forEach.call(chips, function (c) {
                        c.classList.toggle('is-active', c === chip);
                    });
                    var grp = chip.getAttribute('data-chip');
                    // Скрываем/показываем категории в меню по group
                    Array.prototype.forEach.call(items, function (item) {
                        var itemGrp = item.getAttribute('data-group');
                        var show = (grp === 'all') || (itemGrp === grp) || (grp === 'all' && itemGrp === 'consult');
                        if (show) item.removeAttribute('hidden');
                        else item.setAttribute('hidden', '');
                    });
                    // Если текущая активная категория скрыта — переключаем на первую видимую
                    var activeItem = menuEl.querySelector('.services__menu-item.is-active');
                    if (!activeItem || activeItem.hasAttribute('hidden')) {
                        activateFirstVisible();
                    }
                });
            });
        }

        // --- Карточка «Ваш выбор» ---
        // Храним выбранное: { key: {name, price} }
        var selected = {};

        function formatPrice(n) {
            return n.toLocaleString('ru-RU').replace(/ |,|\s/g, ' ') + ' ₽';
        }

        function renderCart() {
            var keys = Object.keys(selected);
            var count = keys.length;
            var total = 0;
            for (var i = 0; i < keys.length; i++) total += selected[keys[i]].price;

            if (cartCnt) cartCnt.textContent = count;
            if (cartTotal) cartTotal.textContent = formatPrice(total);
            if (cartList) {
                cartList.innerHTML = '';
                for (var j = 0; j < keys.length; j++) {
                    var item = selected[keys[j]];
                    var li = document.createElement('li');
                    li.className = 'services__cart-item';
                    var nameSpan = document.createElement('span');
                    nameSpan.className = 'services__cart-item-name';
                    nameSpan.textContent = item.name;
                    var priceSpan = document.createElement('span');
                    priceSpan.className = 'services__cart-item-price';
                    priceSpan.textContent = formatPrice(item.price);
                    li.appendChild(nameSpan);
                    li.appendChild(priceSpan);
                    cartList.appendChild(li);
                }
            }
            if (cart) {
                // Убираем атрибут hidden один раз (он был в HTML для no-JS fallback),
                // дальше управляем видимостью через .is-visible — это даёт CSS-transition
                if (cart.hasAttribute('hidden')) cart.removeAttribute('hidden');
                cart.classList.toggle('is-visible', count > 0);
            }
        }

        // Уникальный ID на чекбокс — комбинация data-panel + index
        panelsEl.addEventListener('change', function (e) {
            var t = e.target;
            if (t.tagName !== 'INPUT' || t.type !== 'checkbox') return;
            var price = parseInt(t.getAttribute('data-price'), 10) || 0;
            var row = t.closest('.services__row');
            var panel = t.closest('.services__panel');
            var rows = panel.querySelectorAll('.services__row');
            var key = panel.getAttribute('data-panel') + '_' + Array.prototype.indexOf.call(rows, row);
            // Достаём название услуги
            var nameEl = row.querySelector('.services__row-name');
            var name = nameEl ? nameEl.textContent.trim() : 'Услуга';
            if (t.checked) selected[key] = { name: name, price: price };
            else delete selected[key];
            renderCart();
        });

        // Сброс выбора
        if (cartReset) {
            cartReset.addEventListener('click', function () {
                selected = {};
                var checks = panelsEl.querySelectorAll('input[type=checkbox]');
                Array.prototype.forEach.call(checks, function (c) { c.checked = false; });
                renderCart();
            });
        }
    }

    // -------- Слайдер «Беспокоит» (ТЗ п.6) — только мобила, стрелки + свайп --------
    function initWorriesSlider(root) {
        var viewport = root.querySelector('.worries__viewport');
        var track    = root.querySelector('[data-worries-track]');
        var prev     = root.querySelector('[data-worries-prev]');
        var next     = root.querySelector('[data-worries-next]');
        if (!viewport || !track || !prev || !next) return;

        var items = track.querySelectorAll('.worries__card');
        if (!items.length) return;

        var idx = 0;
        var MOBILE_BP = 768;
        function isMobile() { return window.innerWidth <= MOBILE_BP; }

        function step() {
            if (!isMobile()) return 0;
            var card = items[0];
            var styles = getComputedStyle(track);
            var gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
            return card.offsetWidth + gap;
        }
        function maxIndex() { return Math.max(0, items.length - 1); }

        function update() {
            if (!isMobile()) {
                track.style.transform = '';
                prev.disabled = next.disabled = true;
                return;
            }
            if (idx > maxIndex()) idx = maxIndex();
            if (idx < 0) idx = 0;
            track.style.transform = 'translateX(' + (-idx * step()) + 'px)';
            prev.disabled = idx <= 0;
            next.disabled = idx >= maxIndex();
        }

        prev.addEventListener('click', function () { idx--; update(); });
        next.addEventListener('click', function () { idx++; update(); });

        // Свайп
        var startX = 0, startY = 0, isTouch = false;
        track.addEventListener('touchstart', function (e) {
            if (!isMobile()) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isTouch = true;
        }, { passive: true });
        track.addEventListener('touchend', function (e) {
            if (!isTouch) return;
            isTouch = false;
            var dx = e.changedTouches[0].clientX - startX;
            var dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
                idx += (dx > 0 ? -1 : 1);
                update();
            }
        });

        var rt = null;
        window.addEventListener('resize', function () {
            if (rt) clearTimeout(rt);
            rt = setTimeout(update, 120);
        });

        update();
    }

    // -------- Vimeo hero: показать iframe только когда видео РЕАЛЬНО начало играть --------
    // Без этого пользователь видит чёрный фон плеера со спиннером, пока буферится первый кадр.
    function initHeroVideo() {
        var wrapper = document.querySelector('[data-hero-video]');
        if (!wrapper) return;
        var iframe = wrapper.querySelector('iframe');
        if (!iframe) return;
        var hero = document.querySelector('.hero');

        var VIMEO_ORIGIN = 'https://player.vimeo.com';
        var ready = false;

        function reveal() {
            if (ready) return;
            ready = true;
            iframe.classList.add('is-ready');
            // Также помечаем сам hero — это запускает fade-out спиннера «загрузки видео».
            if (hero) hero.classList.add('is-video-ready');
            // После fade-out полностью удаляем спиннер из DOM (останавливает анимацию,
            // никаких остаточных колец, ничего не блокирует).
            setTimeout(function () {
                var spinner = document.querySelector('.hero__spinner');
                if (spinner && spinner.parentNode) spinner.parentNode.removeChild(spinner);
            }, 700);
        }

        // Подписка на события Vimeo postMessage API
        function subscribe() {
            try {
                ['play', 'playing', 'timeupdate'].forEach(function (ev) {
                    iframe.contentWindow.postMessage(JSON.stringify({
                        method: 'addEventListener',
                        value: ev
                    }), VIMEO_ORIGIN);
                });
            } catch (e) { /* iframe ещё не готов — попробуем при следующем load */ }
        }

        window.addEventListener('message', function (e) {
            if (e.origin !== VIMEO_ORIGIN) return;
            var data;
            try { data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (err) { return; }
            if (data && data.event === 'ready') { subscribe(); }
            if (data && (data.event === 'play' || data.event === 'playing' || data.event === 'timeupdate')) {
                reveal();
            }
        });

        iframe.addEventListener('load', subscribe);
        if (iframe.contentWindow) subscribe();

        // Страховка: если за 8 секунд видео не стартовало
        setTimeout(reveal, 8000);
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
        var collapsibles = document.querySelectorAll('[data-collapsible]');
        Array.prototype.forEach.call(collapsibles, initCollapsible);

        var sliders = document.querySelectorAll('[data-doctors-slider]');
        Array.prototype.forEach.call(sliders, initDoctorsSlider);

        var servicesShells = document.querySelectorAll('[data-services-shell]');
        Array.prototype.forEach.call(servicesShells, initServicesLookbook);

        var worriesSliders = document.querySelectorAll('[data-worries-slider]');
        Array.prototype.forEach.call(worriesSliders, initWorriesSlider);

        initHeroVideo();
        initRevealOnScroll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }

})();
