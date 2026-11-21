/* SPARK-7 — interactions, charts and motion.

   Structure
   1. Everything that matters (menu, charts, tooltips, numbers) works with plain JS.
   2. Motion (motion.dev) and Anime.js v4 are loaded from a CDN as an upgrade:
        Motion  → scroll reveals, scroll progress bar, count-up numbers, hover/press feel, pointer parallax
        Anime.js → hero text split, hand-drawn underline, floating habit chips, bar + donut drawing
   3. If a CDN can't be reached (offline, blocked), the page falls back to CSS transitions.
   This file is a classic script on purpose, so opening index.html straight from a folder still works. */
(() => {
  'use strict';
  window.__spark = true; // tells the page's safety net that this script is running

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n, d = 2) => Number(n).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });

  const MOTION_URL = 'https://cdn.jsdelivr.net/npm/motion@12/+esm';
  const ANIME_URL = 'https://cdn.jsdelivr.net/npm/animejs@4/+esm';

  /* ---------- mobile menu ---------- */
  const menu = $('.menu');
  const nav = $('header nav');
  if (menu && nav) {
    const set = (open) => { nav.classList.toggle('open', open); menu.setAttribute('aria-expanded', String(open)); };
    menu.addEventListener('click', () => set(!nav.classList.contains('open')));
    $$('a', nav).forEach((a) => a.addEventListener('click', () => set(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  /* ---------- tooltip (shadcn-style: colour square, name, value) ---------- */
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tip);
  let tipTimer;
  const tipData = new WeakMap();
  function showTip(items, x, y) {
    tip.innerHTML = items.map((i) => `<div><i style="--c:${i.c}"></i><span>${i.n}</span><b>${i.v}</b></div>`).join('');
    tip.classList.add('on');
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let nx = x + 14, ny = y + 16;
    if (nx + w > window.innerWidth - 8) nx = x - w - 14;
    if (ny + h > window.innerHeight - 8) ny = y - h - 14;
    tip.style.transform = `translate(${Math.max(8, nx)}px, ${Math.max(8, ny)}px)`;
  }
  const hideTip = () => tip.classList.remove('on');

  function wireTips(root, activeClass = 'has-active', itemSel = '[data-tip]') {
    const clear = () => {
      root.classList.remove(activeClass);
      $$('.is-active', root).forEach((n) => n.classList.remove('is-active'));
      hideTip();
    };
    const hit = (el, x, y) => {
      const items = tipData.get(el);
      if (!items) return clear();
      root.classList.add(activeClass);
      $$('.is-active', root).forEach((n) => n.classList.remove('is-active'));
      el.classList.add('is-active');
      showTip(items, x, y);
    };
    root.addEventListener('pointermove', (e) => {
      const el = e.target.closest(itemSel);
      el && root.contains(el) ? hit(el, e.clientX, e.clientY) : clear();
    });
    root.addEventListener('pointerleave', clear);
    root.addEventListener('click', (e) => {
      const el = e.target.closest(itemSel);
      if (!el || !root.contains(el)) return;
      hit(el, e.clientX, e.clientY);
      clearTimeout(tipTimer);
      tipTimer = setTimeout(clear, 2800); // so a tap on a phone shows the number for a moment
    });
    root.addEventListener('focusin', (e) => {
      const el = e.target.closest(itemSel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      hit(el, r.left + r.width / 2, r.top);
    });
    root.addEventListener('focusout', clear);
  }

  /* ---------- chart data (numbers come from the school survey report) ---------- */
  const C = { blue: 'var(--chart-1)', yellow: 'var(--chart-2)', coral: 'var(--chart-3)', navy: 'var(--chart-4)', pale: 'var(--chart-5)' };

  const charts = {
    attitudeChart: { kind: 'bar', max: 4, ticks: ['0', '1', '2', '3', '4'], unit: ' dari 4', rows: [
      ['Ibadah', 3.66], ['Tidur cepat', 3.61], ['Bangun pagi', 3.44], ['Makan sehat', 3.41],
      ['Olahraga', 3.38], ['Belajar mandiri', 3.36], ['Kepedulian sosial', 3.36]] },
    gapChart: { kind: 'pair', max: 100, ticks: ['0', '25', '50', '75', '100%'], rows: [
      ['Aktivitas fisik ≥3 hari', 93, 47], ['Sarapan setiap hari', 94, 53.5],
      ['Air putih ≥2 L/hari', 95, 44.4], ['Belajar ≥30 menit/hari', 94, 38]] },
    progressChart: { kind: 'bar', max: 4, ticks: ['0', '1', '2', '3', '4'], unit: ' dari 4', warn: ['Pola makan', 'Baca/belajar'], rows: [
      ['Bangun pagi', 3.07], ['Aksi sosial', 2.90], ['Ibadah', 2.88], ['Olahraga', 2.68],
      ['Gadget & tidur', 2.65], ['Pola makan', 2.42], ['Baca/belajar', 2.30]] },
    gradeChart: { kind: 'bar', max: 4, ticks: ['0', '1', '2', '3', '4'], unit: ' dari 4', warn: ['Kelas XI'], rows: [
      ['Kelas X', 3.46, 'n = 498'], ['Kelas XI', 3.39, 'n = 508'], ['Kelas XII', 3.57, 'n = 360']] },
    motivationChart: { kind: 'bar', max: 4, ticks: ['0', '1', '2', '3', '4'], unit: ' dari 4', hi: ['Target nilai/skor'], rows: [
      ['Target nilai/skor', 3.13, 'n = 107'], ['Ajakan teman', 2.73, 'n = 50'],
      ['Kesadaran pribadi', 2.58, 'n = 285'], ['Pantauan orang tua', 2.36, 'n = 44']] },
    correlationChart: { kind: 'diverge', rows: [
      ['Sikap total ↔ kemajuan diri', 0.46], ['Sikap olahraga ↔ durasi olahraga', 0.37],
      ['Sikap sosial ↔ aksi sosial', 0.31], ['Sikap olahraga ↔ hari aktif', 0.31],
      ['Jam tidur larut ↔ durasi tidur', -0.32], ['Sikap bangun pagi ↔ jam bangun', -0.15],
      ['Sikap makan sehat ↔ sarapan', 0.10]] },
  };

  function row(label, sub, tipItems) {
    const r = document.createElement('div');
    r.className = 'row';
    r.tabIndex = 0;
    r.innerHTML = `<div class="label">${label}${sub ? `<small>${sub}</small>` : ''}</div><div class="bar-track"></div><div class="value"></div>`;
    tipData.set(r, tipItems);
    r.dataset.tip = '1';
    return r;
  }
  function fill(track, ratio, color, extra = '', i = 0) {
    const f = document.createElement('i');
    f.className = `bar-fill ${extra}`.trim();
    f.style.setProperty('--v', ratio);
    f.style.setProperty('--c', color);
    f.style.setProperty('--i', i);
    f.dataset.w = `${ratio * 100}%`;
    track.appendChild(f);
    return f;
  }
  function axis(el, ticks) {
    const a = document.createElement('div');
    a.className = 'axis';
    a.setAttribute('aria-hidden', 'true');
    ticks.forEach((t, i) => { const s = document.createElement('span'); s.textContent = t; s.style.left = `${(i / (ticks.length - 1)) * 100}%`; a.appendChild(s); });
    el.appendChild(a);
  }

  function buildChart(id, cfg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('chart');
    if (cfg.kind === 'pair') el.classList.add('pair');
    if (cfg.kind === 'diverge') el.classList.add('diverge');

    cfg.rows.forEach((d, i) => {
      const [label, a, b] = d;
      if (cfg.kind === 'bar') {
        const color = (cfg.warn || []).includes(label) ? C.coral : (cfg.hi || []).includes(label) ? C.yellow : C.blue;
        const r = row(label, b, [{ c: color, n: label, v: fmt(a) + (cfg.unit || '') }]);
        fill($('.bar-track', r), a / cfg.max, color, '', i);
        $('.value', r).textContent = fmt(a);
        el.appendChild(r);
      } else if (cfg.kind === 'pair') {
        const r = row(label, '', [
          { c: C.blue, n: 'Setuju (Survei 1)', v: `${fmt(a, a % 1 ? 1 : 0)}%` },
          { c: C.yellow, n: 'Benar-benar melakukan (Survei 2)', v: `${fmt(b, 1)}%` }]);
        const t = $('.bar-track', r);
        fill(t, a / cfg.max, C.blue, '', i);
        fill(t, b / cfg.max, C.yellow, 'second', i);
        $('.value', r).innerHTML = `<span style="color:var(--chart-1)">${fmt(a, 0)}%</span><br><span style="color:var(--chart-2)">${fmt(b, 1)}%</span>`;
        el.appendChild(r);
      } else {
        const neg = a < 0;
        const color = neg ? C.coral : C.yellow;
        const r = row(label, '', [{ c: color, n: `Korelasi Spearman ρ`, v: (a > 0 ? '+' : '−') + fmt(Math.abs(a)) }]);
        const t = $('.bar-track', r);
        if (!$('.zero', el)) { /* the centre line is drawn once per row via the track */ }
        const z = document.createElement('span'); z.className = 'zero'; t.appendChild(z);
        fill(t, Math.abs(a), color, neg ? 'neg' : 'pos', i);
        $('.value', r).textContent = (a > 0 ? '+' : '−') + fmt(Math.abs(a));
        el.appendChild(r);
      }
    });
    if (cfg.ticks) axis(el, cfg.ticks);
    if (cfg.kind === 'diverge') axis(el, ['−0,5', '0', '+0,5']);
    wireTips(el, 'has-active', '.row');
  }

  function buildDonut() {
    const el = document.getElementById('profileChart');
    if (!el) return;
    const rows = [['Perempuan', 776, C.blue], ['Laki-laki', 590, C.yellow]];
    const total = rows.reduce((s, r) => s + r[1], 0);
    el.classList.add('donut');
    let start = 0;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    rows.forEach(([name, n, color]) => {
      const share = (n / total) * 100;
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', 50); c.setAttribute('cy', 50); c.setAttribute('r', 38);
      c.setAttribute('pathLength', 100);
      c.setAttribute('stroke', 'currentColor');
      c.style.color = color;
      c.setAttribute('stroke-dasharray', `${share - 1.2} ${100 - share + 1.2}`);
      c.setAttribute('stroke-dashoffset', -start);
      c.setAttribute('class', 'seg');
      c.dataset.from = start / 100;
      c.dataset.to = (start + share) / 100;
      tipData.set(c, [{ c: color, n: name, v: `${fmt(n, 0)} siswa · ${fmt(share, 1)}%` }]);
      c.dataset.tip = '1';
      svg.appendChild(c);
      start += share;
    });
    el.appendChild(svg);
    const ctr = document.createElement('div');
    ctr.className = 'center';
    ctr.innerHTML = `<b>${fmt(total, 0)}</b><span>siswa</span>`;
    el.appendChild(ctr);
    wireTips(el, 'has-active', '.seg');
  }

  Object.entries(charts).forEach(([id, cfg]) => buildChart(id, cfg));
  buildDonut();

  /* legend that hides one series (gap chart) */
  $$('.legend button').forEach((b) => b.addEventListener('click', () => {
    const target = document.getElementById(b.dataset.target);
    if (!target) return;
    const off = b.getAttribute('aria-pressed') === 'true';
    b.setAttribute('aria-pressed', String(!off));
    target.classList.toggle(b.dataset.hide, off);
  }));


  /* ---------- background: a quiet night sky of slowly twinkling stars ----------
     Plain canvas, no library. Stars drift a little as you scroll and lean toward the pointer,
     two soft colour washes breathe behind them, and now and then a spark crosses the sky.
     Reduced-motion visitors get one still frame. */
  function initSky() {
    const cv = document.createElement('canvas');
    cv.className = 'sky';
    cv.setAttribute('aria-hidden', 'true');
    document.body.prepend(cv);
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let w = 0, h = 0, stars = [], streak = null, nextStreak = 4000 + Math.random() * 5000;
    let px = 0, py = 0, tx = 0, ty = 0, last = 0, running = false, raf = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(120, (w * h) / 13000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: 0.4 + Math.random() * 1.2,
        depth: 0.25 + Math.random() * 0.75,
        phase: Math.random() * 6.283, speed: 0.5 + Math.random() * 1.1,
        gold: Math.random() < 0.13,
      }));
    }

    function wash(x, y, r, rgb, a) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    function frame(now) {
      const t = now / 1000;
      const dt = Math.min(64, now - last); last = now;
      px += (tx - px) * 0.04; py += (ty - py) * 0.04;
      ctx.clearRect(0, 0, w, h);

      const big = Math.max(w, h);
      wash(w * (0.82 + Math.sin(t * 0.07) * 0.05), h * (0.12 + Math.cos(t * 0.06) * 0.04), big * 0.55, '104,134,230', 0.17);
      wash(w * (0.1 + Math.cos(t * 0.05) * 0.05), h * (0.9 + Math.sin(t * 0.08) * 0.04), big * 0.5, '255,201,60', 0.055);

      const sy = window.scrollY;
      for (const s of stars) {
        const x = (((s.x + px * 24 * s.depth) % w) + w) % w;
        const y = (((s.y - sy * 0.18 * s.depth + py * 24 * s.depth) % h) + h) % h;
        const tw = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        const a = (0.22 + tw * 0.65) * (0.45 + s.depth * 0.55);
        const col = s.gold ? '255,201,60' : '201,214,255';
        ctx.fillStyle = `rgba(${col},${a})`;
        if (s.r > 1.1) { // the bigger ones get a little four-point glint, like the logo
          const L = s.r * (3 + tw * 3);
          ctx.strokeStyle = `rgba(${col},${a * 0.8})`; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.283); ctx.fill();
      }

      nextStreak -= dt;
      if (!streak && nextStreak <= 0) {
        streak = { x: w * (0.45 + Math.random() * 0.55), y: -10, life: 0 };
        nextStreak = 9000 + Math.random() * 9000;
      }
      if (streak) {
        streak.life += dt / 1000; streak.x -= dt * 0.55; streak.y += dt * 0.3;
        const f = 1 - streak.life / 1.6;
        if (f <= 0) streak = null;
        else {
          const g = ctx.createLinearGradient(streak.x, streak.y, streak.x + 120, streak.y - 65);
          g.addColorStop(0, `rgba(255,214,110,${0.85 * f})`); g.addColorStop(1, 'rgba(255,214,110,0)');
          ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(streak.x, streak.y); ctx.lineTo(streak.x + 120, streak.y - 65); ctx.stroke();
        }
      }
      if (running) raf = requestAnimationFrame(frame);
    }

    function play() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } }
    resize();
    window.addEventListener('resize', () => { resize(); if (!running) frame(performance.now()); });
    if (reduce) { frame(performance.now()); return; }
    window.addEventListener('pointermove', (e) => { tx = e.clientX / w - 0.5; ty = e.clientY / h - 0.5; }, { passive: true });
    document.addEventListener('visibilitychange', () => { running = false; cancelAnimationFrame(raf); if (!document.hidden) play(); });
    play();
  }
  initSky();

  /* ---------- load the animation libraries, but never wait too long ---------- */
  const timeout = new Promise((res) => setTimeout(() => res('timeout'), 2500));
  const loaded = Promise.allSettled([import(MOTION_URL), import(ANIME_URL)]).then((r) => ({
    M: r[0].status === 'fulfilled' ? r[0].value : null,
    A: r[1].status === 'fulfilled' ? r[1].value : null,
  }));

  Promise.race([loaded, timeout]).then((res) => {
    const libs = res === 'timeout' ? { M: null, A: null } : res;
    start(reduce ? { M: null, A: null } : libs);
  }).catch(() => start({ M: null, A: null }));

  function start({ M, A }) {
    const safe = (fn) => { try { fn(); } catch (err) { console.warn('[SPARK-7] animation skipped:', err); } };

    /* scroll reveal — Motion if we have it, IntersectionObserver + CSS if not */
    const revealEls = $$('[data-reveal]');
    const cssReveal = (els) => {
      if (!('IntersectionObserver' in window)) return els.forEach((e) => e.classList.add('in'));
      const io = new IntersectionObserver((entries) => entries.forEach((en) => {
        if (en.isIntersecting) { const d = Number(en.target.dataset.delay || 0); setTimeout(() => en.target.classList.add('in'), d * 1000); io.unobserve(en.target); }
      }), { threshold: 0.12 });
      els.forEach((e) => io.observe(e));
    };
    if (M) {
      safe(() => M.inView(revealEls, (el) => {
        const delay = Number(el.dataset.delay || 0);
        M.animate(el, { opacity: [0, 1], y: [22, 0] }, { duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] });
      }, { margin: '0px 0px -8% 0px' }));
    } else cssReveal(revealEls);

    /* scroll progress bar */
    const bar = $('.progress');
    if (bar) {
      if (M) safe(() => M.scroll(M.animate(bar, { scaleX: [0, 1] }, { ease: 'linear' })));
      else {
        const upd = () => { const h = document.documentElement; const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight); bar.style.transform = `scaleX(${p})`; };
        window.addEventListener('scroll', upd, { passive: true }); upd();
      }
    }

    /* numbers count up when they come into view */
    if (M) {
      $$('[data-count]').forEach((el) => safe(() => {
        const to = parseFloat(el.dataset.count);
        const d = Number(el.dataset.decimals || 0);
        const suf = el.dataset.suffix || '';
        M.inView(el, () => {
          M.animate(0, to, { duration: 1.5, ease: 'easeOut', onUpdate: (v) => { el.textContent = fmt(v, d) + suf; } });
        });
      }));
    }

    /* buttons: a little spring on hover and press */
    if (M && M.hover && M.press) safe(() => {
      const spring = { type: 'spring', stiffness: 420, damping: 22 };
      M.hover('.btn, .cta', (el) => { M.animate(el, { scale: 1.05 }, spring); return () => M.animate(el, { scale: 1 }, spring); });
      M.press('.btn, .cta', (el) => { M.animate(el, { scale: 0.95 }, { duration: 0.1 }); return () => M.animate(el, { scale: 1.05 }, spring); });
    });

    /* hero */
    const lead = $('.hero .lead');
    const sq = $('.hero .squiggle');
    const showHero = () => { if (lead) lead.style.visibility = 'visible'; if (sq) sq.style.opacity = 1; };
    if (A) {
      safe(() => {
        if (lead) {
          const split = A.splitText(lead, { words: true });
          split.words.forEach((w) => { w.style.opacity = 0; });
          lead.style.visibility = 'visible';
          A.animate(split.words, { opacity: [0, 1], y: ['0.45em', 0], delay: A.stagger(26, { start: 350 }), duration: 650, ease: 'out(3)' });
        }
      });
      safe(() => {
        const path = $('path', sq || document.createElement('div'));
        const make = (A.svg && A.svg.createDrawable) || A.createDrawable;
        if (path && make) {
          sq.style.opacity = 1;
          A.animate(make(path), { draw: ['0 0', '0 1'], duration: 1100, delay: 900, ease: 'inOutQuad' });
        }
      });
      safe(() => {
        $$('.sat .chip').forEach((chip, i) => {
          A.animate(chip, { y: [0, i % 2 ? -9 : -12], duration: 2300 + i * 270, delay: 600 + i * 160, loop: true, alternate: true, ease: 'inOutSine' });
        });
        const fl = $('.star-float');
        if (fl) A.animate(fl, { y: [0, -10], rotate: [-1.5, 1.5], duration: 4200, loop: true, alternate: true, ease: 'inOutSine' });
      });
    }
    showHero();

    /* pointer parallax on the star (Motion springs) */
    const art = $('.constellation');
    const star = $('.star-img');
    if (M && art && star && window.matchMedia('(pointer: fine)').matches) safe(() => {
      const spring = { type: 'spring', stiffness: 90, damping: 14 };
      art.addEventListener('pointermove', (e) => {
        const r = art.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        M.animate(star, { x: dx * 28, y: dy * 28, rotate: dx * 8 }, spring);
      });
      art.addEventListener('pointerleave', () => M.animate(star, { x: 0, y: 0, rotate: 0 }, spring));
    });

    /* charts draw themselves when they scroll into view */
    const targets = $$('.chart, .bars-lite, .donut');
    const play = (el) => {
      if (el.classList.contains('donut')) {
        if (!A) return;
        safe(() => {
          const make = (A.svg && A.svg.createDrawable) || A.createDrawable;
          $$('circle', el).forEach((c, i) => {
            const from = c.dataset.from, to = c.dataset.to;
            A.animate(make(c), { draw: [`${from} ${from}`, `${from} ${to}`], duration: 1100, delay: i * 350, ease: 'inOutQuart' });
          });
        });
        return;
      }
      const fills = $$('.bar-fill', el);
      if (A) {
        safe(() => fills.forEach((f, i) => {
          const rowEl = f.closest('.row') || f.closest('.mini');
          const idx = rowEl ? $$('.row, .mini', el).indexOf(rowEl) : i;
          A.animate(f, { width: ['0%', f.dataset.w], duration: 1000, delay: 80 + idx * 70, ease: 'out(4)' });
        }));
        el.classList.add('anime-on');
        setTimeout(() => el.classList.add('in'), 1600); // keeps widths if the page is resized later
      } else el.classList.add('in');
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => entries.forEach((en) => {
        if (en.isIntersecting) { play(en.target); io.unobserve(en.target); }
      }), { threshold: 0.3 });
      targets.forEach((t) => io.observe(t));
    } else targets.forEach(play);
  }
})();
