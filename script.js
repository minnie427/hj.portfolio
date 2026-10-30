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

// Ink on hanji — the cursor is a loaded brush. Moving leaves a dry-brush stroke (at most about half strength);
// resting in one place lets the ink pool and bloom, and a click drops ink that spreads into the paper (up to ~70%).
// The ink shapes are grown in advance on a hanji fibre map (images/ink/brush.png, drops.png); here they are laid
// along the cursor's path. A stroke is gone soon after the brush passes, but it does not simply fade: it sinks into
// the paper, spreading a little and thinning unevenly along the fibres. Pools and drops spread, rest briefly and sink
// in the same way. The ink scrolls with the page. Needs WebGL2.
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var me = document.currentScript, base = (me && me.src) || location.href;
  var SRC = window.__inkTex || { brush: new URL("images/ink/brush.png", base).href, drops: new URL("images/ink/drops.png", base).href };
  var cv = document.createElement("canvas");
  cv.className = "ink-layer";
  cv.setAttribute("aria-hidden", "true");
  var gl = cv.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl || !gl.getExtension("EXT_color_buffer_float")) return;

  var STROKE = 0.5 / 0.7;   // a stroke's darkest ink, as a share of the deepest (0.7 on screen)
  var SOAK = 150;           // ms a new stretch of stroke is redrawn while its fringe soaks out
  var INK = [0.1, 0.1, 0.11];
  var BW = 1024, BH = 64, BCORE = 30;   // brush strip size and the width of its inked core
  var FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // ---------- shaders ----------
  var V_FULL = "#version 300 es\nin vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
  // red = ink, green = seconds it still rests, blue = 1 where it came from a drop (drops fade slower than strokes)
  // fading ink sinks into the paper: it spreads a little, and fibres drink it unevenly (a paper map anchored to the page)
  var PAPER = "float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n" +
    "float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}\n" +
    "float paper(vec2 p){vec2 a=vec2(p.x*.8+p.y*.6,p.y*.8-p.x*.6),b=vec2(p.x*.5-p.y*.87,p.y*.5+p.x*.87);\n" +
    " return vn(p/7.)*.4+vn(a*vec2(.07,.7))*.22+vn(b*vec2(.06,.6))*.18+vn(p/1.7)*.2;}\n";
  var F_FADE = "#version 300 es\nprecision highp float;uniform sampler2D st;uniform vec2 shift,px;uniform float dt,S,py;in vec2 uv;out vec4 o;\n" + PAPER +
    "vec4 T(vec2 q){return (q.y<0.||q.y>1.)?vec4(0):texture(st,q);}\n" +
    "void main(){vec2 q=uv+shift;vec4 c=T(q);float h=c.g-dt,d=c.r;\n" +
    "if(h<=0.){float nb=(T(q+vec2(px.x,0)).r+T(q-vec2(px.x,0)).r+T(q+vec2(0,px.y)).r+T(q-vec2(0,px.y)).r)*.25;\n" +
    " d+=(nb-d)*min(.45,dt*11.);\n" +
    " float g=paper(vec2(gl_FragCoord.x/S,gl_FragCoord.y/S-py));\n" +
    " d=max(0.,d-dt*mix(1.3+2.3*d,.45+.55*d,c.b)*mix(.45,1.7,g));}\n" +
    "o=vec4(d,max(h,0.),d>.002?c.b:0.,1.);}";
  var V_RIB = "#version 300 es\nin vec2 p;in vec4 a;uniform vec2 view;uniform float scroll;out vec4 va;\n" +
    "void main(){vec2 c=vec2(p.x,p.y-scroll)/view*2.-1.;gl_Position=vec4(c.x,-c.y,0.,1.);va=a;}";
  var F_RIB = "#version 300 es\nprecision highp float;uniform sampler2D tex;uniform float k;in vec4 va;out vec4 o;\n" +
    "void main(){vec3 t=texture(tex,va.xy).rgb;float vis=smoothstep(va.z-.04,va.z+.04,t.g);\n" +
    // the core lands at once, the fringe soaks out along the fibres
    "float r=min(1.,.4+va.w/" + SOAK + ".*.6),sm=1.-smoothstep(r-.1,r,t.b);float d=t.r*vis*sm*k*(1.-.4*va.z);o=vec4(d,d>.01?.05:0.,0.,1.);}";
  var V_DROP = "#version 300 es\nin vec2 p;uniform vec2 c,view;uniform float R,rot,scroll;out vec2 tc;\n" +
    "void main(){float s=sin(rot),k=cos(rot);vec2 q=vec2(k*p.x-s*p.y,s*p.x+k*p.y)*R;vec2 sp=(c+q-vec2(0.,scroll))/view*2.-1.;\n" +
    "gl_Position=vec4(sp.x,-sp.y,0.,1.);tc=p*.5+.5;}";
  var F_DROP = "#version 300 es\nprecision highp float;uniform sampler2D tex;uniform vec2 tile;uniform float e,k;in vec2 tc;out vec4 o;\n" +
    "void main(){vec2 t=texture(tex,tile+clamp(tc,.004,.996)*.5).rg;float m=1.-smoothstep(e-.06,e,t.g);float d=t.r*m*k;o=vec4(d,d>.01?.7:0.,d>.01?1.:0.,1.);}";
  var F_SHOW = "#version 300 es\nprecision highp float;uniform sampler2D st;uniform vec3 ink;uniform float dpr,py;in vec2 uv;out vec4 o;\n" + PAPER +
    "float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}\n" +
    "void main(){vec4 c=texture(st,uv);float d=c.r;if(d<.004){o=vec4(0);return;}float n=h(floor(gl_FragCoord.xy));\n" +
    "float a=.7*min(d,1.)*(1.-.12*(n-.5)*(1.-d));\n" +
    "float sink=1.-smoothstep(0.,.02,c.g);if(sink>0.){float g=paper(vec2(gl_FragCoord.x/dpr,gl_FragCoord.y/dpr-py));\n" +
    " float th=.02+.3*g*(1.-d)+.06*(n-.5);a*=mix(1.,smoothstep(th,th+.08,d),sink);}\n" +
    "o=vec4(ink*a,a);}";

  function sh(t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(x); return x; }
  function prog(vs, fs, attrs) {
    var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    attrs.forEach(function (n, i) { gl.bindAttribLocation(p, i, n); }); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw gl.getProgramInfoLog(p);
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { p: p, u: u };
  }
  var pFade, pRib, pDrop, pShow;
  try { pFade = prog(V_FULL, F_FADE, ["p"]); pRib = prog(V_RIB, F_RIB, ["p", "a"]); pDrop = prog(V_DROP, F_DROP, ["p"]); pShow = prog(V_FULL, F_SHOW, ["p"]); } catch (e) { return; }

  var vaoFull = gl.createVertexArray(); gl.bindVertexArray(vaoFull);
  var bFull = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bFull); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  var vaoQuad = gl.createVertexArray(); gl.bindVertexArray(vaoQuad);
  var bQuad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bQuad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  var vaoRib = gl.createVertexArray(); gl.bindVertexArray(vaoRib);
  var bRib = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bRib);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 8);
  gl.bindVertexArray(null);

  function tex(w, h, f, fmt, type, data, wrapS, filt) {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, f, w, h, 0, fmt, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  var brushT = null, dropT = null;
  function load(src, wrapS, done) {
    var im = new Image(); im.decoding = "async";
    im.onload = function () {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, im); gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      done(t);
    };
    im.src = src;
  }
  load(SRC.brush, gl.REPEAT, function (t) { brushT = t; });
  load(SRC.drops, gl.CLAMP_TO_EDGE, function (t) { dropT = t; });

  // ---------- the page of ink (CSS-pixel grid; red = ink, green = time left before it fades) ----------
  var W, H, S, dpr, A, B, fA, fB;
  function fbo(t) { var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return f; }
  function size() {
    W = innerWidth; H = innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 2); S = Math.min(dpr, 1.5);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    [A, B].forEach(function (t) { if (t) gl.deleteTexture(t); });
    A = tex(Math.round(W * S), Math.round(H * S), gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null, gl.CLAMP_TO_EDGE, gl.LINEAR);
    B = tex(Math.round(W * S), Math.round(H * S), gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null, gl.CLAMP_TO_EDGE, gl.LINEAR);
    fA = fbo(A); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); fB = fbo(B); gl.clear(gl.COLOR_BUFFER_BIT);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw 0;
  }
  try { size(); } catch (e) { return; }
  document.body.appendChild(cv);
  var lastW = W;
  window.addEventListener("resize", function () { if (Math.abs(innerWidth - lastW) > 2) { lastW = innerWidth; try { size(); } catch (e) {} } });

  // ---------- the brush ----------
  // nodes along a smoothed path, in page coordinates; each new stretch is redrawn for half a second while it soaks in
  var nodes = [], pts = [], pt = 0, half = 7, strokeLen = 0, uLen = 0, dry0 = 0, lastNode = null;
  var mx = 0, my = 0, inside = false, lastMove = 0, rest = 0, restX = -99, restY = -99, pool = null;
  var drops = [], scrollY0 = window.scrollY, scrollAcc = 0;
  function now() { return performance.now(); }
  function begin(x, y, t) { pts = [[x, y], [x, y]]; strokeLen = 0; dry0 = Math.random() * .08; lastNode = null; pt = t; uLen = Math.random() * BW; }
  function addNode(x, y, nx, ny, h, t) {
    var s = Math.min(.86, dry0 + Math.max(0, strokeLen - 480) / 1700);       // the brush runs dry along the stroke
    if (lastNode) uLen += Math.hypot(x - lastNode.x, y - lastNode.y) * BCORE / (lastNode.h + h);
    var n = { x: x, y: y + window.scrollY, nx: nx, ny: ny, h: h, u: uLen / BW, s: s, t: t, first: !lastNode };
    nodes.push(n); lastNode = n;
  }
  function stroke(x, y, t) {
    if (!pts.length || t - pt > 350) { begin(x, y, t); return; }
    var p1 = pts[pts.length - 1], L = Math.hypot(x - p1[0], y - p1[1]); if (L < 1.5) return;
    var v = L / Math.max(6, t - pt), target = Math.max(2.4, Math.min(11, 11 - v * 3.4));
    var p0 = pts[pts.length - 2], a0x = (p0[0] + p1[0]) / 2, a0y = (p0[1] + p1[1]) / 2, a1x = (p1[0] + x) / 2, a1y = (p1[1] + y) / 2;
    var seg = Math.hypot(a1x - a0x, a1y - a0y), n = Math.max(1, Math.ceil(seg / 2.5)), h0 = half;
    half += (target - half) * .3;
    for (var k = lastNode ? 1 : 0; k <= n; k++) {
      var t1 = k / n, u = 1 - t1;
      var cx = u * u * a0x + 2 * u * t1 * p1[0] + t1 * t1 * a1x, cy = u * u * a0y + 2 * u * t1 * p1[1] + t1 * t1 * a1y;
      var tx = 2 * u * (p1[0] - a0x) + 2 * t1 * (a1x - p1[0]), ty = 2 * u * (p1[1] - a0y) + 2 * t1 * (a1y - p1[1]), tl = Math.hypot(tx, ty);
      if (tl < 1e-3) continue;
      if (k > 0) strokeLen += seg / n;
      var taper = .18 + .82 * Math.min(1, strokeLen / 70);
      addNode(cx, cy, -ty / tl, tx / tl, (h0 + (half - h0) * t1) * taper, t);
    }
    pts.push([x, y]); if (pts.length > 3) pts.shift(); pt = t;
  }
  // when the brush stops, it lifts: the stroke narrows to a ragged point instead of ending square
  function lift(t) {
    var n = lastNode; if (!n || n.first || n.lifted) return; n.lifted = true;
    var dx = n.ny, dy = -n.nx, h = n.h, x = n.x, y = n.y - window.scrollY;
    for (var i = 1; i <= 5; i++) { var f = i / 5; addNode(x + dx * h * 1.3 * f, y + dy * h * 1.3 * f, n.nx, n.ny, h * (1 - .82 * f), t); }
    lastNode.lifted = true;
  }
  function drop(x, y, R, dur, k, t) {
    drops.push({ x: x, y: y + window.scrollY, R: R, rot: Math.random() * 6.283, tile: Math.random() * 4 | 0, t0: t, dur: dur, k: k, e: 0 });
  }

  var running = false, until = 0, last = 0;
  function wake(t) { until = Math.max(until, t + 5000); if (!running && !MANUAL) { running = true; last = now(); requestAnimationFrame(frame); } }
  var MANUAL = !!window.__inkManual;

  function onMove(x, y, t) {
    mx = x; my = y; inside = true;
    if (Math.hypot(x - restX, y - restY) > 5) { restX = x; restY = y; lastMove = t; rest = 0; pool = null; }
    stroke(x, y, t); wake(t);
  }
  function onDown(x, y, touch, t) {
    var s = touch ? .8 : 1;
    drop(x, y, (30 + Math.random() * 10) * s, 2400, 1, t);
    var n = 1 + (Math.random() * 4 | 0);
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, d = (24 + Math.random() * 34) * s; drop(x + Math.cos(a) * d, y + Math.sin(a) * d, (2.5 + Math.random() * 3.5) * s, 500, .85, t); }
    pts = []; wake(t);
  }
  if (FINE) {
    window.addEventListener("pointermove", function (e) { if (e.pointerType === "mouse") onMove(e.clientX, e.clientY, now()); }, { passive: true });
    document.documentElement.addEventListener("mouseleave", function () { inside = false; pts = []; });
  }
  var tap = null;
  window.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse") onDown(e.clientX, e.clientY, false, now());
    else tap = { x: e.clientX, y: e.clientY, t: now() };
  }, { passive: true });
  window.addEventListener("pointerup", function (e) {
    if (!tap || e.pointerType === "mouse") return;
    if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 10 && now() - tap.t < 450) onDown(tap.x, tap.y, true, now());
    tap = null;
  }, { passive: true });
  window.addEventListener("pointercancel", function () { tap = null; }, { passive: true });
  window.addEventListener("scroll", function () { var y = window.scrollY; scrollAcc += y - scrollY0; scrollY0 = y; if (now() < until) wake(now()); }, { passive: true });

  // ---------- drawing ----------
  var ribData = new Float32Array(6 * 6 * 512);
  function pushV(o, x, y, u, v, s, age) { ribData[o] = x; ribData[o + 1] = y; ribData[o + 2] = u; ribData[o + 3] = v; ribData[o + 4] = s; ribData[o + 5] = age; return o + 6; }
  function drawRibbons(t, scroll) {
    if (!brushT) return;
    var E = BH / BCORE, o = 0, cnt = 0;
    for (var i = 1; i < nodes.length; i++) {
      var a = nodes[i - 1], b = nodes[i]; if (b.first) continue;
      if (o + 36 > ribData.length) { var g = new Float32Array(ribData.length * 2); g.set(ribData); ribData = g; }
      var ea = a.h * E, eb = b.h * E, ag = t - a.t, bg = t - b.t;
      o = pushV(o, a.x - a.nx * ea, a.y - a.ny * ea, a.u, 0, a.s, ag); o = pushV(o, a.x + a.nx * ea, a.y + a.ny * ea, a.u, 1, a.s, ag); o = pushV(o, b.x - b.nx * eb, b.y - b.ny * eb, b.u, 0, b.s, bg);
      o = pushV(o, b.x - b.nx * eb, b.y - b.ny * eb, b.u, 0, b.s, bg); o = pushV(o, a.x + a.nx * ea, a.y + a.ny * ea, a.u, 1, a.s, ag); o = pushV(o, b.x + b.nx * eb, b.y + b.ny * eb, b.u, 1, b.s, bg);
      cnt += 6;
    }
    if (!cnt) return;
    gl.useProgram(pRib.p); gl.bindVertexArray(vaoRib); gl.bindBuffer(gl.ARRAY_BUFFER, bRib); gl.bufferData(gl.ARRAY_BUFFER, ribData.subarray(0, o), gl.DYNAMIC_DRAW);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, brushT); gl.uniform1i(pRib.u.tex, 0);
    gl.uniform2f(pRib.u.view, W, H); gl.uniform1f(pRib.u.scroll, scroll); gl.uniform1f(pRib.u.k, STROKE);
    gl.drawArrays(gl.TRIANGLES, 0, cnt);
  }
  function drawDrop(d, scroll) {
    gl.uniform2f(pDrop.u.c, d.x, d.y); gl.uniform1f(pDrop.u.R, d.R); gl.uniform1f(pDrop.u.rot, d.rot);
    gl.uniform2f(pDrop.u.tile, (d.tile & 1) * .5, (d.tile >> 1) * .5); gl.uniform1f(pDrop.u.e, d.e); gl.uniform1f(pDrop.u.k, d.k);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function frame(t) {
    var dt = Math.min(.1, (t - last) / 1000); last = t;
    var scroll = window.scrollY;
    // resting brush: the ink keeps flowing out into one spot
    if (lastNode && !lastNode.lifted && t - pt > 140) { lift(t); pts = []; }
    if (FINE && inside && t - lastMove > 600) {
      rest = t - lastMove - 600;
      if (!pool) { pool = { x: mx, y: my + scroll, R: 30 + Math.random() * 8, rot: Math.random() * 6.283, tile: Math.random() * 4 | 0, k: 1, e: 0 }; pts = []; }
      pool.e = Math.min(1, Math.pow(rest / 3200, .75)); until = Math.max(until, t + 5000);
    }
    drops = drops.filter(function (d) { var q = Math.min(1, (t - d.t0) / d.dur); d.e = 1 - Math.pow(1 - q, 2.2); return q < 1 || d.e < 1; });
    // 1. let the ink rest, then fade; follow the page when it scrolls
    var cells = Math.round(scrollAcc * S); scrollAcc -= cells / S;
    gl.disable(gl.BLEND); gl.bindVertexArray(vaoFull);
    gl.useProgram(pFade.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A); gl.uniform1i(pFade.u.st, 0);
    gl.uniform2f(pFade.u.shift, 0, -cells / Math.round(H * S)); gl.uniform1f(pFade.u.dt, dt);
    gl.uniform2f(pFade.u.px, 1 / Math.round(W * S), 1 / Math.round(H * S)); gl.uniform1f(pFade.u.S, S); gl.uniform1f(pFade.u.py, scroll);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fB); gl.viewport(0, 0, Math.round(W * S), Math.round(H * S)); gl.drawArrays(gl.TRIANGLES, 0, 3);
    var sw = A; A = B; B = sw; sw = fA; fA = fB; fB = sw;
    // 2. lay down new ink (the darker of old and new wins)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fA); gl.enable(gl.BLEND); gl.blendEquation(gl.MAX);
    drawRibbons(t, scroll);
    if (dropT && (drops.length || pool)) {
      gl.useProgram(pDrop.p); gl.bindVertexArray(vaoQuad); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, dropT); gl.uniform1i(pDrop.u.tex, 0);
      gl.uniform2f(pDrop.u.view, W, H); gl.uniform1f(pDrop.u.scroll, scroll);
      drops.forEach(function (d) { drawDrop(d, scroll); }); if (pool) drawDrop(pool, scroll);
    }
    gl.disable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD);
    nodes = nodes.filter(function (n, i) { return t - n.t < SOAK + 20 || i === nodes.length - 1; });
    // 3. show it
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cv.width, cv.height); gl.bindVertexArray(vaoFull);
    gl.useProgram(pShow.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A); gl.uniform1i(pShow.u.st, 0); gl.uniform3f(pShow.u.ink, INK[0], INK[1], INK[2]); gl.uniform1f(pShow.u.dpr, dpr); gl.uniform1f(pShow.u.py, scroll);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (MANUAL) return;
    if (t < until || scrollAcc) requestAnimationFrame(frame); else running = false;
  }
})();

