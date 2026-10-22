// Slideshow
document.addEventListener("DOMContentLoaded", () => {
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

  // Footer year
  const year = String(new Date().getFullYear());
  document.querySelectorAll(".js-year").forEach((el) => (el.textContent = year));
});
