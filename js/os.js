/*
 * os.js — the "operating system" layer.
 *
 * Everything else (gallery.js, mediaplayer.js, the games) just calls into
 * the small `OS` object exposed at the bottom of this file. Windows are
 * driven entirely off data-attributes on the .card elementements themselves
 * (data-kind / data-title / data-icon + dataset.state), so anything that
 * gets added to the DOM later (like image-viewer windows cloned by
 * gallery.js) works automatically without needing new listeners —
 * everything is handled through event delegation.
 */

(function() {
  const desktop = document.querySelector('.desktop');
  const desktopIcons = document.querySelector('.desktop-icons');
  const icons = document.querySelectorAll('.icon');
  const startMenu = document.getElementById('start-menu');
  const startIcon = document.querySelector('.start-icon');
  const hideWindowsBtn = document.getElementById('hide-windows');
  const taskbarApps = document.getElementById('taskbar-apps');
  const timeText = document.getElementById('time');
  const dateText = document.getElementById('date');
  const shutdownBtn = document.getElementById('shutdown-btn');
  const shutdownScreen = document.getElementById('shutdown-screen');

  let topZ = 1000;
  let focusedWindowId = null;
  let clickedIcon = null;

  // drag state -- only one of these is active at a time
  let dragMode = null; // 'window' | 'icon' | 'resize'
  let dragEl = null;
  let offsetX = 0;
  let offsetY = 0;
  let resizeStart = { x: 0, y: 0, w: 0, h: 0 };
  let iconStartPos = { left: '', top: '' };

  let peekHoverTimer = null;
  let peekPopup = null;
  let showDesktopHoverTimer = null;

  const GRID_SIZE = 85;
  const GRID_PADDING = 10;

  const firstOpenCallbacks = {}; // id -> fn, fired once the first time a window opens

  // ------------------------------------------------------------------
  // clock
  // ------------------------------------------------------------------

  function tickClock() {
    const now = new Date();
    timeText.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    dateText.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  }
  tickClock();
  setInterval(tickClock, 1000 * 30);

  // ------------------------------------------------------------------
  // window helpers
  // ------------------------------------------------------------------

  function allWindowEls() {
    return Array.from(document.querySelectorAll('.card')).filter((element) => element.id !== 'image-viewer-template');
  }

  function openWindows() {
    return allWindowEls().filter((element) => element.dataset.state === 'normal' || element.dataset.state === 'minimized');
  }

  function bringToFront(element) {
    topZ += 1;
    element.style.zIndex = topZ;
    element.dataset.lastActive = Date.now().toString();
    focusedWindowId = element.id;
    renderTaskbar();
  }

  function openWindow(id) {
    const element = document.getElementById(id);
    if (!element) return;

    const firstOpen = !element.dataset.state || element.dataset.state === 'closed';

    if (firstOpen) {
      if (!element.style.top) element.style.top = '60px';
      if (!element.style.left) element.style.left = '60px';
    }

    element.dataset.state = 'normal';
    element.style.display = 'flex';
    element.classList.remove('peeking');
    bringToFront(element);

    if (firstOpen && firstOpenCallbacks[id]) {
      firstOpenCallbacks[id](element);
    }
  }

  function closeWindow(id) {
    const element = document.getElementById(id);
    if (!element) return;
    element.dataset.state = 'closed';
    element.style.display = 'none';
    element.classList.remove('maximized');
    renderTaskbar();
  }

  function destroyWindow(id) {
    const element = document.getElementById(id);
    if (!element) return;
    element.remove();
    renderTaskbar();
  }

  function minimizeWindow(id) {
    const element = document.getElementById(id);
    if (!element) return;
    element.dataset.state = 'minimized';
    element.style.display = 'none';
    renderTaskbar();
  }

  function toggleMaximize(id) {
    const element = document.getElementById(id);
    if (!element) return;

    if (element.classList.contains('maximized')) {
      element.classList.remove('maximized');
      element.style.top = element.dataset.prevTop || '60px';
      element.style.left = element.dataset.prevLeft || '60px';
      element.style.width = element.dataset.prevWidth || '';
      element.style.height = element.dataset.prevHeight || '';
    } else {
      element.dataset.prevTop = element.style.top;
      element.dataset.prevLeft = element.style.left;
      element.dataset.prevWidth = element.style.width || getComputedStyle(element).width;
      element.dataset.prevHeight = element.style.height || getComputedStyle(element).height;
      element.classList.add('maximized');
    }
    bringToFront(element);
  }

  function registerFirstOpen(id, fn) {
    firstOpenCallbacks[id] = fn;
  }

  // ------------------------------------------------------------------
  // window dragging / resizing
  // ------------------------------------------------------------------

  desktop.addEventListener('mousedown', (event) => {
    const header = event.target.closest('.card-header');
    const handle = event.target.closest('.resize-handle');

    if (handle) {
      const card = handle.closest('.card');
      if (!card || card.classList.contains('maximized')) return;
      dragMode = 'resize';
      dragEl = card;
      const rect = card.getBoundingClientRect();
      resizeStart = { x: event.clientX, y: event.clientY, w: rect.width, h: rect.height };
      bringToFront(card);
      event.preventDefault();
      return;
    }

    if (header) {
      if (event.target.closest('.header-btns')) return;
      const card = header.closest('.card');
      if (!card) return;
      if (card.classList.contains('maximized')) {
        bringToFront(card);
        return;
      }
      dragMode = 'window';
      dragEl = card;
      offsetX = event.clientX - card.getBoundingClientRect().left;
      offsetY = event.clientY - card.getBoundingClientRect().top;
      bringToFront(card);
      event.preventDefault();
      return;
    }
  });

  desktop.addEventListener('dblclick', (event) => {
    const header = event.target.closest('.card-header');
    if (!header || event.target.closest('.header-btns')) return;
    const card = header.closest('.card');
    if (card) toggleMaximize(card.id);
  });

  document.addEventListener('mousemove', (event) => {
    if (!dragMode) return;
    event.preventDefault();
    document.body.style.cursor = dragMode === 'resize' ? 'nwse-resize' : 'grabbing';

    if (dragMode === 'window') {
      const desktopRect = desktop.getBoundingClientRect();
      const newLeft = event.clientX - offsetX - desktopRect.left;
      const newTop = event.clientY - offsetY - desktopRect.top;
      dragEl.style.left = newLeft + 'px';
      dragEl.style.top = newTop + 'px';
    }

    if (dragMode === 'resize') {
      const dw = event.clientX - resizeStart.x;
      const dh = event.clientY - resizeStart.y;
      dragEl.style.width = Math.max(240, resizeStart.w + dw) + 'px';
      dragEl.style.height = Math.max(160, resizeStart.h + dh) + 'px';
    }

    if (dragMode === 'icon') {
      const desktopRect = desktop.getBoundingClientRect();
      const newLeft = event.clientX - offsetX - desktopRect.left;
      const newTop = event.clientY - offsetY - desktopRect.top;
      // Snap using both the grid size AND the padding layout offset
      dragEl.style.left = snapToGrid(newLeft, GRID_SIZE, GRID_PADDING) + 'px';
      dragEl.style.top = snapToGrid(newTop, GRID_SIZE, GRID_PADDING) + 'px';
    }
  });

  document.addEventListener('mouseup', () => {
    document.body.style.cursor = 'default';

    if (dragMode === 'icon' && dragEl) {
      const targetLeft = dragEl.style.left;
      const targetTop = dragEl.style.top;

      const x = parseInt(targetLeft, 10);
      const y = parseInt(targetTop, 10);

      // 1. Is it out of bounds?
      const outOfBounds = x < 0 || y < 0 || x > desktop.offsetWidth - 80 || y > desktop.offsetHeight - 80;

      // 2. Is this specific grid spot already occupied by another icon?
      // Because we perfectly snap to the layout grid now, we can use a strict string check.
      const occupied = Array.from(icons).some((otherIcon) => {
        if (otherIcon === dragEl) return false;
        return otherIcon.style.left === targetLeft && otherIcon.style.top === targetTop;
      });

      // If occupied or dragged off-screen, revert to starting position
      if (occupied || outOfBounds) {
        dragEl.style.left = iconStartPos.left;
        dragEl.style.top = iconStartPos.top;
      }
    }

    dragMode = null;
    dragEl = null;
  });

  // header buttons
  desktop.addEventListener('click', (event) => {
    const closeBtn = event.target.closest('.header-exit');
    const minBtn = event.target.closest('.header-minimize');
    const maxBtn = event.target.closest('.header-maximize');

    if (closeBtn) {
      const card = closeBtn.closest('.card');
      if (!card) return;
      if (card.dataset.dynamic === 'true') {
        destroyWindow(card.id);
      } else {
        closeWindow(card.id);
      }
      return;
    }

    if (minBtn) {
      const card = minBtn.closest('.card');
      if (card) minimizeWindow(card.id);
      return;
    }

    if (maxBtn) {
      const card = maxBtn.closest('.card');
      if (card) toggleMaximize(card.id);
      return;
    }
  });

  // ------------------------------------------------------------------
  // bubbles
  // ------------------------------------------------------------------

  document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('bubble-overlay');
    const BUBBLE_COUNT = 5;
    const BUBBLE_SIZE = 70; // Matches width/height in CSS
    const RADIUS = BUBBLE_SIZE / 2;
    const bubbles = [];

    // Spawn 5 bubbles horizontally spaced outside the left screen edge
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const img = document.createElement('img');
      img.src = 'assets/bubble.png';
      img.className = 'bubble';
      overlay.appendChild(img);

      bubbles.push({
        el: img,
        // Start outside the screen on the left, staggered
        x: -BUBBLE_SIZE - (i * 120),
        y: Math.random() * (window.innerHeight - BUBBLE_SIZE),
        // Initial velocity (moving right into the screen)
        vx: 2 + Math.random() * 3,
        vy: (Math.random() - 0.5) * 4,
        r: RADIUS
      });
    }

    function update() {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // 1. Move bubbles & bounce off screen boundaries
      for (let b of bubbles) {
        b.x += b.vx;
        b.y += b.vy;

        // Bounce off top and bottom boundaries
        if (b.y <= 0) {
          b.y = 0;
          b.vy *= -1;
        } else if (b.y + BUBBLE_SIZE >= screenHeight) {
          b.y = screenHeight - BUBBLE_SIZE;
          b.vy *= -1;
        }

        // Bounce off left boundary (only after fully entering)
        if (b.x <= 0 && b.vx < 0) {
          b.x = 0;
          b.vx *= -1;
        }

        // Bounce off right boundary
        if (b.x + BUBBLE_SIZE >= screenWidth && b.vx > 0) {
          b.x = screenWidth - BUBBLE_SIZE;
          b.vx *= -1;
        }
      }

      // 2. Elastic collisions between bubbles
      for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
          const b1 = bubbles[i];
          const b2 = bubbles[j];

          // Center coordinates
          const c1x = b1.x + b1.r;
          const c1y = b1.y + b1.r;
          const c2x = b2.x + b2.r;
          const c2y = b2.y + b2.r;

          const dx = c2x - c1x;
          const dy = c2y - c1y;
          const dist = Math.hypot(dx, dy);
          const minDist = b1.r + b2.r;

          if (dist < minDist) {
            // Separate bubbles to prevent sticking
            const overlap = 0.5 * (minDist - dist);
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);

            b1.x -= nx * overlap;
            b1.y -= ny * overlap;
            b2.x += nx * overlap;
            b2.y += ny * overlap;

            // Elastic collision velocity swap
            const kx = b1.vx - b2.vx;
            const ky = b1.vy - b2.vy;
            const p = nx * kx + ny * ky;

            b1.vx -= p * nx;
            b1.vy -= p * ny;
            b2.vx += p * nx;
            b2.vy += p * ny;
          }
        }
      }

      // 3. Render updated positions
      for (let b of bubbles) {
        b.el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0)`;
      }

      requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  });

  // ------------------------------------------------------------------
  // desktop icons
  // ------------------------------------------------------------------

  for (const img of document.querySelectorAll('img')) {
    img.addEventListener('dragstart', (event) => {
      event.preventDefault();
      img.draggable = false;
    });
  }

  for (const icon of icons) {
    icon.addEventListener('mousedown', (event) => {
      event.stopPropagation();
      dragMode = 'icon';
      dragEl = icon;

      // Save initial style positions so we can snap back exactly
      iconStartPos = {
        left: icon.style.left,
        top: icon.style.top
      };

      offsetX = event.clientX - icon.getBoundingClientRect().left;
      offsetY = event.clientY - icon.getBoundingClientRect().top;
      icon.style.zIndex = ++topZ;
    });

    icon.addEventListener('click', (event) => {
      event.stopPropagation();
      if (clickedIcon) clickedIcon.style.backgroundColor = '';
      clickedIcon = icon;
      icon.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    });

    icon.addEventListener('dblclick', (event) => {
      event.stopPropagation();
      const id = icon.getAttribute('data-window');
      if (id) openWindow(id);
    });
  }

  desktop.addEventListener('click', (event) => {
    if (event.target.closest('.icon')) return;
    if (event.target.closest('.taskbar-app') || event.target.closest('.taskbar-peek')) return;

    if (clickedIcon) {
      clickedIcon.style.backgroundColor = '';
      clickedIcon = null;
    }
    if (startMenu.style.display === 'flex') startMenu.style.display = 'none';
    closeGamesFolder();
  });

  // ------------------------------------------------------------------
  // start menu
  // ------------------------------------------------------------------

  function closeGamesFolder() {
    document.getElementById('games-folder')?.classList.remove('open');
  }

  startIcon.addEventListener('click', (event) => {
    event.stopPropagation();
    if (startMenu.style.display === 'flex') {
      startMenu.style.display = 'none';
    } else {
      startMenu.style.display = 'flex';
      startMenu.style.zIndex = ++topZ;
    }
  });

  startMenu.addEventListener('click', (event) => event.stopPropagation());

  startMenu.querySelectorAll('[data-window]').forEach((element) => {
    element.addEventListener('click', (event) => {
      event.stopPropagation();
      const id = element.getAttribute('data-window');
      if (id) openWindow(id);
      startMenu.style.display = 'none';
      closeGamesFolder();
    });
  });

  document.getElementById('sidebar-games-item')?.addEventListener('click', (event) => {
    event.stopPropagation();
    document.getElementById('games-folder')?.classList.toggle('open');
  });

  // ------------------------------------------------------------------
  // taskbar: show desktop
  // ------------------------------------------------------------------

  hideWindowsBtn.addEventListener('mouseenter', () => {
    showDesktopHoverTimer = setTimeout(() => {
      openWindows()
        .filter((element) => element.dataset.state === 'normal')
        .forEach((element) => element.classList.add('peeking'));
      hideWindowsBtn.classList.add('active');
    }, 1000);
  });

  hideWindowsBtn.addEventListener('mouseleave', () => {
    clearTimeout(showDesktopHoverTimer);
    openWindows().forEach((element) => element.classList.remove('peeking'));
    hideWindowsBtn.classList.remove('active');
  });

  hideWindowsBtn.addEventListener('click', () => {
    openWindows()
      .filter((element) => element.dataset.state === 'normal')
      .forEach((element) => minimizeWindow(element.id));
  });

  // ------------------------------------------------------------------
  // taskbar apps
  // ------------------------------------------------------------------

  function renderTaskbar() {
    taskbarApps.innerHTML = '';

    const groups = new Map();
    openWindows().forEach((element) => {
      const kind = element.dataset.kind;
      if (!groups.has(kind)) groups.set(kind, []);
      groups.get(kind).push(element);
    });

    groups.forEach((elements, kind) => {
      elements.sort((a, b) => Number(a.dataset.lastActive || 0) - Number(b.dataset.lastActive || 0));
      const primary = elements[elements.length - 1];

      const btn = document.createElement('div');
      btn.className = 'taskbar-app';
      if (elements.length > 1) btn.classList.add('grouped');
      if (primary.id === focusedWindowId && primary.dataset.state === 'normal') btn.classList.add('focused');

      const img = document.createElement('img');
      img.src = primary.dataset.icon || '';
      const span = document.createElement('span');
      span.textContent = primary.dataset.title || kind;
      btn.appendChild(img);
      btn.appendChild(span);

      if (elements.length > 1) {
        const count = document.createElement('span');
        count.className = 'taskbar-count';
        count.textContent = String(elements.length);
        btn.appendChild(count);
      }

      btn.addEventListener('mouseenter', () => {
        peekHoverTimer = setTimeout(() => showPeekPopup(btn, elements), 1000);
      });
      btn.addEventListener('mouseleave', () => {
        clearTimeout(peekHoverTimer);
      });

      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        removePeekPopup();
        if (elements.length === 1) {
          const element = elements[0];
          if (element.dataset.state === 'normal' && element.id === focusedWindowId) {
            minimizeWindow(element.id);
          } else {
            openWindow(element.id);
          }
        } else {
          openWindow(primary.id);
        }
      });

      taskbarApps.appendChild(btn);
    });
  }

  function removePeekPopup() {
    if (peekPopup) {
      peekPopup.remove();
      peekPopup = null;
    }
  }

  function showPeekPopup(anchorBtn, elements) {
    removePeekPopup();
    const popup = document.createElement('div');
    popup.className = 'taskbar-peek';

    elements.forEach((element) => {
      const item = document.createElement('div');
      item.className = 'taskbar-peek-item';

      const thumb = document.createElement('div');
      thumb.className = 'taskbar-peek-thumb';
      const img = document.createElement('img');
      img.src = element.dataset.icon || '';
      const label = document.createElement('span');
      label.textContent = element.dataset.title || '';
      thumb.appendChild(img);
      thumb.appendChild(label);
      thumb.addEventListener('click', () => {
        openWindow(element.id);
        removePeekPopup();
      });

      const closeBtn = document.createElement('div');
      closeBtn.className = 'taskbar-peek-close';
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        removePeekPopup();
        if (element.dataset.dynamic === 'true') {
          destroyWindow(element.id);
        } else {
          closeWindow(element.id);
        }
      });

      item.appendChild(thumb);
      item.appendChild(closeBtn);
      popup.appendChild(item);
    });

    anchorBtn.appendChild(popup);
    peekPopup = popup;
  }

  document.addEventListener('mouseover', (event) => {
    if (!peekPopup) return;
    if (event.target.closest('.taskbar-peek') || event.target.closest('.taskbar-app')) return;
    removePeekPopup();
  });

  // ------------------------------------------------------------------
  // desktop icon grid layout
  // ------------------------------------------------------------------

  // Mathematically identical to grid layout now
  function snapToGrid(pos, gridSize, padding) {
    return Math.round((pos - padding) / gridSize) * gridSize + padding;
  }

  function layoutIconsInGrid() {
    const usableHeight = desktopIcons.clientHeight - GRID_PADDING;
    const rows = Math.max(1, Math.floor(usableHeight / GRID_SIZE));

    Array.from(icons).forEach((icon, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      icon.style.left = (GRID_PADDING + col * GRID_SIZE) + 'px';
      icon.style.top = (GRID_PADDING + row * GRID_SIZE) + 'px';
    });
  }

  // ------------------------------------------------------------------
  // shutdown
  // ------------------------------------------------------------------

  shutdownBtn?.addEventListener('click', () => {
    startMenu.style.display = 'none';
    shutdownScreen.classList.add('visible');
    setTimeout(() => {
      window.close();
    }, 1600);
  });

  // ------------------------------------------------------------------
  // about-me age
  // ------------------------------------------------------------------

  function computeAge() {
    const birth = new Date(2010, 7, 11);
    const now = new Date();

    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const parts = [`${years} year${years === 1 ? '' : 's'}`];
    if (months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`);
    if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);

    const ageElement = document.getElementById('about-age');
    if (ageElement) ageElement.textContent = parts.join(', ');
  }
  computeAge();

  // ------------------------------------------------------------------
  // public API
  // ------------------------------------------------------------------

  window.OS = {
    openWindow,
    closeWindow,
    destroyWindow,
    minimizeWindow,
    toggleMaximize,
    bringToFront,
    registerFirstOpen,
    layoutIconsInGrid,

    createDynamicWindow(templateId, { id, title, icon }) {
      const template = document.getElementById(templateId);
      const clone = template.cloneNode(true);
      clone.id = id;
      clone.dataset.dynamic = 'true';
      clone.dataset.title = title;
      clone.dataset.icon = icon;
      clone.dataset.state = 'closed';
      clone.style.display = 'none';
      clone.style.top = (60 + Math.floor(Math.random() * 120)) + 'px';
      clone.style.left = (80 + Math.floor(Math.random() * 160)) + 'px';

      const h1 = clone.querySelector('.card-header h1');
      if (h1) h1.textContent = title;
      const headerImg = clone.querySelector('.card-header .header-title img');
      if (headerImg) headerImg.src = icon;

      template.parentElement.appendChild(clone);
      return clone;
    },
  };

  layoutIconsInGrid();
  window.addEventListener('resize', layoutIconsInGrid);
})();
