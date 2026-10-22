// Home — passe-partout hero.
// Three resting states: full-bleed (0) → halfway (0.5) → the whole work on a white wall (1).
// One scroll / swipe / key press moves one step; a spring drives the motion so a second
// gesture mid-move continues smoothly. After the last step the page scrolls on to the footer.
(function () {
  const root = document.querySelector(".pp");
  if (!root) return;

  const stage = root.querySelector(".pp-stage");
  const imgs = [...root.querySelectorAll(".pp-img")];
  const caps = [...root.querySelectorAll(".pp-cap")];
  const hint = root.querySelector(".pp-hint");
  const counter = root.querySelector(".pp-cn");
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STOPS = [0, 0.5, 1];
  const n = imgs.length;

  let p = 0, v = 0, target = 0, snap = 0, running = false, last = 0, cur = 0;
  const lerp = (a, b, t) => a + (b - a) * t;
  const isMobile = () => window.matchMedia("(max-width: 600px)").matches;

  // Geometry of one image: start (cover, centred) and end (contained between header and caption)
  function geo(img) {
    const b = stage.getBoundingClientRect();
    const Sw = b.width / b.height;
    const ir = img.naturalHeight / img.naturalWidth || 1;
    const Ih = Sw * ir; // image height in stage heights when the image spans the full width
    const cs = getComputedStyle(stage);
    const t = parseFloat(cs.getPropertyValue("--top")) / b.height;
    const bo = parseFloat(cs.getPropertyValue("--bot")) / b.height;
    let s0 = 1, tx0 = 0, ty0;
    if (Ih >= 1) ty0 = (-(Ih - 1) / 2 / Ih) * 100;
    else { s0 = 1 / Ih; tx0 = ((1 - s0) / 2) * 100; ty0 = 0; }
    const avail = 1 - t - bo;
    const c = Math.min(avail / Ih, 0.84);
    const y = t + (avail - c * Ih) / 2;
    return { c, a: { tx: tx0, ty: ty0, s: s0 }, b: { tx: ((1 - c) / 2) * 100, ty: (y / Ih) * 100, s: c } };
  }

  function paint() {
    imgs.forEach((img) => {
      if (!img.naturalWidth) return;
      const g = img._g || (img._g = geo(img));
      img.style.transform = `translate3d(${lerp(g.a.tx, g.b.tx, p)}%, ${lerp(g.a.ty, g.b.ty, p)}%, 0) scale(${lerp(g.a.s, g.b.s, p)})`;
    });
    body.classList.toggle("hero-light", p >= 0.4);
    caps.forEach((c) => c.classList.toggle("is-shown", p > 0.97));
    if (hint) hint.style.opacity = p < 0.02 ? 1 : 0;
  }

  // On phones the caption starts on the same vertical line as the work's left edge
  function alignCaps() {
    caps.forEach((cap, i) => {
      const img = imgs[i];
      if (!isMobile() || !img.naturalWidth) { cap.style.left = ""; cap.style.maxWidth = ""; return; }
      const g = img._g || (img._g = geo(img));
      cap.style.left = ((1 - g.c) / 2) * 100 + "%";
      cap.style.maxWidth = g.c * 100 + "%";
    });
  }

  const K = 60, C = 2 * Math.sqrt(K) * 0.94;
  function tick(now) {
    const dt = Math.min(0.032, (now - last) / 1000);
    last = now;
    v += ((target - p) * K - C * v) * dt;
    p += v * dt;
    if (Math.abs(target - p) < 0.0008 && Math.abs(v) < 0.002) { p = target; v = 0; running = false; paint(); return; }
    paint();
    requestAnimationFrame(tick);
  }

  function go(to) {
    to = Math.max(0, Math.min(2, to));
    if (to === snap && !running) return;
    snap = to;
    target = STOPS[to];
    if (reduceMotion) { p = target; paint(); return; }
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
  }

  const atTop = () => window.scrollY <= 1;
  const menuOpen = () => body.classList.contains("nav-open");

  // Wheel / trackpad: a new gesture starts after a pause or when it accelerates again,
  // so the inertia tail of one flick never skips the halfway stop.
  let lastT = 0, lastA = 0, decaying = false;
  window.addEventListener("wheel", (ev) => {
    if (menuOpen()) return;
    const now = performance.now(), dA = Math.abs(ev.deltaY);
    const fresh = now - lastT > 140 || (decaying && dA > lastA * 1.8 && dA > 10);
    if (fresh) decaying = false; else if (dA < lastA) decaying = true;
    lastT = now; lastA = dA;
    if (!atTop()) return;                                    // scrolling the rest of the page
    if (snap === 2 && !running && ev.deltaY > 0) return;     // finished: continue to the footer
    ev.preventDefault();
    if (!fresh || dA < 1) return;
    go(snap + (ev.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  // Touch
  let ty = null;
  window.addEventListener("touchstart", (ev) => { ty = ev.touches[0].clientY; }, { passive: true });
  window.addEventListener("touchmove", (ev) => {
    if (ty === null || menuOpen() || !atTop()) return;
    const dy = ty - ev.touches[0].clientY;
    if (snap === 2 && dy > 0 && !running) return;
    ev.preventDefault();
    if (Math.abs(dy) < 8) return;
    go(snap + (dy > 0 ? 1 : -1));
    ty = null;
  }, { passive: false });

  // Keyboard
  window.addEventListener("keydown", (ev) => {
    const el = ev.target && ev.target.closest ? ev.target : null;
    if (menuOpen() || (el && el.closest("input, select, textarea"))) return;
    if (ev.key === " " && el && el.closest("button, a")) return;
    if (ev.key === "ArrowRight") show(cur + 1);
    if (ev.key === "ArrowLeft") show(cur - 1);
    if (!atTop()) return;
    const down = ev.key === "ArrowDown" || ev.key === "PageDown" || ev.key === " ";
    const up = ev.key === "ArrowUp" || ev.key === "PageUp";
    if (down && snap < 2) { ev.preventDefault(); go(snap + 1); }
    if (up && snap > 0) { ev.preventDefault(); go(snap - 1); }
  });

  // Choosing a work
  function show(k) {
    cur = (k + n) % n;
    imgs.forEach((im, i) => im.classList.toggle("is-on", i === cur));
    caps.forEach((c, i) => c.classList.toggle("is-on", i === cur));
    if (counter) counter.textContent = String(cur + 1).padStart(2, "0");
  }
  root.querySelector(".pp-prev")?.addEventListener("click", () => show(cur - 1));
  root.querySelector(".pp-next")?.addEventListener("click", () => show(cur + 1));

  // Images: first one loads with the page, the rest right after
  imgs.forEach((img) => img.addEventListener("load", () => { img._g = 0; paint(); alignCaps(); }));
  const loadRest = () => imgs.forEach((img) => { if (img.dataset.src && !img.getAttribute("src")) img.src = img.dataset.src; });
  if (document.readyState === "complete") loadRest(); else window.addEventListener("load", loadRest);

  window.addEventListener("resize", () => { imgs.forEach((i) => (i._g = 0)); paint(); alignCaps(); });

  show(0);
  paint();
  alignCaps();
})();
