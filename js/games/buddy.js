/*
 * buddy.js — the Buddy app.
 *
 * A lil interactable guy that lives inside the Buddy window. He wanders
 * back and forth on his own, can be picked up and dragged anywhere with
 * the mouse/touch, and rests a hand on the wall whenever he reaches the
 * left or right edge of the window. Clicking him without dragging pokes
 * him for a quick reaction. Everything is confined to the window bounds
 * on purpose -- he never leaves his box.
 *
 * Sprites are plain <img> swaps (gifs loop on their own), so all this
 * file has to do is move the element around and pick the right src:
 *   assets/buddy/idle.gif  -- standing still
 *   assets/buddy/walk.gif  -- walking loop, drawn facing RIGHT
 *   assets/buddy/edge.gif  -- resting a hand on the wall, drawn facing RIGHT
 *   assets/buddy/held.gif  -- picked up / dangling from the cursor
 *   assets/buddy/poke.gif  -- quick happy reaction to a click/tap
 *
 * Facing left is done by flipping whichever of these is drawn facing
 * right (.flipped adds transform: scaleX(-1) in CSS), so only one
 * drawing per state is needed.
 */

(function () {
  const SPRITE_SIZE = 84;
  const WALK_SPEED = 60; // px per second
  const CLICK_MOVE_THRESHOLD = 6; // px -- below this, a pointerdown+up is a "poke" not a drag

  const SPRITES = {
    idle: 'assets/buddy/idle.gif',
    walk: 'assets/buddy/walk.gif',
    edge: 'assets/buddy/edge.gif',
    held: 'assets/buddy/held.gif',
    poke: 'assets/buddy/poke.gif',
  };

  function initBuddy() {
    const root = document.getElementById('buddy-root');
    root.innerHTML = `
      <div class="buddy-stage" id="buddy-stage">
        <div class="buddy-floor"></div>
        <img src="${SPRITES.idle}" alt="Buddy" class="buddy-sprite" id="buddy-sprite" draggable="false">
      </div>
    `;

    const stage = document.getElementById('buddy-stage');
    const sprite = document.getElementById('buddy-sprite');

    let x = 0;
    let y = 0;
    let dir = 1; // 1 = facing/moving right, -1 = facing/moving left
    let state = 'idle'; // idle | walk | edge | held | fall | poke
    let stateUntil = 0; // ms timestamp -- when the current timed state should end
    let lastTs = null;

    // drag tracking
    let dragging = false;
    let pointerId = null;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let grabOffsetX = 0;
    let grabOffsetY = 0;
    let moved = false;

    function bounds() {
      return {
        maxX: Math.max(0, stage.clientWidth - SPRITE_SIZE),
        maxY: Math.max(0, stage.clientHeight - SPRITE_SIZE),
      };
    }

    function clamp() {
      const { maxX, maxY } = bounds();
      x = Math.min(Math.max(x, 0), maxX);
      y = Math.min(Math.max(y, 0), maxY);
    }

    function floorY() {
      return bounds().maxY;
    }

    function setSprite(name) {
      const src = SPRITES[name];
      if (sprite.getAttribute('data-current') !== name) {
        sprite.src = src;
        sprite.setAttribute('data-current', name);
      }
    }

    function render() {
      sprite.style.left = x + 'px';
      sprite.style.top = y + 'px';
      sprite.classList.toggle('flipped', dir === -1);
      sprite.classList.toggle('held', state === 'held');
    }

    function goIdle(now) {
      state = 'idle';
      setSprite('idle');
      stateUntil = now + 1200 + Math.random() * 2200;
    }

    function goWalk(now, direction) {
      dir = direction;
      state = 'walk';
      setSprite('walk');
      stateUntil = now + 1500 + Math.random() * 2500;
    }

    function goEdge(now, wallDir) {
      dir = wallDir; // resting hand faces the wall it hit
      state = 'edge';
      setSprite('edge');
      stateUntil = now + 1800 + Math.random() * 2200;
    }

    function goPoke(now) {
      state = 'poke';
      setSprite('poke');
      stateUntil = now + 700;
    }

    function startPos() {
      const { maxX } = bounds();
      x = maxX / 2;
      y = floorY();
    }

    // ------------------------------------------------------------
    // main loop
    // ------------------------------------------------------------

    function tick(ts) {
      if (lastTs === null) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (state === 'held') {
        // position is driven directly by pointer events
      } else if (state === 'idle') {
        y = floorY();
        if (ts >= stateUntil) goWalk(ts, Math.random() < 0.5 ? -1 : 1);
      } else if (state === 'walk') {
        y = floorY();
        const { maxX } = bounds();
        x += dir * WALK_SPEED * dt;

        if (x <= 0) {
          x = 0;
          goEdge(ts, -1);
        } else if (x >= maxX) {
          x = maxX;
          goEdge(ts, 1);
        } else if (ts >= stateUntil) {
          goIdle(ts);
        }
      } else if (state === 'edge') {
        y = floorY();
        if (ts >= stateUntil) goWalk(ts, -dir);
      } else if (state === 'poke') {
        if (ts >= stateUntil) goIdle(ts);
      } else if (state === 'fall') {
        const target = floorY();
        if (y >= target - 1) {
          y = target;
          goIdle(ts);
        } else {
          y += Math.max(220 * dt, 4);
        }
      }

      clamp();
      render();
      requestAnimationFrame(tick);
    }

    // ------------------------------------------------------------
    // pointer interaction (mouse + touch)
    // ------------------------------------------------------------

    sprite.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      pointerId = event.pointerId;
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      moved = false;
      dragging = false;

      const rect = sprite.getBoundingClientRect();
      grabOffsetX = event.clientX - rect.left;
      grabOffsetY = event.clientY - rect.top;

      sprite.setPointerCapture(pointerId);
    });

    sprite.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointerId) return;

      const dx = event.clientX - pointerStartX;
      const dy = event.clientY - pointerStartY;

      if (!dragging && Math.hypot(dx, dy) > CLICK_MOVE_THRESHOLD) {
        dragging = true;
        moved = true;
        state = 'held';
        setSprite('held');
      }

      if (dragging) {
        const stageRect = stage.getBoundingClientRect();
        x = event.clientX - stageRect.left - grabOffsetX;
        y = event.clientY - stageRect.top - grabOffsetY;
        if (x < dragXPrev()) dir = -1;
        else if (x > dragXPrev()) dir = 1;
        setDragXPrev(x);
      }
    });

    // small helper so we can infer facing direction while dragging
    let _prevDragX = null;
    function dragXPrev() { return _prevDragX === null ? x : _prevDragX; }
    function setDragXPrev(val) { _prevDragX = val; }

    function endDrag(event) {
      if (event.pointerId !== pointerId) return;
      sprite.releasePointerCapture(pointerId);
      pointerId = null;
      _prevDragX = null;

      if (dragging) {
        dragging = false;
        state = 'fall';
      } else {
        // it was just a click/tap -- poke him
        goPoke(performance.now());
      }
    }

    sprite.addEventListener('pointerup', endDrag);
    sprite.addEventListener('pointercancel', endDrag);

    // ------------------------------------------------------------
    // keep him on-screen if the window is resized/maximized
    // ------------------------------------------------------------

    new ResizeObserver(() => {
      if (state !== 'held') y = floorY();
      clamp();
      render();
    }).observe(stage);

    startPos();
    render();
    requestAnimationFrame(tick);
  }

  window.OS.registerFirstOpen('buddy-window', initBuddy);
})();
