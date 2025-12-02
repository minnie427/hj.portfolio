// Slideshow
document.addEventListener("DOMContentLoaded", () => {
  const slides = document.querySelectorAll(".slide");
  if (slides.length) {
    let current = 0;
    const delay = 4000;

    const showSlide = (index) => {
      slides.forEach((slide, i) => slide.classList.toggle("active", i === index));
    };

    const nextSlide = () => {
      current = (current + 1) % slides.length;
      showSlide(current);
    };

    showSlide(current);
    setInterval(nextSlide, delay);
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
});