// Cursor — a small ink dot (html[data-cursor], "dot" unless the page sets another; "none" keeps the system arrow).
// Mouse only; text fields keep their own caret; over links and buttons the dot opens into a pale wash.
(function () {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  var root = document.documentElement, el = document.createElement("div");
  if (!root.hasAttribute("data-cursor")) root.setAttribute("data-cursor", "dot");
  el.className = "cur"; el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<span class="cur-b"><i></i></span><span class="cur-a"><i></i></span>';
  document.body.appendChild(el);
  var a = el.children[1], b = el.children[0], x = -200, y = -200, bx = -200, by = -200, raf = 0;
  var KINDS = ["dot", "brush", "ring", "seal"];
  function sync() { root.classList.toggle("cur-on", KINDS.indexOf(root.getAttribute("data-cursor")) > -1); }
  sync(); new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["data-cursor"] });
  function loop() {
    bx += (x - bx) * .2; by += (y - by) * .2;
    a.style.transform = "translate3d(" + x + "px," + y + "px,0)";
    b.style.transform = "translate3d(" + bx + "px," + by + "px,0)";
    raf = Math.abs(x - bx) + Math.abs(y - by) > .2 ? requestAnimationFrame(loop) : 0;
  }
  var HOV = "a,button,[role=button],label,summary,select", TXT = "input,textarea,select,[contenteditable=true]";
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    x = e.clientX; y = e.clientY; if (bx < -150) { bx = x; by = y; }
    el.classList.add("on"); if (!raf) raf = requestAnimationFrame(loop);
    var t = e.target && e.target.closest ? e.target : null;
    el.classList.toggle("hov", !!(t && t.closest(HOV)));
    el.classList.toggle("off", !!(t && t.closest(TXT)));
  }, { passive: true });
  root.addEventListener("mouseleave", function () { el.classList.remove("on"); });
  window.addEventListener("pointerdown", function (e) { if (e.pointerType === "mouse") el.classList.add("down"); });
  window.addEventListener("pointerup", function () { el.classList.remove("down"); });
  window.addEventListener("blur", function () { el.classList.remove("down"); });
})();
