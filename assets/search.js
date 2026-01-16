/* ============================================================
   HOLO-NET SEARCH
   - loads /assets/search-index.json
   - opens modal: Ctrl+K, Cmd+K, / (when not typing), button #btn-search
   - filters by title, tags, body
   - supports deep links to anchors (#article-ii-3)
   - optional tiny beep via window.HOLO.beep
   ============================================================ */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const INDEX_URL = (() => {
    // Works both on / and /pages/
    const base = location.pathname.includes("/pages/") ? "../assets/" : "assets/";
    return base + "search-index.json";
  })();

  let INDEX = null;
  let indexLoadPromise = null;

  // -----------------------------
  // Modal DOM (created on demand)
  // -----------------------------
  function ensureModal() {
    let modal = $("#search-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "search-modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="modal-backdrop" data-close="1"></div>
      <div class="modal-panel" role="dialog" aria-modal="true" aria-label="Поиск по архиву">
        <div class="modal-head">
          <h3>ПОИСК</h3>
          <input class="search-input" id="search-input" autocomplete="off" placeholder="Статья / термин / ID (например: II-3, AR-201, 'серые джедаи')" />
          <button class="btn" id="search-close" type="button">CLOSE</button>
        </div>
        <div class="modal-body" id="search-results"></div>
      </div>
    `;
    document.body.appendChild(modal);

    // close behavior
    modal.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.getAttribute && t.getAttribute("data-close") === "1") closeModal();
    });
    $("#search-close")?.addEventListener("click", closeModal);

    // escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) closeModal();
    });

    return modal;
  }

  function isOpen() {
    const modal = $("#search-modal");
    return modal && modal.getAttribute("aria-hidden") === "false";
  }

  // -----------------------------
  // Index load
  // -----------------------------
  async function loadIndex() {
    if (INDEX) return INDEX;
    if (indexLoadPromise) return indexLoadPromise;

    indexLoadPromise = fetch(INDEX_URL, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Search index load failed: " + r.status);
        return r.json();
      })
      .then((json) => {
        INDEX = Array.isArray(json) ? json : (json.items || []);
        return INDEX;
      })
      .catch((err) => {
        console.error(err);
        INDEX = [];
        return INDEX;
      });

    return indexLoadPromise;
  }

  // -----------------------------
  // Normalization + scoring
  // -----------------------------
  const STOP = new Set(["и", "в", "во", "на", "а", "но", "или", "это", "как", "по", "для", "с", "со", "о", "об", "от", "до"]);
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^\p{L}\p{N}\s\-#]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function tokens(q) {
    return norm(q)
      .split(" ")
      .filter(Boolean)
      .filter((t) => t.length >= 2 && !STOP.has(t));
  }

  function scoreItem(item, toks, raw) {
    const title = norm(item.title);
    const tags = norm((item.tags || []).join(" "));
    const body = norm(item.body || "");
    const article = norm(item.article || "");
    const id = norm(item.id || "");
    const url = norm(item.url || "");

    let score = 0;

    // exact matches for article code / ids (II-3, AR-201)
    if (raw) {
      const r = norm(raw);
      if (article && r === article) score += 90;
      if (id && r === id) score += 90;
      if (url.includes(r) && r.length > 3) score += 25;
      if (title.includes(r)) score += 18;
    }

    for (const t of toks) {
      if (article && article.includes(t)) score += 60;
      if (id && id.includes(t)) score += 60;

      if (title.includes(t)) score += 22;
      if (tags.includes(t)) score += 16;
      if (body.includes(t)) score += 8;
      if (url.includes(t)) score += 6;
    }

    // small boost for VERIFIED
    if (item.status && String(item.status).toUpperCase() === "VERIFIED") score += 4;

    return score;
  }

  function highlight(text, q) {
    const n = norm(q);
    if (!n) return escapeHtml(text);

    // highlight up to 3 words
    const parts = n.split(" ").filter(Boolean).slice(0, 3);
    let out = escapeHtml(text);

    for (const p of parts) {
      if (p.length < 2) continue;
      const re = new RegExp(`(${escapeRegExp(p)})`, "ig");
      out = out.replace(re, "<mark>$1</mark>");
    }
    return out;
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function bestSnippet(body, q) {
    const b = String(body || "");
    const n = norm(q);
    if (!b) return "";
    if (!n) return b.slice(0, 180) + (b.length > 180 ? "…" : "");

    const low = b.toLowerCase();
    const idx = low.indexOf(n.split(" ")[0]);
    if (idx === -1) return b.slice(0, 180) + (b.length > 180 ? "…" : "");

    const start = Math.max(0, idx - 60);
    const end = Math.min(b.length, idx + 140);
    const seg = (start > 0 ? "…" : "") + b.slice(start, end) + (end < b.length ? "…" : "");
    return seg;
  }

  // -----------------------------
  // Render results
  // -----------------------------
  function urlFor(item) {
    // item.url is stored as path from root, e.g. "pages/nature.html#article-i-1"
    // If current is /pages/..., convert accordingly
    const u = String(item.url || "").replace(/^\//, "");
    if (!u) return "#";

    if (location.pathname.includes("/pages/")) {
      // from /pages/x.html -> root is ../
      return "../" + u;
    }
    return u;
  }

  function renderResults(list, q) {
    const wrap = $("#search-results");
    if (!wrap) return;

    if (!list.length) {
      wrap.innerHTML = `<div class="result"><div class="r-title">Ничего не найдено</div><div class="r-path">Попробуй: II-3, LAW-5, AR-201</div></div>`;
      return;
    }

    const html = list.slice(0, 30).map((it) => {
      const link = urlFor(it);
      const path = it.path || it.section || "";
      const snippet = bestSnippet(it.body || "", q);
      const tagLine = (it.tags || []).slice(0, 6).map((t) => `<span class="pill">${escapeHtml(t)}</span>`).join(" ");

      return `
        <div class="result">
          <div class="r-top">
            <div class="r-title">${highlight(it.title || "Без названия", q)}</div>
            <div class="r-path">${escapeHtml(path)} ${it.status ? "• " + escapeHtml(it.status) : ""}</div>
          </div>
          <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">${tagLine}</div>
          <div class="r-snippet">${highlight(snippet, q)}</div>
          <div style="margin-top:10px;">
            <a class="btn" href="${link}" data-open-result="1">OPEN</a>
          </div>
        </div>
      `;
    }).join("");

    wrap.innerHTML = html;

    // click -> close
    $$('[data-open-result="1"]', wrap).forEach((a) => {
      a.addEventListener("click", () => {
        try { window.HOLO?.beep?.(720, 28, 0.015); } catch(_) {}
        closeModal();
      });
    });
  }

  // -----------------------------
  // Search
  // -----------------------------
  async function runSearch(q) {
    const idx = await loadIndex();
    const t = tokens(q);
    const raw = q;

    if (!q || !q.trim()) {
      renderResults([], q);
      return;
    }

    const scored = idx
      .map((it) => ({ it, s: scoreItem(it, t, raw) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.it);

    renderResults(scored, q);
  }

  // -----------------------------
  // Open / close
  // -----------------------------
  let lastFocus = null;

  async function openModal(prefill = "") {
    ensureModal();
    const modal = $("#search-modal");
    const input = $("#search-input");

    lastFocus = document.activeElement;

    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    await loadIndex();

    // prefill
    input.value = prefill || "";
    input.focus();
    input.select();

    // initial results
    if (input.value.trim()) runSearch(input.value.trim());
    else {
      // show a few curated suggestions (top VERIFIED)
      const idx = INDEX || [];
      const top = idx.filter((x) => String(x.status || "").toUpperCase() === "VERIFIED").slice(0, 10);
      renderResults(top, "");
    }

    try { window.HOLO?.beep?.(640, 34, 0.015); } catch(_) {}
  }

  function closeModal() {
    const modal = $("#search-modal");
    if (!modal) return;

    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    // restore focus
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;

    try { window.HOLO?.beep?.(520, 24, 0.012); } catch(_) {}
  }

  // -----------------------------
  // Keyboard shortcuts
  // -----------------------------
  function isTypingTarget(el) {
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || el.isContentEditable;
  }

  function initHotkeys() {
    document.addEventListener("keydown", (e) => {
      const key = e.key;

      // Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && key.toLowerCase() === "k") {
        e.preventDefault();
        openModal("");
        return;
      }

      // "/" quick open (only when not typing)
      if (key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isTypingTarget(document.activeElement)) return;
        e.preventDefault();
        openModal("");
        return;
      }
    });
  }

  // -----------------------------
  // Sidebar button hook
  // -----------------------------
  function initButtons() {
    const btn = $("#btn-search");
    if (!btn) return;
    btn.addEventListener("click", () => openModal(""));
  }

  // -----------------------------
  // Input debounce
  // -----------------------------
  function initInput() {
    const input = $("#search-input");
    if (!input) return;

    let t = null;
    input.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => runSearch(input.value), 120);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        runSearch(input.value);
      }
    });
  }

  // Because modal is created dynamically, we need to init input after open
  const originalEnsureModal = ensureModal;
  ensureModal = function () {
    const modal = originalEnsureModal();
    // attach input listeners once
    if (!modal.__wired) {
      modal.__wired = true;
      setTimeout(initInput, 0);
    }
    return modal;
  };

  // -----------------------------
  // Init
  // -----------------------------
  function init() {
    initHotkeys();
    initButtons();

    // if URL includes ?q=... open search
    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    if (q) openModal(q);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose for debugging
  window.HOLO = window.HOLO || {};
  window.HOLO.searchOpen = openModal;
  window.HOLO.searchClose = closeModal;
})();
