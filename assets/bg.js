/* ============================================================
   HOLO-NET BACKGROUND — AUREBESH SAFE-ALPHABET (NO SQUARES)
   - supports <canvas id="bg-canvas"> OR <canvas id="bg">
   - waits for "Aurebesh" font, then probes glyph coverage
   - auto-detects tofu (most common bitmap) and excludes it
   - 3 stream types using ONLY safe glyphs
   - big symbols, slow updates (hold 2–4s)
   ============================================================ */

(function () {
  "use strict";

  const canvas =
    document.getElementById("bg-canvas") ||
    document.getElementById("bg");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });

  const mReduce = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

  let reduceMotion = !!(mReduce && mReduce.matches);
  if (mReduce && mReduce.addEventListener) {
    mReduce.addEventListener("change", (e) => (reduceMotion = !!e.matches));
  }

  let W = 0, H = 0, DPR = 1;

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, Math.floor(window.innerWidth));
    H = Math.max(1, Math.floor(window.innerHeight));
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  // -----------------------------
  // Utilities
  // -----------------------------
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;

  const C = {
    holo: [90, 255, 210],
    blue: [120, 170, 255],
    ink: [234, 245, 255],
  };
  const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

  // -----------------------------
  // Typography
  // -----------------------------
  const FONT_PX = 30;
  const ROW_H = 38;
  const COL_W = 48;

  function setFont(targetCtx) {
    (targetCtx || ctx).font =
      `${FONT_PX}px "Aurebesh", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace`;
    (targetCtx || ctx).textBaseline = "top";
  }
  setFont(ctx);

  async function waitForAurebesh() {
    try {
      if (document.fonts && document.fonts.load) {
        await document.fonts.load(`${FONT_PX}px "Aurebesh"`, "AUREBESH");
        if (document.fonts.ready) await document.fonts.ready;
      }
    } catch (_) {}
  }

  // -----------------------------
  // SAFE-ALPHABET DETECTION
  // Idea: render each candidate char with Aurebesh font to a tiny canvas,
  // hash its bitmap; most common hash is typically the tofu square.
  // Exclude chars mapping to that hash.
  // -----------------------------
  function bitmapSignature(imgData) {
    // Fast-ish signature from sampled pixels
    const d = imgData.data;
    let s1 = 0, s2 = 0, s3 = 0;

    // sample a grid (every 4th pixel in x/y)
    const w = imgData.width, h = imgData.height;
    for (let y = 0; y < h; y += 4) {
      for (let x = 0; x < w; x += 4) {
        const i = (y * w + x) * 4;
        // luminance-ish
        const v = (d[i] + d[i + 1] + d[i + 2]) | 0;
        // include alpha too
        const a = d[i + 3] | 0;
        const k = (v + a) | 0;

        s1 = (s1 + k) >>> 0;
        s2 = (s2 + (k ^ (x * 17 + y * 31))) >>> 0;
        s3 = (s3 ^ ((k << (x % 5)) | (k >>> (5 - (x % 5))))) >>> 0;
      }
    }
    return `${s1.toString(16)}:${s2.toString(16)}:${s3.toString(16)}`;
  }

  function renderCharSig(ch, offCtx, size) {
    offCtx.clearRect(0, 0, size, size);
    offCtx.fillStyle = "rgba(0,0,0,0)";
    offCtx.fillRect(0, 0, size, size);

    // draw centered-ish
    offCtx.fillStyle = "rgba(255,255,255,1)";
    offCtx.textBaseline = "top";

    // measure to center
    const m = offCtx.measureText(ch);
    const x = Math.floor((size - m.width) * 0.5);
    const y = Math.floor((size - FONT_PX) * 0.5);

    offCtx.fillText(ch, x, y);

    const img = offCtx.getImageData(0, 0, size, size);
    return bitmapSignature(img);
  }

  async function buildSafeAlphabet() {
    const candidates = (
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
      "abcdefghijklmnopqrstuvwxyz" +
      "0123456789"
    ).split("");

    // offscreen canvas
    const size = 64;
    const off = document.createElement("canvas");
    off.width = size;
    off.height = size;
    const offCtx = off.getContext("2d", { willReadFrequently: true });
    setFont(offCtx);

    // compute signatures
    const sigMap = new Map(); // sig -> count
    const charSig = new Map(); // ch -> sig

    for (const ch of candidates) {
      const sig = renderCharSig(ch, offCtx, size);
      charSig.set(ch, sig);
      sigMap.set(sig, (sigMap.get(sig) || 0) + 1);
    }

    // tofu is usually the most frequent signature
    let tofuSig = null;
    let best = -1;
    for (const [sig, count] of sigMap.entries()) {
      if (count > best) {
        best = count;
        tofuSig = sig;
      }
    }

    // keep chars that are NOT tofu
    const safe = candidates.filter((ch) => charSig.get(ch) !== tofuSig);

    // prefer letters; digits often missing in Aurebesh fonts
    const safeLetters = safe.filter((ch) => /[A-Za-z]/.test(ch));
    const safeUpper = safeLetters.filter((ch) => /[A-Z]/.test(ch));
    const safeLower = safeLetters.filter((ch) => /[a-z]/.test(ch));

    // Choose the larger letter set; fallback to safe (any), then plain ascii
    let chosen = safeUpper.length >= safeLower.length ? safeUpper : safeLower;
    if (chosen.length < 8) chosen = safeLetters;
    if (chosen.length < 8) chosen = safe;

    if (chosen.length < 8) {
      // last resort: system monospace will have this
      chosen = "abcdefghijklmnopqrstuvwxyz".split("");
    }

    return chosen;
  }

  // -----------------------------
  // Streams: 3 types from safe alphabet
  // -----------------------------
  let SAFE = null;

  function pickFrom(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  function makeDigraphs(base) {
    // build 2-letter tokens from safe alphabet (first 16 to keep stable)
    const pool = base.slice(0, Math.min(16, base.length));
    const out = [];
    for (let i = 0; i < pool.length; i++) {
      for (let j = 0; j < pool.length; j++) {
        if (out.length >= 60) return out;
        if (i === j) continue;
        out.push(pool[i] + pool[j]);
      }
    }
    return out.length ? out : [pool[0] + pool[1]];
  }

  function buildTechSet(base) {
    // pick a subset (about half) to look more "technical"
    const shuffled = base.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.max(8, Math.floor(base.length * 0.55)));
  }

  // -----------------------------
  // Columns
  // -----------------------------
  const cols = [];

  function buildColumns() {
    cols.length = 0;
    if (!SAFE || !SAFE.length) return;

    const SINGLE = SAFE;
    const TECH = buildTechSet(SAFE);
    const DIGRAPHS = makeDigraphs(SAFE);

    const count = Math.max(10, Math.floor(W / COL_W));
    for (let i = 0; i < count; i++) {
      const len = Math.floor(rand(9, 16));
      const type = i % 3;

      const slots = new Array(len).fill(null).map(() => ({
        ch: type === 0 ? pickFrom(SINGLE) : type === 1 ? pickFrom(TECH) : pickFrom(DIGRAPHS),
        next: performance.now() + rand(2000, 4000),
      }));

      cols.push({
        type,
        x: i * COL_W + rand(-10, 10),
        y: rand(-H, H),
        speed: rand(0.20, 0.55) * (reduceMotion ? 0.55 : 1),
        len,
        slots,
        wob: rand(0.003, 0.009),
        ph: rand(0, Math.PI * 2),
        SINGLE,
        TECH,
        DIGRAPHS,
      });
    }
  }

  window.addEventListener("resize", () => buildColumns(), { passive: true });

  // -----------------------------
  // Particles
  // -----------------------------
  const particles = [];
  const PCOUNT = reduceMotion ? 24 : 60;

  function spawnParticle() {
    const slow = reduceMotion ? 0.55 : 1;
    particles.push({
      x: W + rand(0, 320),
      y: rand(-220, H + 220),
      r: rand(1.2, 3.2),
      vx: rand(-0.20, -0.05) * slow,
      vy: rand(-0.04, 0.07) * slow,
      a: rand(0.06, 0.18),
      tint: Math.random() < 0.72 ? "holo" : "blue",
      tw: rand(0.003, 0.010),
      ph: rand(0, Math.PI * 2),
    });
  }
  for (let i = 0; i < PCOUNT; i++) spawnParticle();

  // -----------------------------
  // Beams
  // -----------------------------
  const beams = [];
  const BCOUNT = reduceMotion ? 2 : 4;

  function spawnBeam() {
    const slow = reduceMotion ? 0.7 : 1;
    beams.push({
      x: rand(-W * 0.2, W * 1.2),
      y: rand(-H * 0.3, H * 1.3),
      w: rand(520, 980),
      h: rand(180, 280),
      vx: rand(-0.040, -0.010) * slow,
      vy: rand(0.00, 0.014) * slow,
      a: rand(-0.22, 0.22),
      alpha: rand(0.045, 0.095),
      tint: Math.random() < 0.65 ? "holo" : "blue",
      life: rand(1000, 1700),
    });
  }
  for (let i = 0; i < BCOUNT; i++) spawnBeam();

  // -----------------------------
  // Render
  // -----------------------------
  let tick = 0;
  let raf = 0;
  let lastTs = 0;

  function drawBackdrop() {
    const g = ctx.createRadialGradient(
      W * 0.5, H * 0.18, 120,
      W * 0.5, H * 0.62, Math.max(W, H)
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.60, "rgba(0,0,0,0.22)");
    g.addColorStop(1, "rgba(0,0,0,0.58)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function pickTokenFor(col) {
    if (col.type === 0) return pickFrom(col.SINGLE);
    if (col.type === 1) return pickFrom(col.TECH);
    return pickFrom(col.DIGRAPHS);
  }

  function drawDataRain(now) {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0,0,0,0.072)";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    setFont(ctx);

    for (const c of cols) {
      c.y += c.speed;

      const wob = Math.sin(c.ph + tick * c.wob) * 0.9;
      const x = c.x + wob;

      for (let i = 0; i < c.slots.length; i++) {
        const s = c.slots[i];
        if (now >= s.next) {
          s.ch = pickTokenFor(c);
          s.next = now + rand(2000, 4000);
        }
      }

      for (let i = 0; i < c.len; i++) {
        const yy = c.y - i * ROW_H;
        if (yy < -ROW_H || yy > H + ROW_H) continue;

        const head = i === 0;
        const alpha = clamp((1 - i / c.len) * (head ? 0.58 : 0.34), 0, 0.85);

        const baseMix = c.type === 0 ? 0.55 : c.type === 1 ? 0.35 : 0.70;
        const mix = baseMix + 0.18 * Math.sin(tick * 0.010 + c.ph);

        const rgb = [
          Math.round(lerp(C.holo[0], C.blue[0], mix)),
          Math.round(lerp(C.holo[1], C.blue[1], mix)),
          Math.round(lerp(C.holo[2], C.blue[2], mix)),
        ];

        ctx.fillStyle = rgba(rgb, alpha);

        const text = c.slots[i].ch;
        const dx = text.length === 2 ? -8 : 0;
        ctx.fillText(text, x + dx, yy);

        if (head) {
          ctx.fillStyle = rgba(C.ink, 0.10);
          ctx.fillRect(x - 2, yy + FONT_PX + 4, FONT_PX + 12, 1);
        }
      }

      if (c.y - c.len * ROW_H > H + 90) {
        c.y = rand(-H * 0.95, -160);
        c.speed = rand(0.20, 0.55) * (reduceMotion ? 0.55 : 1);
      }
    }

    ctx.restore();
  }

  function drawBeams() {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (const b of beams) {
      b.x += b.vx;
      b.y += b.vy;
      b.life -= 1;

      const rgb = b.tint === "holo" ? C.holo : C.blue;

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.a);

      const grad = ctx.createLinearGradient(-b.w * 0.5, 0, b.w * 0.5, 0);
      grad.addColorStop(0, rgba(rgb, 0));
      grad.addColorStop(0.5, rgba(rgb, b.alpha));
      grad.addColorStop(1, rgba(rgb, 0));

      ctx.fillStyle = grad;
      ctx.fillRect(-b.w * 0.5, -b.h * 0.5, b.w, b.h);
      ctx.restore();

      if (b.life <= 0 || b.x < -W * 0.8) {
        b.x = W + rand(0, W * 0.6);
        b.y = rand(-H * 0.3, H * 1.3);
        b.w = rand(520, 980);
        b.h = rand(180, 280);
        b.vx = rand(-0.040, -0.010) * (reduceMotion ? 0.7 : 1);
        b.vy = rand(0.00, 0.014) * (reduceMotion ? 0.7 : 1);
        b.a = rand(-0.22, 0.22);
        b.alpha = rand(0.045, 0.095);
        b.tint = Math.random() < 0.65 ? "holo" : "blue";
        b.life = rand(1000, 1700);
      }
    }

    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      const tw = 0.65 + 0.35 * Math.sin(p.ph + tick * p.tw);
      const a = p.a * tw;
      const rgb = p.tint === "holo" ? C.holo : C.blue;

      ctx.fillStyle = rgba(rgb, a * 0.22);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 2.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = rgba(C.ink, a * 0.10);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.9, 0, Math.PI * 2);
      ctx.fill();

      if (p.x < -320 || p.y < -320 || p.y > H + 320) {
        p.x = W + rand(0, 360);
        p.y = rand(-220, H + 220);
      }
    }

    ctx.restore();
  }

  function step(ts) {
    const targetDt = reduceMotion ? 1000 / 18 : 0;
    if (targetDt && ts - lastTs < targetDt) {
      raf = requestAnimationFrame(step);
      return;
    }
    lastTs = ts;

    tick += 1;
    if (tick % 1200 === 0) ctx.clearRect(0, 0, W, H);

    drawDataRain(ts);
    drawBeams();
    drawParticles();
    drawBackdrop();

    raf = requestAnimationFrame(step);
  }

  function start() {
    ctx.clearRect(0, 0, W, H);
    raf = requestAnimationFrame(step);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        lastTs = 0;
        raf = requestAnimationFrame(step);
      }
    });
  }

  // Boot sequence:
  // 1) wait for font
  // 2) detect safe alphabet (removes tofu)
  // 3) build streams & start
  waitForAurebesh()
    .then(buildSafeAlphabet)
    .then((safe) => {
      SAFE = safe;
      buildColumns();
      start();
    })
    .catch(() => {
      SAFE = "abcdefghijklmnopqrstuvwxyz".split("");
      buildColumns();
      start();
    });
})();
