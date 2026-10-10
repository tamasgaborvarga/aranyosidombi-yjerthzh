/* Aranyosi Dombi Udvarház — oldal-interakciók (menü, lightbox, nyitvatartás, térkép). */
(() => {
  window.__adReady = true; // a fejléc biztonsági hálója ebből tudja, hogy a szkript elindult
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* Fókuszcsapda: a Tab nem léphet ki a nyitott menüből / képnézegetőből */
  const trapFocus = (box, e) => {
    const f = [box].flat().flatMap((b) => $$('a[href], button:not([hidden])', b)).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0]; const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  /* Mobilmenü */
  const toggle = $('#menu-toggle');
  const menu = $('#mobile-menu');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    document.body.classList.toggle('overflow-hidden', open);
    toggle.setAttribute('aria-label', open ? 'Menü bezárása' : 'Menü');
  };
  toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('#mobile-menu a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => {
    if (menu.hidden) return;
    if (e.key === 'Escape') { setMenu(false); toggle.focus(); }
    // a csapda a menügombot is tartalmazza, hogy billentyűzettel be lehessen zárni
    if (e.key === 'Tab') trapFocus([$('#site-header'), menu], e);
  });
  matchMedia('(min-width: 1024px)').addEventListener('change', (e) => e.matches && setMenu(false));

  /* Fejléc árnyék + aktív menüpont */
  const header = $('#site-header');
  const onScroll = () => header.classList.toggle('shadow-[0_6px_24px_-16px_rgb(21_42_30/0.45)]', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const links = $$('[data-nav]');
  const navIO = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    links.forEach((l) => l.setAttribute('aria-current', String(l.getAttribute('href') === '#' + en.target.id)));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => navIO.observe(s));

  /* Mozgás: a címsor és a hero-képek a fontok betöltése után indulnak; szöveg és nyíl görgetésre jelenik meg (a többi kép nem animál) */
  const root = document.documentElement;
  const start = () => requestAnimationFrame(() => root.classList.add('is-loaded'));
  (document.fonts?.ready || Promise.resolve()).then(start);
  setTimeout(start, 1200); // biztonsági háló lassú fonthoz

  // az egyszerre beérkező blokkok lépcsőzetesen jelennek meg (asztalon 80, mobilon 50 ms); a saját --d érintetlen marad.
  // Az idővonal évei ennél lassabban (800 ms): a következő év akkor bukkan fel, amikor a vonal odaér.
  const STEP = matchMedia('(max-width: 767px)').matches ? 50 : 80;
  const io = new IntersectionObserver((entries) => {
    const batch = entries.filter((en) => en.isIntersecting).map((en) => en.target);
    let n = 0; let years = 0;
    batch.forEach((el) => {
      const isYear = el.classList.contains('tl-item');
      const d = isYear ? years++ * 800 : Math.min(n++, 4) * STEP;
      if (batch.length > 1 && !el.style.getPropertyValue('--d')) el.style.setProperty('--d', `${d}ms`);
      el.classList.add('in'); io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal, .draw, .step, .tl-item').forEach((el) => io.observe(el));


  /* Hero-kollázs: a rétegek eltérő sebességgel mozdulnak görgetéskor (mélység) */
  const layers = $$('[data-depth]');
  if (layers.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let busy = false;
    const move = () => {
      const y = Math.min(scrollY, innerHeight * 1.2);
      layers.forEach((el) => el.style.setProperty('--depth-y', `${(y * Number(el.dataset.depth)).toFixed(1)}px`));
      busy = false;
    };
    addEventListener('scroll', () => { if (!busy) { busy = true; requestAnimationFrame(move); } }, { passive: true });
  }

  /* Mai nap kiemelése a nyitvatartásban (0 = vasárnap) */
  const today = new Date().getDay();
  $$('[data-day]').forEach((row) => {
    if (Number(row.dataset.day) !== today) return;
    row.classList.add('bg-forest', 'text-paper');
    row.querySelector('[data-today]')?.removeAttribute('hidden');
  });

  /* „Ma” állapot a hero alatt — a nyitvatartás-táblázat az egyetlen adatforrás */
  const status = $('#today-status');
  const row = $(`[data-day="${today}"]`);
  if (status && row) {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const { open: o, close: c } = row.dataset;
    const DAYS = ['vasárnap', 'hétfőn', 'kedden', 'szerdán', 'csütörtökön', 'pénteken', 'szombaton'];
    // a következő nyitás a táblázatból: holnap, vagy a hét következő nyitvatartási napja
    const next = () => {
      for (let i = 1; i <= 7; i++) {
        const d = (today + i) % 7;
        const r = $(`[data-day="${d}"]`);
        if (r?.dataset.open) return `${i === 1 ? 'Holnap' : DAYS[d][0].toUpperCase() + DAYS[d].slice(1)} ${r.dataset.open}-kor nyitunk.`;
      }
      return '';
    };
    let text; let isOpen = false;
    if (!o) text = `Ma zárva vagyunk. ${next()}`;
    else if (mins < toMin(o)) text = `Ma ${o}-kor nyitunk, ${c}-ig várjuk.`;
    else if (mins < toMin(c)) { text = `Most nyitva, ma ${c}-ig.`; isOpen = true; }
    else text = `Mára már bezártunk. ${next()}`;
    $('#today-text').textContent = `${text} `;
    const link = Object.assign(document.createElement('a'), { href: '#nyitvatartas', textContent: 'Nyitvatartás', className: 'font-semibold text-forest underline decoration-line underline-offset-4 hover:decoration-forest' });
    $('#today-text').append(link);
    $('#today-dot').classList.toggle('bg-moss', isOpen);
    $('#today-dot').classList.toggle('bg-clay', !isOpen);
    status.hidden = false;
  }

  /* Lightbox */
  const lb = $('#lightbox');
  const lbImg = $('#lb-img');
  const lbCap = $('#lb-cap');
  let items = [];
  let idx = 0; let lastFocus = null;
  const show = (i) => {
    idx = (i + items.length) % items.length;
    const a = items[idx];
    // lapozáskor az új kép halkan beúszik (a betöltéséig átlátszó)
    lbImg.classList.add('is-swapping');
    lbImg.onload = () => lbImg.classList.remove('is-swapping');
    lbImg.src = a.getAttribute('href');
    lbImg.alt = a.querySelector('img')?.alt || '';
    lbCap.textContent = items.length > 1 ? `${idx + 1} / ${items.length} — ${lbImg.alt}` : lbImg.alt;
    $('#lb-prev').hidden = $('#lb-next').hidden = items.length < 2;
  };
  // nyitás/zárás halk áttűnéssel: a hidden csak az áttűnés végén kerül vissza
  let lbTimer = 0;
  const open = (i) => {
    clearTimeout(lbTimer); lastFocus = document.activeElement; show(i); lb.hidden = false;
    void lb.offsetWidth; lb.classList.add('is-open');
    document.body.classList.add('overflow-hidden'); $('#lb-close').focus();
  };
  const close = () => {
    lb.classList.remove('is-open'); document.body.classList.remove('overflow-hidden'); lastFocus?.focus();
    lbTimer = setTimeout(() => { lb.hidden = true; lbImg.removeAttribute('src'); }, 260);
  };
  // csoportonként lapoz (a galéria és az oklevél külön sorozat)
  $$('[data-lb]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    items = $$(`[data-lb="${a.dataset.lb}"]`);
    open(items.indexOf(a));
  }));
  $('#lb-close')?.addEventListener('click', close);
  $('#lb-prev')?.addEventListener('click', () => show(idx - 1));
  $('#lb-next')?.addEventListener('click', () => show(idx + 1));
  lb?.addEventListener('click', (e) => { if (e.target === lb) close(); });
  addEventListener('keydown', (e) => {
    if (lb.hidden || !lb.classList.contains('is-open')) return;
    if (e.key === 'Tab') trapFocus(lb, e);
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
  let x0 = null;
  lb?.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb?.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  /* Térkép: csak kattintásra töltődik be (addig nincs Google-kérés) */
  $('#map-load')?.addEventListener('click', () => {
    const box = $('#map-box');
    box.innerHTML = '<iframe title="Aranyosi Dombi Udvarház a térképen — 3388 Poroszló, Fő út 24." class="absolute inset-0 h-full w-full border-0" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=47.642851,20.651661&z=16&hl=hu&output=embed"></iframe>';
  });

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
