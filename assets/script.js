/* ============================================================
   FORCE CODEX — UI SCRIPT (FIXED)
   - гарантированно раскрывает .reveal секции (иначе страницы "пустые")
   - archive mode toggle
   - search open/close (works with assets/search.js if exists)
   - timeline expand/collapse
   - anchor copy helper
   ============================================================ */

(function () {
  "use strict";

  const $ = (q, root = document) => root.querySelector(q);
  const $$ = (q, root = document) => Array.from(root.querySelectorAll(q));

  // -----------------------------
  // ARCHIVE MODE
  // -----------------------------
  const btnArchive = $("#btn-archive");
  const ARCHIVE_KEY = "forcecodex.archiveMode";

  function setArchiveMode(on) {
    document.documentElement.classList.toggle("archive-mode", !!on);
    try { localStorage.setItem(ARCHIVE_KEY, on ? "1" : "0"); } catch (_) {}
  }

  (function initArchiveMode() {
    let saved = "0";
    try { saved = localStorage.getItem(ARCHIVE_KEY) || "0"; } catch (_) {}
    setArchiveMode(saved === "1");
  })();

  if (btnArchive) {
    btnArchive.addEventListener("click", () => {
      const on = !document.documentElement.classList.contains("archive-mode");
      setArchiveMode(on);
    });
  }

  // -----------------------------
  // SEARCH
  // -----------------------------
  const btnSearch = $("#btn-search");

  function openSearch() {
    if (window.ForceCodexSearch && typeof window.ForceCodexSearch.open === "function") {
      window.ForceCodexSearch.open();
      return;
    }
    const inp = $("#search-input");
    if (inp) inp.focus();
  }

  function closeSearch() {
    if (window.ForceCodexSearch && typeof window.ForceCodexSearch.close === "function") {
      window.ForceCodexSearch.close();
    }
  }

  if (btnSearch) btnSearch.addEventListener("click", openSearch);

  document.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const cmdk = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k";
    if (cmdk) {
      e.preventDefault();
      openSearch();
      return;
    }
    if (e.key === "Escape") closeSearch();
  });

  // -----------------------------
  // REVEAL (FIXED)
  // - ОБЯЗАТЕЛЬНО включаем .reveal секции!
  // -----------------------------
  const revealEls = Array.from(new Set([
    ...$$(".reveal"),              // <-- критично: секции-контейнеры
    ...$$(".header"),
    ...$$(".card"),
    ...$$(".table"),
    ...$$(".callout"),
    ...$$(".faction"),
    ...$$(".timeline"),
    ...$$(".verdict"),
    ...$$(".tl-item"),
    ...$$(".hr"),
  ]));

  function show(el) {
    el.classList.add("reveal-in");
  }

  // аварийное раскрытие, чтобы НИКОГДА не было "пусто"
  function forceShowAll() {
    revealEls.forEach(show);
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const ent of entries) {
          if (ent.isIntersecting) {
            show(ent.target);
            io.unobserve(ent.target);
          }
        }
      },
      { threshold: 0.10, rootMargin: "120px 0px" }
    );

    revealEls.forEach((el) => io.observe(el));

    // если вдруг что-то не сработало (шрифты/лаг/особые настройки) — раскрыть через 700мс
    setTimeout(forceShowAll, 700);
  } else {
    forceShowAll();
  }

  // -----------------------------
  // TIMELINE TOGGLE
  // -----------------------------
  $$(".tl-item").forEach((item) => {
    const head = $(".tl-head", item);
    if (!head) return;

    head.setAttribute("role", "button");
    head.setAttribute("tabindex", "0");

    function toggle() {
      const open = item.getAttribute("data-open") === "true";
      item.setAttribute("data-open", open ? "false" : "true");
      item.classList.toggle("open", !open);
    }

    head.addEventListener("click", toggle);
    head.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  });

  // -----------------------------
  // ANCHOR COPY (optional)
  // -----------------------------
  $$(".anchor").forEach((a) => {
    a.addEventListener("click", async () => {
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) return;

      const url = window.location.origin + window.location.pathname + href;

      try {
        await navigator.clipboard.writeText(url);
        a.classList.add("copied");
        setTimeout(() => a.classList.remove("copied"), 700);
      } catch (_) {}
    });
  });

})();
