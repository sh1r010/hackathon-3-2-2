/* ============================================================
 * S7 Clinic — блок «Услуги и цены»
 * Логика переключения категорий + мобильный слайдер
 *
 * Поведение:
 *   Desktop (≥1024px): клик по табу в вертикальном списке слева
 *                      активирует панель справа.
 *   Mobile  (<1024px): кнопки ← / → переключают слайды,
 *                      также работает свайп пальцем
 *                      и стрелки клавиатуры ← →.
 * ============================================================ */

(function () {
  'use strict';

  const services = document.querySelector('.services');
  if (!services) return;

  const tabs = Array.from(services.querySelectorAll('.services__tab'));
  const panels = Array.from(services.querySelectorAll('.services__panel'));
  const prevBtn = services.querySelector('.services__arrow--prev');
  const nextBtn = services.querySelector('.services__arrow--next');
  const mobileCategoryLabel = services.querySelector('.services__mobile-category');

  if (!panels.length) return;

  // Сопоставление id → индекс панели
  const panelById = new Map();
  panels.forEach((panel, idx) => {
    panelById.set(panel.dataset.category, idx);
  });

  let activeIndex = panels.findIndex(p =>
    p.classList.contains('services__panel--active')
  );
  if (activeIndex === -1) activeIndex = 0;

  /* ---------- Переключение активной категории ---------- */

  function setActive(index) {
    if (index < 0) index = panels.length - 1;
    if (index >= panels.length) index = 0;

    panels.forEach((panel, i) => {
      panel.classList.toggle('services__panel--active', i === index);
    });

    // Соответствующие табы
    tabs.forEach(tab => {
      const tabId = tab.dataset.category;
      const isActive = panelById.get(tabId) === index;
      tab.classList.toggle('services__tab--active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Подпись на мобиле
    if (mobileCategoryLabel) {
      const activePanel = panels[index];
      const title = activePanel.querySelector('.services__panel-title');
      mobileCategoryLabel.textContent = title ? title.textContent : '';
    }

    activeIndex = index;
  }

  /* ---------- Клики по табам (desktop) ---------- */

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.category;
      const idx = panelById.get(targetId);
      if (idx !== undefined) {
        setActive(idx);
      }
    });
  });

  /* ---------- Стрелки (mobile) ---------- */

  if (prevBtn) {
    prevBtn.addEventListener('click', () => setActive(activeIndex - 1));
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => setActive(activeIndex + 1));
  }

  /* ---------- Свайп на тач-устройствах ---------- */

  const viewer = services.querySelector('.services__viewer');
  if (viewer) {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    const SWIPE_THRESHOLD = 50; // минимальное расстояние для срабатывания

    viewer.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });

    viewer.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].clientX;
      touchEndY = e.changedTouches[0].clientY;
      handleSwipe();
    }, { passive: true });

    function handleSwipe() {
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      // Свайп считаем только если горизонтальное движение преобладает
      if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;

      if (deltaX < 0) {
        setActive(activeIndex + 1); // влево → следующая
      } else {
        setActive(activeIndex - 1); // вправо → предыдущая
      }
    }
  }

  /* ---------- Клавиатурная навигация ---------- */

  services.addEventListener('keydown', (e) => {
    // Стрелки работают только когда фокус внутри блока услуг
    // и не в редактируемом поле
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActive(activeIndex - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActive(activeIndex + 1);
    }
  });

  /* ---------- Инициализация ---------- */

  setActive(activeIndex);
})();
