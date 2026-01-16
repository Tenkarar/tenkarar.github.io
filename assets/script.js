/* ============================================================
   HOLO-NET CORE SCRIPT
   - nav active highlight
   - inject menu icons
   - inject faction sigils
   - anchor links for articles
   - timeline toggles
   - reveal-on-scroll
   - archive mode + sound toggle (localStorage)
   - small UX helpers
   ============================================================ */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const STORAGE = {
    archiveMode: "holonet_archive_mode", // "1" | "0"
    sound: "holonet_sound", // "1" | "0"
  };

  // -----------------------------
  // Active nav highlight
  // -----------------------------
  function setActiveNav() {
    const links = $$(".nav a");
    if (!links.length) return;

    const pathParts = location.pathname.split("/").filter(Boolean);
    const here = (pathParts[pathParts.length - 1] || "index.html").toLowerCase();

    links.forEach((a) => {
      const href = (a.getAttribute("href") || "").toLowerCase();
      if (!href) return;

      const last = href.split("/").pop();
      if (last === here) {
        a.setAttribute("aria-current", "page");
      } else {
        a.removeAttribute("aria-current");
      }
    });
  }

  // -----------------------------
  // Inline menu icons (offline)
  // -----------------------------
  const NAV_ICONS = {
    home: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"
        fill="none" stroke="rgba(234,241,255,.75)" stroke-width="1.6" stroke-linejoin="round"/>
    </svg>`,
    force: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="rgba(120,170,255,.75)" stroke-width="1.6"/>
      <path d="M4 12h16" stroke="rgba(234,241,255,.55)" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`,
    lightdark: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 0 18" fill="none" stroke="rgba(120,170,255,.8)" stroke-width="1.6"/>
      <path d="M12 3a9 9 0 0 1 0 18" fill="none" stroke="rgba(255,110,130,.75)" stroke-width="1.6"/>
    </svg>`,
    orders: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z"
        fill="none" stroke="rgba(255,210,120,.75)" stroke-width="1.6" stroke-linejoin="round"/>
    </svg>`,
    artifacts: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M7 20l5-16 5 16" fill="none" stroke="rgba(90,255,210,.75)" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M6 16h12" stroke="rgba(234,241,255,.55)" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`,
    chrono: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="rgba(234,241,255,.65)" stroke-width="1.6"/>
      <path d="M12 7v6l4 2" fill="none" stroke="rgba(120,170,255,.8)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    law: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M7 7h10M7 11h10M7 15h7" stroke="rgba(234,241,255,.65)" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M6 3h12v18H6z" fill="none" stroke="rgba(120,170,255,.65)" stroke-width="1.6" stroke-linejoin="round"/>
    </svg>`,
    faq: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M5 5h14v10H9l-4 4z" fill="none" stroke="rgba(90,255,210,.65)" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M12 7a2 2 0 0 1 2 2c0 2-2 1.7-2 3" fill="none" stroke="rgba(234,241,255,.65)" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="12" cy="14.8" r="0.8" fill="rgba(234,241,255,.7)"/>
    </svg>`,
    changelog: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M7 6h10M7 10h10M7 14h7" stroke="rgba(255,210,120,.70)" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M6 3h12v18H6z" fill="none" stroke="rgba(255,210,120,.55)" stroke-width="1.6" stroke-linejoin="round"/>
    </svg>`,
    heresy: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M12 3l9 16H3z" fill="none" stroke="rgba(255,110,130,.65)" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M12 9v4" stroke="rgba(234,241,255,.65)" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="12" cy="15.8" r="0.8" fill="rgba(234,241,255,.7)"/>
    </svg>`,
    people: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" fill="none" stroke="rgba(120,170,255,.65)" stroke-width="1.6"/>
      <path d="M4 21a8 8 0 0 1 16 0" fill="none" stroke="rgba(234,241,255,.55)" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`,
    templates: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M6 3h9l3 3v15H6z" fill="none" stroke="rgba(90,255,210,.55)" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M9 10h6M9 14h6" stroke="rgba(234,241,255,.55)" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`,
    search: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="11" cy="11" r="6" fill="none" stroke="rgba(234,241,255,.65)" stroke-width="1.6"/>
      <path d="M16 16l5 5" stroke="rgba(120,170,255,.65)" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`
  };

  function injectNavIcons() {
    $$(".nav a[data-navicon]").forEach((a) => {
      const key = a.getAttribute("data-navicon");
      const svg = NAV_ICONS[key];
      if (!svg) return;

      if (!a.querySelector(".navicon")) {
        const span = document.createElement("span");
        span.className = "navicon";
        span.innerHTML = svg;
        a.prepend(span);
      }
    });
  }

  // -----------------------------
  // Sigils (Jedi / Sith / Grey)
  // -----------------------------
  const SIGILS = {
    jedi: `
<svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true">
  <defs>
    <linearGradient id="gJ" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="rgba(120,170,255,.95)"/>
      <stop offset="1" stop-color="rgba(90,255,210,.85)"/>
    </linearGradient>
  </defs>
  <path d="M32 6c7 7 12 16 12 26 0 9-5 17-12 20-7-3-12-11-12-20C20 22 25 13 32 6z"
        fill="none" stroke="url(#gJ)" stroke-width="2.5"/>
  <path d="M24 46c2 6 6 10 8 12 2-2 6-6 8-12"
        fill="none" stroke="url(#gJ)" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M18 34h28"
        stroke="rgba(120,170,255,.65)" stroke-width="2" stroke-linecap="round"/>
</svg>`,
    sith: `
<svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true">
  <defs>
    <linearGradient id="gS" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="rgba(255,110,130,.95)"/>
      <stop offset="1" stop-color="rgba(255,210,120,.75)"/>
    </linearGradient>
  </defs>
  <path d="M32 10c10 6 16 18 12 30-3 10-12 14-12 14s-9-4-12-14c-4-12 2-24 12-30z"
        fill="none" stroke="url(#gS)" stroke-width="2.5"/>
  <path d="M22 28c4 2 6 6 10 6s6-4 10-6"
        fill="none" stroke="rgba(255,110,130,.75)" stroke-width="2" stroke-linecap="round"/>
  <path d="M26 44c3-2 6-3 6-3s3 1 6 3"
        fill="none" stroke="rgba(255,210,120,.55)" stroke-width="2" stroke-linecap="round"/>
</svg>`,
    grey: `
<svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true">
  <defs>
    <linearGradient id="gG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="rgba(255,210,120,.95)"/>
      <stop offset="1" stop-color="rgba(234,241,255,.70)"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="28" r="16"
          fill="none" stroke="url(#gG)" stroke-width="2.5"/>
  <path d="M20 28h24"
        stroke="rgba(234,241,255,.55)" stroke-width="2" stroke-linecap="round"/>
  <path d="M24 46c2 4 5 7 8 10 3-3 6-6 8-10"
        fill="none" stroke="rgba(255,210,120,.65)" stroke-width="2.5" stroke-linecap="round"/>
</svg>`
  };

  function injectSigils() {
    $$("[data-sigil]").forEach((el) => {
      const key = el.getAttribute("data-sigil");
      if (SIGILS[key]) el.innerHTML = SIGILS[key];
    });
  }

  // -----------------------------
  // Article anchors for h3[data-article]
  // - If h3 has data-article="II-3", it will:
  //   * set id="article-ii-3"
  //   * append [#] anchor link
  // -----------------------------
  function slugArticle(code) {
    return "article-" + String(code).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  function addArticleAnchors() {
    $$("h3[data-article]").forEach((h3) => {
      const code = h3.getAttribute("data-article");
      if (!code) return;

      const id = slugArticle(code);
      if (!h3.id) h3.id = id;

      // Avoid duplicates
      if (h3.querySelector(".anchor")) return;

      const a = document.createElement("a");
      a.className = "anchor";
      a.href = "#" + h3.id;
      a.title = "Ссылка на " + code;
      a.textContent = "#" + code;

      h3.appendChild(a);
    });
  }

  // -----------------------------
  // Timeline toggles (for .tl-item)
  // -----------------------------
  function initTimeline() {
    $$(".tl-item").forEach((item) => {
      item.setAttribute("data-open", "false");
      item.addEventListener("click", () => {
        const open = item.getAttribute("data-open") === "true";
        item.setAttribute("data-open", open ? "false" : "true");
      });
    });
  }

  // -----------------------------
  // Reveal on scroll (light)
  // -----------------------------
  function initReveal() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = $$(".header, .card, .table, .callout, .faction, .verdict, .tl-item");
    targets.forEach((el) => el.classList.add("reveal"));

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    targets.forEach((el) => io.observe(el));
  }

  // -----------------------------
  // Archive mode (disable motion + stronger contrast)
  // Implemented as a class on <html>
  // -----------------------------
  function applyArchiveMode(on) {
    const html = document.documentElement;
    if (on) html.classList.add("archive-mode");
    else html.classList.remove("archive-mode");
  }

  function initArchiveModeToggle() {
    const btn = $("#btn-archive");
    const stored = localStorage.getItem(STORAGE.archiveMode);
    const isOn = stored === "1";
    applyArchiveMode(isOn);

    if (!btn) return;

    btn.setAttribute("aria-pressed", isOn ? "true" : "false");
    btn.textContent = isOn ? "ARCHIVE: ON" : "ARCHIVE: OFF";

    btn.addEventListener("click", () => {
      const nowOn = !(document.documentElement.classList.contains("archive-mode"));
      applyArchiveMode(nowOn);
      localStorage.setItem(STORAGE.archiveMode, nowOn ? "1" : "0");
      btn.setAttribute("aria-pressed", nowOn ? "true" : "false");
      btn.textContent = nowOn ? "ARCHIVE: ON" : "ARCHIVE: OFF";
    });
  }

  // Add archive-mode CSS dynamically (so styles.css doesn’t need more edits)
  function injectArchiveModeCSS() {
    const css = `
      html.archive-mode .holo-overlay{ display:none !important; }
      html.archive-mode #bg-canvas{ display:none !important; }
      html.archive-mode body::before, html.archive-mode body::after{ display:none !important; }
      html.archive-mode *{ animation:none !important; transition:none !important; }
      html.archive-mode .sidebar, html.archive-mode .main{
        backdrop-filter: none !important;
        background: rgba(0,0,0,.45) !important;
        border-color: rgba(231,241,255,.18) !important;
      }
      html.archive-mode .header::before{ display:none !important; }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  // -----------------------------
  // Sound toggle (optional)
  // - Click sounds + modal open sound can be handled by search.js too,
  //   but we keep simple.
  // -----------------------------
  function initSoundToggle() {
    const btn = $("#btn-sound");
    const stored = localStorage.getItem(STORAGE.sound);
    const isOn = stored === "1";

    if (!btn) return;

    btn.setAttribute("aria-pressed", isOn ? "true" : "false");
    btn.textContent = isOn ? "SOUND: ON" : "SOUND: OFF";

    btn.addEventListener("click", () => {
      const nowOn = !(localStorage.getItem(STORAGE.sound) === "1");
      localStorage.setItem(STORAGE.sound, nowOn ? "1" : "0");
      btn.setAttribute("aria-pressed", nowOn ? "true" : "false");
      btn.textContent = nowOn ? "SOUND: ON" : "SOUND: OFF";
    });
  }

  // Small click sound helper (used by other scripts if they want)
  function beep(freq = 620, ms = 40, gain = 0.02) {
    try {
      if (localStorage.getItem(STORAGE.sound) !== "1") return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, ms);
    } catch (_) {}
  }

  // Expose to window for other modules (bg/search)
  window.HOLO = window.HOLO || {};
  window.HOLO.beep = beep;
  window.HOLO.storage = STORAGE;

  // -----------------------------
  // Stamp default if not set on header
  // -----------------------------
  function ensureHeaderStamp() {
    const header = $(".header");
    if (!header) return;
    if (!header.getAttribute("data-stamp")) {
      header.setAttribute("data-stamp", "HOLO-NET ARCHIVE • VERIFIED COPY");
    }
  }

  // -----------------------------
  // Init
  // -----------------------------
  function init() {
    injectArchiveModeCSS();
    setActiveNav();
    injectNavIcons();
    injectSigils();
    addArticleAnchors();
    initTimeline();
    initReveal();
    ensureHeaderStamp();
    initArchiveModeToggle();
    initSoundToggle();

    // subtle feedback on nav clicks
    $$(".nav a").forEach((a) => {
      a.addEventListener("click", () => beep(520, 28, 0.015));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
