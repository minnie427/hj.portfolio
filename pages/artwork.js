// Artwork list — sort (newest / oldest / title) and Grid / Index views.
// The grid is plain HTML (works without JS); this script reorders it and builds the index.
(function () {
  const grid = document.querySelector(".aw-grid");
  if (!grid) return;
  const index = document.querySelector(".aw-index");
  const list = index.querySelector(".ix-list");
  const pv = index.querySelector(".ix-pv");
  const pvImg = pv.querySelector("img");
  const pvT = pv.querySelector(".aw-t");
  const pvM = pv.querySelector(".aw-m");
  const select = document.querySelector(".aw-sort select");
  const viewBtns = [...document.querySelectorAll(".aw-view button")];
  const cards = [...grid.querySelectorAll(".aw")];
  const LABELS = {
    en: { new: "Newest", old: "Oldest", title: "Title A–Z" },
    ko: { new: "최신순", old: "오래된순", title: "제목순" },
  };
  const lang = () => (document.documentElement.lang === "ko" ? "ko" : "en");
  const year = (c) => +c.dataset.year || 0;
  const id = (c) => +c.dataset.id;
  const title = (c) => (c.querySelector(`.aw-t [lang="${lang()}"]`) || c.querySelector(".aw-t")).textContent.trim();

  function sorted() {
    const a = cards.slice();
    const s = select.value;
    if (s === "title") return a.sort((x, y) => title(x).localeCompare(title(y), lang()));
    return a.sort((x, y) => {
      const yx = year(x), yy = year(y);
      if (!yx || !yy) return !yx && !yy ? id(y) - id(x) : !yx ? 1 : -1; // undated works last
      return s === "new" ? yy - yx || id(y) - id(x) : yx - yy || id(x) - id(y);
    });
  }

  function preview(card, row) {
    const img = card.querySelector("img");
    pvImg.src = img.getAttribute("src");
    pvImg.alt = img.alt;
    pvT.innerHTML = card.querySelector(".aw-t").innerHTML;
    pvM.textContent = card.querySelector(".aw-m").textContent;
    list.querySelectorAll(".ix-row").forEach((r) => r.classList.toggle("is-on", r === row));
  }

  function buildIndex(order) {
    list.innerHTML = "";
    order.forEach((card, i) => {
      const row = document.createElement("a");
      row.className = "ix-row";
      row.href = card.getAttribute("href");
      const th = document.createElement("img");
      th.className = "ix-th";
      th.alt = "";
      th.loading = "lazy";
      th.decoding = "async";
      th.src = card.querySelector("img").getAttribute("src");
      const num = document.createElement("span");
      num.className = "ix-n";
      num.textContent = String(i + 1).padStart(2, "0");
      const t = document.createElement("span");
      t.className = "ix-t";
      t.innerHTML = card.querySelector(".aw-t").innerHTML;
      const y = document.createElement("span");
      y.className = "ix-y";
      y.textContent = card.dataset.year || "—";
      row.append(th, num, t, y);
      row.addEventListener("mouseenter", () => preview(card, row));
      row.addEventListener("focus", () => preview(card, row));
      list.appendChild(row);
    });
    if (order[0]) preview(order[0], list.firstElementChild);
  }

  function render() {
    const order = sorted();
    order.forEach((c) => grid.appendChild(c));
    buildIndex(order);
  }

  function setView(v) {
    grid.hidden = v !== "grid";
    index.hidden = v !== "index";
    viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
    try { sessionStorage.setItem("aw-view", v); } catch (e) {}
  }

  function labels() {
    const L = LABELS[lang()];
    [...select.options].forEach((o) => (o.textContent = L[o.value]));
  }

  select.addEventListener("change", () => {
    render();
    try { sessionStorage.setItem("aw-sort", select.value); } catch (e) {}
  });
  viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
  document.addEventListener("langchange", () => { labels(); if (select.value === "title") render(); });

  let sortPref = "new", viewPref = "grid";
  try {
    sortPref = sessionStorage.getItem("aw-sort") || "new";
    viewPref = sessionStorage.getItem("aw-view") || "grid";
  } catch (e) {}
  select.value = LABELS.en[sortPref] ? sortPref : "new";
  labels();
  render();
  setView(viewPref === "index" ? "index" : "grid");
})();
