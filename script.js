// Slideshow
document.addEventListener("DOMContentLoaded", () => {
  // iOS Safari zooms in when a form control under 16px gets focus (the Sort menu).
  // maximum-scale stops that; iOS still lets people pinch-zoom.
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const vp = document.querySelector('meta[name="viewport"]');
  if (isIOS && vp && !/maximum-scale/.test(vp.content)) vp.content += ", maximum-scale=1";

  const slides = document.querySelectorAll(".slide");
  const slideshow = document.querySelector(".slideshow");
  if (slides.length) {
    let current = 0;
    const delay = 3000;
    let autoTimer;

    const showSlide = (index) => {
      slides.forEach((slide, i) => slide.classList.toggle("active", i === index));
    };

    const nextSlide = () => {
      current = (current + 1) % slides.length;
      showSlide(current);
    };

    const prevSlide = () => {
      current = (current - 1 + slides.length) % slides.length;
      showSlide(current);
    };

    showSlide(current);
    const startAuto = () => {
      clearInterval(autoTimer);
      autoTimer = setInterval(nextSlide, delay);
    };
    startAuto();

    if (slideshow) {
      let startX = 0;
      let isDragging = false;

      const onPointerDown = (clientX) => {
        isDragging = true;
        startX = clientX;
        clearInterval(autoTimer);
      };

      const onPointerMove = (clientX) => {
        if (!isDragging) return;
        // no visual drag needed; just track delta
      };

      const onPointerUp = (clientX) => {
        if (!isDragging) return;
        const delta = clientX - startX;
        const threshold = 50;
        if (delta > threshold) {
          prevSlide();
        } else if (delta < -threshold) {
          nextSlide();
        }
        isDragging = false;
        startAuto();
      };

      slideshow.addEventListener("pointerdown", (e) => onPointerDown(e.clientX));
      slideshow.addEventListener("pointermove", (e) => onPointerMove(e.clientX));
      slideshow.addEventListener("pointerup", (e) => onPointerUp(e.clientX));
      slideshow.addEventListener("pointerleave", (e) => onPointerUp(e.clientX));

      // Touch support (for older browsers without pointer events)
      slideshow.addEventListener(
        "touchstart",
        (e) => {
          if (e.touches.length === 1) onPointerDown(e.touches[0].clientX);
        },
        { passive: true }
      );
      slideshow.addEventListener(
        "touchend",
        (e) => {
          const touch = e.changedTouches[0];
          if (touch) onPointerUp(touch.clientX);
        },
        { passive: true }
      );
    }
  }

  // Mobile nav toggle
  const hamburgerBtn = document.querySelector(".hamburger-btn");
  const navDrawer = document.querySelector(".nav-drawer");
  const body = document.body;

  const closeNav = () => {
    body.classList.remove("nav-open");
    if (hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", "false");
  };

  const toggleNav = () => {
    const isOpen = body.classList.toggle("nav-open");
    if (hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  };

  if (hamburgerBtn && navDrawer) {
    hamburgerBtn.addEventListener("click", toggleNav);
    navDrawer.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNav));
    document.addEventListener("keyup", (e) => {
      if (e.key === "Escape") closeNav();
    });
  }

  // Detail pages: show the small thumb first, then swap to the web-size image (images/web)
  const detailImages = document.querySelectorAll(".feature-image img");
  detailImages.forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (!src.includes("/thumbs/")) return;
    const fullSrc = src.replace("/thumbs/", "/web/");

    const hiRes = new Image();
    hiRes.decoding = "async";
    hiRes.onload = () => {
      img.src = fullSrc;
    };
    hiRes.src = fullSrc;
  });

  // Language toggle (EN / KO) — initial language is set by the inline script in <head>
  const root = document.documentElement;
  const titles = { en: document.title, ko: root.dataset.titleKo || document.title };
  const langButtons = document.querySelectorAll("[data-set-lang]");
  const applyLang = (lang) => {
    root.setAttribute("data-lang", lang);
    root.lang = lang;
    document.title = titles[lang];
    langButtons.forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.setLang === lang)));
    try {
      localStorage.setItem("lang", lang);
    } catch (e) {}
    document.dispatchEvent(new CustomEvent("langchange", { detail: lang }));
  };
  applyLang(root.getAttribute("data-lang") === "ko" ? "ko" : "en");
  langButtons.forEach((btn) => btn.addEventListener("click", () => applyLang(btn.dataset.setLang)));
  // Drop ?lang= from the address bar once applied, so the saved choice wins afterwards
  try {
    const url = new URL(location.href);
    if (url.searchParams.has("lang")) {
      url.searchParams.delete("lang");
      history.replaceState(null, "", url);
    }
  } catch (e) {}

  // Header: take the page colour once the page scrolls (inner pages)
  const siteHeader = document.querySelector(".site-header");
  if (siteHeader) {
    const onScroll = () => siteHeader.classList.toggle("is-scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Process: the time-lapse plays silently on a loop; with reduced motion the still stays
  document.querySelectorAll("video.pr-video").forEach((v) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { v.removeAttribute("autoplay"); v.pause(); return; }
    v.muted = true;
    const pr = v.play();
    if (pr && pr.catch) pr.catch(() => {});
  });

  // Footer year
  const year = String(new Date().getFullYear());
  document.querySelectorAll(".js-year").forEach((el) => (el.textContent = year));
});

