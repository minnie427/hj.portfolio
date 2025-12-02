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

// Progressive load for artwork grid
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector(".art-grid");
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll(".art-card"));
  const batchSize = 8;
  if (cards.length <= batchSize) return;

  cards.slice(batchSize).forEach((card) => card.classList.add("hidden"));

  const btn = document.createElement("button");
  btn.className = "load-more";
  btn.type = "button";
  btn.textContent = "Load more artworks";
  grid.insertAdjacentElement("afterend", btn);

  let shown = batchSize;
  btn.addEventListener("click", () => {
    const next = cards.slice(shown, shown + batchSize);
    next.forEach((card) => card.classList.remove("hidden"));
    shown += next.length;
    if (shown >= cards.length) {
      btn.remove();
    }
  });
});

// Lightweight image lazy-loader for artwork grid
document.addEventListener("DOMContentLoaded", () => {
  const imgs = Array.from(document.querySelectorAll(".art-grid img"));
  if (!imgs.length) return;

  const placeholder =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

  imgs.forEach((img) => {
    if (!img.dataset.src) {
      img.dataset.src = img.getAttribute("src");
      img.setAttribute("src", placeholder);
    }
  });

  const onIntersect = (entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const realSrc = img.dataset.src;
        if (realSrc) {
          img.src = realSrc;
          img.removeAttribute("data-src");
        }
        obs.unobserve(img);
      }
    });
  };

  const observer = new IntersectionObserver(onIntersect, {
    rootMargin: "300px 0px",
    threshold: 0.01,
  });

  imgs.forEach((img) => observer.observe(img));
});
