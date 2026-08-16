/*
 * emiclicker.js — a small cookie-clicker style idle game.
 * Click the Emily icon for points, spend points on upgrades that add
 * passive points-per-second. Nothing is saved between visits on purpose --
 * this is a toy, not a real save-file game.
 */

(function () {
  function initGame() {
    const root = document.getElementById('emiclicker-root');
    root.innerHTML = `
      <div class="ec-count" id="ec-count">0</div>
      <div class="ec-per-sec" id="ec-per-sec">0 per second</div>
      <img src="assets/games/emiclicker/cookie.png" alt="click Emily" class="ec-cookie" id="ec-cookie">
      <div class="ec-shop" id="ec-shop"></div>
    `;

    const countEl = document.getElementById('ec-count');
    const perSecEl = document.getElementById('ec-per-sec');
    const cookie = document.getElementById('ec-cookie');
    const shop = document.getElementById('ec-shop');

    let points = 0;
    let perSecond = 0;

    const upgrades = [
      { name: 'A Friend Helps Out', desc: '+1 per second', baseCost: 15, count: 0, cps: 1 },
      { name: 'Fan Art Commission', desc: '+5 per second', baseCost: 100, count: 0, cps: 5 },
      { name: 'Art Stream', desc: '+20 per second', baseCost: 500, count: 0, cps: 20 },
      { name: 'Gallery Feature', desc: '+100 per second', baseCost: 3000, count: 0, cps: 100 },
    ];

    function cost(u) {
      return Math.floor(u.baseCost * Math.pow(1.15, u.count));
    }

    function recalc() {
      perSecond = upgrades.reduce((sum, u) => sum + u.count * u.cps, 0);
    }

    function render() {
      countEl.textContent = Math.floor(points).toLocaleString();
      perSecEl.textContent = `${perSecond} per second`;

      shop.innerHTML = '';
      upgrades.forEach((u) => {
        const c = cost(u);
        const row = document.createElement('div');
        row.className = 'ec-upgrade' + (points < c ? ' disabled' : '');
        row.innerHTML = `
          <div>
            <div class="ec-upgrade-name">${u.name} (${u.count})</div>
            <div class="ec-upgrade-desc">${u.desc}</div>
          </div>
          <div>${c.toLocaleString()}</div>
        `;
        row.addEventListener('click', () => {
          if (points < c) return;
          points -= c;
          u.count += 1;
          recalc();
          render();
        });
        shop.appendChild(row);
      });
    }

    cookie.addEventListener('click', () => {
      points += 1;
      render();
    });

    setInterval(() => {
      points += perSecond / 10;
      render();
    }, 100);

    render();
  }

  window.OS.registerFirstOpen('emiclicker-window', initGame);
})();
