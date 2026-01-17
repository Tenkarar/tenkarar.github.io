/* ============================================================
   HOLO-NET UI SCRIPT
   - Archive mode toggle (reduces motion + readability)
   - Ctrl+K opens search (handled by search.js, here we toggle)
   - Smooth anchor highlight on hash navigation
   - Timeline accordion support (.tl-item)
   - Reveal-in animations: add 'reveal-in' to key blocks as they enter view
   ============================================================ */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ----------------------------
  // Archive mode
  // ----------------------------
  const html = document.documentElement;
  const btnArchive = $("#btn-archive");
  const ARCHIVE_KEY = "holonet_archive_mode";

  function setArchiveMode(on) {
    html.classList.toggle("archive-mode", on);
    try { localStorage.setItem(ARCHIVE_KEY, on ? "1" : "0"); } catch (_) {}
    if (btnArchive) btnArchive.textContent = on ? "LIVE MODE" : "ARCHIVE MODE";
  }

  function initArchiveMode() {
    let saved = "0";
    try { saved = localStorage.getItem(ARCHIVE_KEY) || "0"; } catch (_) {}
    setArchiveMode(saved === "1");
  }

  if (btnArchive) {
    btnArchive.addEventListener("click", () => {
      setArchiveMode(!html.classList.contains("archive-mode"));
    });
  }
  initArchiveMode();

  // ----------------------------
  // Search open / close hook
  // search.js creates #search-modal, but we provide shortcuts & button wiring
  // ----------------------------
  const btnSearch = $("#btn-search");

  function openSearch() {
    const modal = $("#search-modal");
    if (!modal) return;
    modal.classList.add("open");
    const input = $("#search-input", modal) || $("#search-input");
    if (input) input.focus();
  }

  function closeSearch() {
    const modal = $("#search-modal");
    if (!modal) return;
    modal.classList.remove("open");
  }

  if (btnSearch) btnSearch.addEventListener("click", openSearch);

  document.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

    // Ctrl/Cmd + K
    if (ctrlOrCmd && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openSearch();
      return;
    }

    // Escape closes search
    if (e.key === "Escape") {
      closeSearch();
    }
  });

  // click on overlay closes search (if exists)
  document.addEventListener("click", (e) => {
    const modal = $("#search-modal");
    if (!modal || !modal.classList.contains("open")) return;
    if (e.target === modal) closeSearch();
  });

  // ----------------------------
  // Anchor highlight on navigation
  // ----------------------------
  function highlightAnchor() {
    const hash = decodeURIComponent(location.hash || "");
    if (!hash || hash.length < 2) return;

    const el = document.getElementById(hash.slice(1));
    if (!el) return;

    el.classList.add("flash");
    window.setTimeout(() => el.classList.remove("flash"), 900);

    // align nicely under header
    try {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (_) {}
  }

  window.addEventListener("hashchange", highlightAnchor);
  // initial
  window.setTimeout(highlightAnchor, 250);

  // ----------------------------
  // Timeline accordion (.tl-item)
  // ----------------------------
  $$(".tl-item").forEach((item) => {
    const head = $(".tl-head", item) || item;
    head.addEventListener("click", () => {
      const open = item.getAttribute("data-open") === "true";
      item.setAttribute("data-open", open ? "false" : "true");
      item.classList.toggle("open", !open);
    });
  });

  // ----------------------------
  // Reveal animation on scroll
  // We only apply to selected blocks so it stays light.
  // Requires CSS for .reveal-in (already used in your styles.css previously)
  // ----------------------------
  const targets = [
    ...$$(".header"),
    ...$$(".card"),
    ...$$(".table"),
    ...$$(".callout"),
    ...$$(".faction"),
    ...$$(".timeline"),
    ...$$(".tl-item"),
    ...$$(".verdict"),
  ];

  // Add base class so CSS can animate from it
  targets.forEach((el) => el.classList.add("reveal-in"));

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((ent) => {
          if (ent.isIntersecting) {
            ent.target.classList.add("in");
            io.unobserve(ent.target);
          }
        });
      },
      { root: null, threshold: 0.12 }
    );

    targets.forEach((el) => io.observe(el));
  } else {
    // fallback: mark all as visible
    targets.forEach((el) => el.classList.add("in"));
  }

  // ----------------------------
  // Optional: subtle nav active effect (no CSS dependency)
  // ----------------------------
  const nav = $(".nav");
  if (nav) {
    nav.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      // keep instant UI feedback even before navigation
      a.classList.add("clicked");
      setTimeout(() => a.classList.remove("clicked"), 220);
    });
  }
})();
