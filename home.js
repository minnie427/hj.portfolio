// Home — passe-partout hero that plays by itself.
// On load the first work opens full-bleed, then settles back onto the white wall.
// From there the works change by themselves every few seconds; the arrows (and ← →) still work.
// Scrolling is ordinary page scrolling down to the footer.
(function () {
  const root = document.querySelector(".pp");
  if (!root) return;

  const stage = root.querySelector(".pp-stage");
  const imgs = [...root.querySelectorAll(".pp-img")];
  const caps = [...root.querySelectorAll(".pp-cap")];
  const counter = root.querySelector(".pp-cn");
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const n = imgs.length;

  const HOLD = 1300;  // full-bleed pause before the pull-back (ms)
  const MOVE = 2800;  // pull-back duration (ms)
  const DWELL = 5500; // time each work stays on the wall (ms)

  let p = 0, cur = 0, timer = 0, started = false, settled = false;
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
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
    const c = Math.min(avail / Ih, 0.9);
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

  // 1. the opening: full-bleed → whole work on the wall, once
  function intro() {
    if (started) return;
    started = true;
    if (reduceMotion) { p = 1; paint(); settled = true; schedule(); return; }
    setTimeout(() => {
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / MOVE);
        p = ease(t);
        paint();
        if (t < 1) requestAnimationFrame(step);
        else { settled = true; schedule(); }
      };
      requestAnimationFrame(step);
    }, HOLD);
  }

  // 2. then the works change by themselves
  function schedule() {
    clearTimeout(timer);
    if (settled) timer = setTimeout(next, DWELL);
  }
  function next() {
    if (document.hidden) return schedule();
    const k = (cur + 1) % n;
    if (!imgs[k].naturalWidth) { timer = setTimeout(next, 800); return; } // still loading
    show(k);
    schedule();
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

  // Choosing a work by hand restarts the timer
  function show(k) {
    cur = (k + n) % n;
    imgs.forEach((im, i) => im.classList.toggle("is-on", i === cur));
    caps.forEach((c, i) => c.classList.toggle("is-on", i === cur));
    if (counter) counter.textContent = String(cur + 1).padStart(2, "0");
  }
  root.querySelector(".pp-prev")?.addEventListener("click", () => { show(cur - 1); schedule(); });
  root.querySelector(".pp-next")?.addEventListener("click", () => { show(cur + 1); schedule(); });
  window.addEventListener("keydown", (ev) => {
    const el = ev.target && ev.target.closest ? ev.target : null;
    if (body.classList.contains("nav-open") || (el && el.closest("input, select, textarea"))) return;
    if (ev.key === "ArrowRight") { show(cur + 1); schedule(); }
    if (ev.key === "ArrowLeft") { show(cur - 1); schedule(); }
  });

  // Images: first one loads with the page (and starts the opening), the rest right after
  imgs.forEach((img) => img.addEventListener("load", () => { img._g = 0; paint(); alignCaps(); }));
  const first = imgs[0];
  if (first.complete && first.naturalWidth) intro();
  else { first.addEventListener("load", intro, { once: true }); first.addEventListener("error", intro, { once: true }); }
  const loadRest = () => imgs.forEach((img) => { if (img.dataset.src && !img.getAttribute("src")) img.src = img.dataset.src; });
  if (document.readyState === "complete") loadRest(); else window.addEventListener("load", loadRest);

  window.addEventListener("resize", () => { imgs.forEach((i) => (i._g = 0)); paint(); alignCaps(); });

  show(0);
  paint();
  alignCaps();
})();
