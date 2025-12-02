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

  // Detail pages: swap thumbs to full images after load
  const detailImages = document.querySelectorAll(".feature-image img");
  detailImages.forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (!src.includes("/thumbs/")) return;
    const fullSrc = src.replace("/thumbs/", "/");

    const hiRes = new Image();
    hiRes.decoding = "async";
    hiRes.onload = () => {
      img.src = fullSrc;
    };
    hiRes.src = fullSrc;
  });
});
