/*
 * contacts.js — the Contacts app.
 *
 * Same folder-grid pattern as gallery.js: a list of people is laid out
 * as tiles in the Contacts window, and double-clicking one opens a
 * fresh profile card (cloned from the hidden #contact-viewer-template)
 * with their picture and blurb.
 *
 * Add/edit people in the CONTACTS array below. Each `img` is expected
 * to live at assets/contacts/<img>.
 */

(function () {
  const CONTACTS = [
    { id: 'novo', name: 'Novo', img: 'novo.png', blurb: 'Nice cute boi who loves his bots and his friends.' },
    { id: 'nyat', name: 'Nyat / Nats', img: 'nyat.png', blurb: 'Kind, loving and adorable catgirl who has saved many people and loves everyone around her.' },
    { id: 'hazzy', name: 'Hazzy / Stum <3', img: 'hazzy.png', blurb: 'Cutie sheepy girl who makes amazing lore for her characters and makes cute characters.' },
    { id: 'octav', name: 'Octav', img: 'octav.png', blurb: 'Man who loves his Wii U parties and his frutiger aero. Cute lil cat boi.' },
    { id: 'lily', name: 'Lily', img: 'lily.png', blurb: "Emily's alter ego, a noisy bitch. She's annoying, rude, and mean, but Emily still loves her." },
    { id: 'honi', name: 'Honi', img: 'honi.png', blurb: 'An amazing modder who makes some great mods for CoopDX, and an amazing person to the people around her.' },
    { id: 'dogse', name: 'Dogse', img: 'dogse.png', blurb: 'Despite his name, he is the rat king who watches over his rat kingdom. He knows how to cheer someone up.' },
    { id: 'bucky', name: 'Bucky', img: 'bucky.png', blurb: 'The cutest, most adorable boi in the whole world. Kind and sweet :3' },
    { id: 'vinny', name: 'Vinny', img: 'vinny.png', blurb: 'Luigi.' },
    { id: 'saturn', name: 'Sarah / Saturn', img: 'saturn.png', blurb: "She and Nyat have saved me many, many times when I was done with everything. Without her and Nyat, I wouldn't be here. A kind person who cares for her friends (big tall girl)." },
    { id: 'xonida', name: 'Xonida', img: 'xonida.png', blurb: 'Boi who loves his old tech. Such an amazing silly goober.' },
    { id: 'vivian', name: 'Vivian', img: 'vivian.png', blurb: 'A cute lil critter, great at Geometry Dash.' },
    { id: 'barry', name: 'Barry', img: 'barry.png', blurb: 'A cute lil critter, great at Geometry Dash.' },
    { id: 'grass', name: 'Grass', img: 'grass.png', blurb: 'A lover of Dot from Pokemon, and an amazing fwen who can bring a smile :>' },
    { id: '2b', name: '2B', img: '2b.png', blurb: 'ADDICTED to Nier and 9S -- but outside of that, an amazing person.' },
  ];

  const grid = document.getElementById('contacts-grid');
  const status = document.getElementById('contacts-status');
  let viewerCount = 0;

  function renderGrid() {
    status.textContent = `contacts/ (${CONTACTS.length} item${CONTACTS.length === 1 ? '' : 's'})`;
    grid.innerHTML = '';

    CONTACTS.forEach((person) => {
      const item = document.createElement('div');
      item.className = 'folder-item contact-item';

      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'thumb-wrap';
      const img = document.createElement('img');
      img.src = `assets/contacts/${person.img}`;
      img.alt = person.name;
      thumbWrap.appendChild(img);

      const label = document.createElement('span');
      label.textContent = person.name;

      item.appendChild(thumbWrap);
      item.appendChild(label);
      item.addEventListener('dblclick', () => openContact(person));

      grid.appendChild(item);
    });
  }

  function openContact(person) {
    viewerCount += 1;
    const id = `contactviewer-${viewerCount}`;
    const el = window.OS.createDynamicWindow('contact-viewer-template', {
      id,
      title: person.name,
      icon: 'assets/icons/contacts.ico',
    });

    el.querySelector('.contact-viewer-photo').src = `assets/contacts/${person.img}`;
    el.querySelector('.contact-viewer-photo').alt = person.name;
    el.querySelector('.contact-viewer-name').textContent = person.name;
    el.querySelector('.contact-viewer-blurb').textContent = person.blurb;

    window.OS.openWindow(id);
  }

  // build the grid the first time the Contacts window is opened
  window.OS.registerFirstOpen('contacts-window', renderGrid);
})();
