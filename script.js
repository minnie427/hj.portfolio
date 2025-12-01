// Simple automatic slideshow
document.addEventListener("DOMContentLoaded", () => {
  const slides = document.querySelectorAll(".slide");
  if (slides.length) {
    let current = 0;
    const delay = 4000; // time per image in ms (6000 = 6 seconds)

    function showSlide(index) {
      slides.forEach((slide, i) => {
        slide.classList.toggle("active", i === index);
      });
    }

    function nextSlide() {
      current = (current + 1) % slides.length;
      showSlide(current);
    }

    // Show the first slide (in case 'active' class is removed later)
    showSlide(current);

    // Start automatic rotation
  setInterval(nextSlide, delay);
}

// Mobile nav toggle
const hamburgerBtn = document.querySelector(".hamburger-btn");
const navDrawer = document.querySelector(".nav-drawer");
const body = document.body;

function closeNav() {
  body.classList.remove("nav-open");
  if (hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", "false");
  }

  function toggleNav() {
    const isOpen = body.classList.toggle("nav-open");
    if (hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

if (hamburgerBtn && navDrawer) {
  hamburgerBtn.addEventListener("click", toggleNav);
  navDrawer.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeNav);
  });
  document.addEventListener("keyup", (e) => {
    if (e.key === "Escape") closeNav();
  });
}
});