// Ink on hanji: the page is the paper. Moving the mouse lets a faint wash of ink seep in and fade;
// a click drops a drop of ink that slowly bleeds outward, then dries away.
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const cv = document.createElement("canvas");
  cv.className = "ink-layer";
  cv.setAttribute("aria-hidden", "true");
  document.body.appendChild(cv);
  const cx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  addEventListener("resize", size);

  const blots = []; // {x, y, r0, r1, a, t0, grow, life, ink}
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const rnd = (a, b) => a + Math.random() * (b - a);

  function blot(x, y, r0, r1, a, grow, life, ink, rim) {
    blots.push({ x, y, r0, r1, a, t0: performance.now(), grow, life, ink, rim: !!rim });
    if (blots.length > 420) blots.splice(0, blots.length - 420);
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  // a watery stain: dense core, soft rim, a little darker at the drying edge
  function paint(b, now) {
    const t = now - b.t0;
    if (t > b.life) return false;
    const g = ease(Math.min(1, t / b.grow));
    const r = b.r0 + (b.r1 - b.r0) * g;
    const fade = t < b.life * 0.55 ? 1 : 1 - (t - b.life * 0.55) / (b.life * 0.45);
    const a = b.a * fade;
    const grad = cx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
    const c = b.ink;
    grad.addColorStop(0, `rgba(${c},${a})`);
    if (b.rim) {            // a drying drop: slightly darker just inside its edge
      grad.addColorStop(0.6, `rgba(${c},${a * 0.8})`);
      grad.addColorStop(0.84, `rgba(${c},${a * 0.92})`);
    } else {                // a wash: simply fades into the paper
      grad.addColorStop(0.45, `rgba(${c},${a * 0.7})`);
    }
    grad.addColorStop(1, `rgba(${c},0)`);
    cx.fillStyle = grad;
    cx.beginPath(); cx.arc(b.x, b.y, r, 0, Math.PI * 2); cx.fill();
    return true;
  }

  let running = false;
  function frame(now) {
    cx.clearRect(0, 0, W, H);
    for (let i = blots.length - 1; i >= 0; i--) if (!paint(blots[i], now)) blots.splice(i, 1);
    if (blots.length) requestAnimationFrame(frame); else running = false;
  }

  // moving: a faint grey wash that seeps in behind the pointer
  if (fine) {
    let lx = -1, ly = -1;
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const d = Math.hypot(e.clientX - lx, e.clientY - ly);
      if (lx >= 0 && d < 5) return;
      lx = e.clientX; ly = e.clientY;
      blot(lx + rnd(-4, 4), ly + rnd(-4, 4), rnd(3, 6), rnd(22, 40), rnd(0.018, 0.03), rnd(1800, 2800), rnd(3600, 4800), "40,38,36");
    }, { passive: true });
  }

  // a click: a drop of ink that blooms unevenly, with a pale bleed around it
  addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const x = e.clientX, y = e.clientY;
    blot(x, y, 0, rnd(80, 110), 0.06, 6500, 10000, "60,58,55");           // the pale water bleeding out first
    blot(x, y, 1, rnd(16, 22), 0.6, 2400, 9000, "22,21,20", true);        // the drop
    const n = 12 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {                                         // uneven fibres the ink runs along
      const ang = rnd(0, Math.PI * 2), dist = rnd(4, 26);
      blot(x + Math.cos(ang) * dist, y + Math.sin(ang) * dist, 0, rnd(6, 20), rnd(0.12, 0.3), rnd(3000, 6500), rnd(8000, 10000), "26,25,24", Math.random() < 0.5);
    }
  }, { passive: true });
})();
