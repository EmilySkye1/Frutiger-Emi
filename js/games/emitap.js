/*
 * emitap.js — a flappy-bird style canvas game. Click/tap to flap,
 * avoid the pipes. Best score is kept in localStorage.
 */

(function() {
  function initGame() {
    const root = document.getElementById('emitap-root');
    root.innerHTML = `
      <div class="et-score" id="et-score">score: 0  best: 0</div>
      <div class="et-canvas-wrap">
        <canvas id="emitap-canvas"></canvas>
      </div>
    `;

    // alpha: false optimizes rendering by disabling transparency compositing
    const canvas = document.getElementById('emitap-canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const scoreEl = document.getElementById('et-score');

    const sprite = new Image();
    let isSpriteLoaded = false;
    sprite.onload = () => { isSpriteLoaded = true; };
    sprite.src = 'assets/games/emitap/bird.png';

    let width = 0;
    let height = 0;

    function resize() {
      width = canvas.clientWidth || 300;
      height = canvas.clientHeight || 300;
      canvas.width = width;
      canvas.height = height;
    }

    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(canvas);
    } else {
      window.addEventListener('resize', resize);
    }
    resize();

    let best = Number(localStorage.getItem('emitap-best') || 0);

    const GRAVITY = 1400;
    const FLAP = -420;
    const PIPE_GAP = 150;
    const PIPE_WIDTH = 52;
    const PIPE_SPEED = 160;
    const BIRD_SIZE = 30;
    const MARGIN = 40;

    let birdY, birdVel, pipes, score, running, lastTime, spawnTimer;
    let lastRenderedScore = -1; // Caches the DOM state

    function updateScoreUI(isEnd = false) {
      if (isEnd) {
        scoreEl.textContent = `score: ${score}  best: ${best}  -- tap to retry`;
        lastRenderedScore = -1; // Reset for the next game
      } else if (score !== lastRenderedScore) {
        scoreEl.textContent = `score: ${score}  best: ${best}`;
        lastRenderedScore = score;
      }
    }

    function reset() {
      birdY = height / 2;
      birdVel = 0;
      pipes = [];
      score = 0;
      running = true;
      spawnTimer = 0;
      lastTime = performance.now();
      updateScoreUI();
      requestAnimationFrame(loop);
    }

    function flap() {
      if (!running) {
        reset();
        return;
      }
      birdVel = FLAP;
    }

    canvas.addEventListener('mousedown', flap);
    canvas.addEventListener('touchstart', (event) => {
      event.preventDefault();
      flap();
    }, { passive: false });

    function spawnPipe() {
      const gapY = MARGIN + Math.random() * (height - MARGIN * 2 - PIPE_GAP);
      pipes.push({ x: width, gapY, passed: false });
    }

    function loop(now) {
      if (!running) return;

      // Cap dt to prevent physics glitches if the tab goes inactive
      const dt = Math.min(0.033, (now - lastTime) / 1000);
      lastTime = now;

      birdVel += GRAVITY * dt;
      birdY += birdVel * dt;

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnPipe();
        spawnTimer = 1.6;
      }

      const birdX = width / 2;
      const birdTop = birdY - BIRD_SIZE / 2;
      const birdBottom = birdY + BIRD_SIZE / 2;
      const birdLeft = birdX - BIRD_SIZE / 2;
      const birdRight = birdX + BIRD_SIZE / 2;

      // Reverse loop to safely remove items without using .filter() (avoids GC pauses)
      for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.x -= PIPE_SPEED * dt;

        // Cleanup off-screen pipes
        if (p.x <= -PIPE_WIDTH) {
          pipes.splice(i, 1);
          continue;
        }

        // Score logic
        if (!p.passed && p.x + PIPE_WIDTH < birdLeft) {
          p.passed = true;
          score += 1;
        }

        // Collision logic
        if (birdRight > p.x && birdLeft < p.x + PIPE_WIDTH) {
          if (birdTop < p.gapY || birdBottom > p.gapY + PIPE_GAP) {
            endRun();
            return; // Exit loop early on death
          }
        }
      }

      // Floor/Ceiling collision
      if (birdTop < 0 || birdBottom > height) {
        endRun();
        return;
      }

      draw();
      updateScoreUI();

      if (running) {
        requestAnimationFrame(loop);
      }
    }

    function endRun() {
      running = false;
      if (score > best) {
        best = score;
        localStorage.setItem('emitap-best', String(best));
      }
      draw();
      updateScoreUI(true);
    }

    function draw() {
      // Draw background (Required when alpha: false is used)
      ctx.fillStyle = '#ffffff'; // Change to match your game's actual background color
      ctx.fillRect(0, 0, width, height);

      // Draw pipes
      ctx.fillStyle = '#4d9b4d';
      // Use standard for-loop for drawing
      for (let i = 0; i < pipes.length; i++) {
        const p = pipes[i];
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.gapY);
        ctx.fillRect(p.x, p.gapY + PIPE_GAP, PIPE_WIDTH, height - (p.gapY + PIPE_GAP));
      }

      // Draw bird
      const birdX = width / 2;
      if (isSpriteLoaded) {
        ctx.drawImage(sprite, birdX - BIRD_SIZE / 2, birdY - BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE);
      } else {
        ctx.fillStyle = '#ffb6d5';
        ctx.beginPath();
        ctx.arc(birdX, birdY, BIRD_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    reset();
  }

  window.OS.registerFirstOpen('emitap-window', initGame);
})();
