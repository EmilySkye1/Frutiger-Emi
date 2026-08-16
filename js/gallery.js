/*
 * gallery.js — the Gallery app.
 *
 * Reads assets/art/manifest.json (a plain JSON array of filenames that
 * live in assets/art/), lays them out as a folder of thumbnails, and
 * opens a fresh "image viewer" window (cloned from the hidden template
 * in index.html) whenever one is double-clicked.
 */

(function () {
  const grid = document.getElementById('gallery-grid');
  const status = document.getElementById('gallery-status');
  let viewerCount = 0;

  async function loadManifest() {
    try {
      const res = await fetch('assets/art/manifest.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('manifest missing');
      const files = await res.json();
      renderGrid(Array.isArray(files) ? files : []);
    } catch (err) {
      grid.innerHTML = '<div class="folder-empty">couldn\'t load assets/art/manifest.json -- add images to assets/art/ and list their filenames there.</div>';
      status.textContent = 'art/';
    }
  }

  function renderGrid(files) {
    if (!files.length) {
      grid.innerHTML = '<div class="folder-empty">this folder is empty. drop images into assets/art/ and list them in manifest.json.</div>';
      status.textContent = 'art/ (0 items)';
      return;
    }

    status.textContent = `art/ (${files.length} item${files.length === 1 ? '' : 's'})`;
    grid.innerHTML = '';

    files.forEach((filename) => {
      const item = document.createElement('div');
      item.className = 'folder-item';

      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'thumb-wrap';
      const img = document.createElement('img');
      img.src = `assets/art/${filename}`;
      img.alt = filename;
      thumbWrap.appendChild(img);

      const label = document.createElement('span');
      label.textContent = filename;

      item.appendChild(thumbWrap);
      item.appendChild(label);
      item.addEventListener('dblclick', () => openImage(filename));

      grid.appendChild(item);
    });
  }

  function openImage(filename) {
    viewerCount += 1;
    const id = `imageviewer-${viewerCount}`;
    const el = window.OS.createDynamicWindow('image-viewer-template', {
      id,
      title: filename,
      icon: 'assets/icons/icon5.ico',
    });

    const img = el.querySelector('.image-viewer-img');
    img.src = `assets/art/${filename}`;
    img.alt = filename;

    window.OS.openWindow(id);
  }

  // load the folder contents the first time the Gallery window is opened,
  // not before -- no point fetching the manifest if she's never clicked it
  window.OS.registerFirstOpen('gallery-window', loadManifest);
})();
