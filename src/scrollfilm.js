/**
 * scrollfilm.js — a cinematic scroll-driven WebGL film engine.
 *
 * A fixed Three.js canvas plays a "film" underneath real HTML chapters.
 * Scroll position is the playhead: a damped interpolation loop turns irregular
 * scroll input into buttery rendering, chapters activate from the real page
 * layout, and an optional film-player HUD shows progress, zone and FPS.
 *
 * Minimal usage:
 *
 *   import { ScrollFilm } from 'scrollfilm';
 *
 *   new ScrollFilm({
 *     canvas: '#film',
 *     stops: [
 *       { chapter: 0, name: 'Intro', camera: { pos: [0, 20, 80], look: [0, 0, 0] } },
 *       { chapter: 1, name: 'Deep',  camera: { pos: [0, -40, 60], look: [0, -40, 0] } },
 *     ],
 *     onFrame: (p, t, api) => {
 *       // draw your Three.js scene here — api.scene, api.camera, api.renderer
 *     },
 *   });
 *
 * @version 1.0.0
 * @license MIT — Aman Singh
 */
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* math helpers (also exported for scene code)                         */
/* ------------------------------------------------------------------ */

/** Clamp a number to [0, 1]. */
export const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** Linear interpolation. */
export const lerp = (a, b, t) => a + (b - a) * t;

/** Smoothstep between edges a and b. */
export const sstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * Envelope: ramps 0→1 between a→b, holds 1, ramps 1→0 between c→d.
 * Perfect for fading scene elements in and out across scroll ranges.
 */
export const env = (p, a, b, c, d) => sstep(a, b, p) * (1 - sstep(c, d, p));

/** Random float in [a, b). */
export const rnd = (a, b) => a + Math.random() * (b - a);

const helpers = { clamp01, lerp, sstep, env, rnd };

/* ------------------------------------------------------------------ */
/* ScrollFilm                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_HUD = {
  zone: '#hudZone',
  extra: '#hudExtra',
  bar: '#hudBar',
  knob: '#hudKnob',
  fps: '#hudFps',
};

export class ScrollFilm {
  /**
   * @param {object} opts
   * @param {string|HTMLCanvasElement} opts.canvas   Canvas element (or selector). Required.
   * @param {string} [opts.chapterSelector='.chapter']  Selector for chapter sections.
   * @param {Array}  [opts.stops=[]]  Camera journey. Each stop:
   *   { chapter:number, at?:number(0..1), name?:string,
   *     camera?:{ pos:[x,y,z], look:[x,y,z] }, data?:any }
   * @param {boolean|object} [opts.hud=true]  false to disable; true for default
   *   selectors; or { zone, extra, bar, knob, fps } with custom selectors/elements.
   * @param {Array}  [opts.background]  [{ p:number, color:hex }] background gradient keys.
   * @param {object} [opts.fog]  { near:[a,b], far:[a,b], range:[p0,p1] } — fog distances
   *   interpolated as the playhead moves through range.
   * @param {number} [opts.damping=5.5]  Playhead follow speed (higher = snappier).
   * @param {number} [opts.maxPixelRatio=2]  Cap for devicePixelRatio (1.75 on touch).
   * @param {number} [opts.minFps=34]  Below this, pixel ratio steps down automatically.
   * @param {function} [opts.onFrame]  (p, t, api) => void — draw your scene here.
   * @param {function} [opts.onZoneChange]  (name, data) => void — fires when the
   *   active zone label changes.
   */
  constructor(opts = {}) {
    if (!opts.canvas) throw new Error('[scrollfilm] option "canvas" is required');
    this.o = {
      chapterSelector: '.chapter',
      stops: [],
      hud: true,
      background: null,
      fog: null,
      damping: 5.5,
      maxPixelRatio: null,
      minFps: 34,
      onFrame: null,
      onZoneChange: null,
      ...opts,
    };

    this.canvas =
      typeof this.o.canvas === 'string' ? document.querySelector(this.o.canvas) : this.o.canvas;
    if (!this.canvas) throw new Error('[scrollfilm] canvas element not found');

    this.webglAvailable = false;
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      this._noWebGL();
      return;
    }
    this.webglAvailable = true;

    const coarse = matchMedia('(pointer: coarse)').matches;
    this.PR_CAP = this.o.maxPixelRatio ?? (coarse ? 1.75 : 2);
    this.pixelRatio = Math.min(devicePixelRatio || 1, PR_CAP);
    this.renderer.setPixelRatio(this.pixelRatio);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 4000);

    if (this.o.background) {
      this.bgKeys = [...this.o.background].sort((a, b) => a.p - b.p).map((k) => ({
        p: k.p,
        c: new THREE.Color(k.color),
      }));
      this.scene.background = new THREE.Color(this.bgKeys[0].c);
    }
    if (this.o.fog) {
      const c0 = this.bgKeys ? this.bgKeys[0].c : 0x000000;
      this.scene.fog = new THREE.Fog(c0, this.o.fog.near[0], this.o.fog.far[0]);
    }

    this._hud = this._resolveHud(this.o.hud);
    this.targetP = 0;
    this.smoothP = 0;
    this.stops = [];
    this._lastZone = null;
    this._raf = 0;
    this._destroyed = false;
    this._t = 0;

    // bound listeners (so destroy() can remove them)
    this._onScroll = () => this._readScroll();
    this._onResize = () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
      clearTimeout(this._resizeT);
      this._resizeT = setTimeout(() => this.measureChapters(), 150);
    };
    this._onLoad = () => this.measureChapters();

    addEventListener('scroll', this._onScroll, { passive: true });
    addEventListener('resize', this._onResize);
    addEventListener('load', this._onLoad);
    if (document.fonts?.ready) document.fonts.ready.then(() => this.measureChapters());

    this.chapterEls = [...document.querySelectorAll(this.o.chapterSelector)];
    this.chapters = this.chapterEls.map((el) => ({ el, from: 0, to: 1, active: false }));

    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer.setSize(innerWidth, innerHeight);
    this.measureChapters();

    if (this.reducedMotion) {
      this._staticSync = () => {
        this._readScroll();
        const r = this._render(this.targetP, 0);
        this._syncChapters(this.targetP, r.zone);
      };
      addEventListener('scroll', this._staticSync, { passive: true });
      this._staticSync();
    } else {
      this._clock = new THREE.Clock();
      this._frame();
    }
  }

  /* ---------------- public API ---------------- */

  /** Re-measure chapter positions (call after layout changes). */
  measureChapters() {
    if (this._destroyed) return;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    this.chapterEls.forEach((el, i) => {
      const from = clamp01(el.offsetTop / max);
      const to = clamp01((el.offsetTop + el.offsetHeight) / max);
      this.chapters[i].from = from;
      this.chapters[i].to = i === this.chapters.length - 1 ? 1 : to;
    });
    this._buildStops();
    this._readScroll();
  }

  /** Update the HUD "extra" readout (e.g. a depth or distance ticker). */
  setExtra(text) {
    if (this._hud.extra) this._hud.extra.textContent = text;
  }

  /** Smooth-scroll to a chapter index. */
  scrollToChapter(i, behavior = 'smooth') {
    const ch = this.chapters[i];
    if (!ch) return;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    scrollTo({ top: ch.from * max, behavior });
  }

  /** Current playhead + clock. */
  getState() {
    return { p: this.smoothP, t: this._t, zone: this._lastZone };
  }

  /** Stop the loop and remove listeners. */
  destroy() {
    this._destroyed = true;
    cancelAnimationFrame(this._raf);
    removeEventListener('scroll', this._onScroll);
    removeEventListener('resize', this._onResize);
    removeEventListener('load', this._onLoad);
    if (this._staticSync) removeEventListener('scroll', this._staticSync);
    clearTimeout(this._resizeT);
    this.renderer?.dispose();
  }

  /* ---------------- internals ---------------- */

  _resolveHud(hud) {
    if (!hud) return {};
    const sel = { ...DEFAULT_HUD, ...(hud === true ? {} : hud) };
    const out = {};
    for (const k of Object.keys(sel)) {
      const v = sel[k];
      out[k] = typeof v === 'string' ? document.querySelector(v) : v || null;
    }
    return out;
  }

  _noWebGL() {
    document.body.classList.add('no-webgl');
    document.getElementById('nogl')?.removeAttribute('hidden');
    document.querySelectorAll(this.o?.chapterSelector || '.chapter').forEach((el) =>
      el.classList.add('is-active')
    );
  }

  _readScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    this.targetP = max > 0 ? clamp01(scrollY / max) : 0;
  }

  _buildStops() {
    this.stops.length = 0;
    for (const d of this.o.stops) {
      const ch = this.chapters[d.chapter] ?? this.chapters[this.chapters.length - 1];
      if (!ch) continue;
      const at = d.at ?? 0.5;
      this.stops.push({
        p: ch.from + (ch.to - ch.from) * at,
        name: d.name ?? '',
        data: d.data,
        pos: d.camera?.pos ?? [0, 0, 120],
        look: d.camera?.look ?? [0, 0, 0],
      });
    }
    this.stops.sort((a, b) => a.p - b.p);
  }

  _syncChapters(p, zone) {
    let ai = this.chapters.length - 1;
    for (let i = 0; i < this.chapters.length; i++) {
      if (p < this.chapters[i].to) { ai = i; break; }
    }
    for (let i = 0; i < this.chapters.length; i++) {
      const on = i === ai;
      if (on !== this.chapters[i].active) {
        this.chapters[i].active = on;
        this.chapters[i].el.classList.toggle('is-active', on);
      }
    }
    if (zone !== this._lastZone) {
      this._lastZone = zone;
      if (this._hud.zone) this._hud.zone.textContent = zone;
      this.o.onZoneChange?.(zone, this._zoneData);
    }
    if (this._hud.bar) this._hud.bar.style.width = `${(p * 100).toFixed(2)}%`;
    if (this._hud.knob) this._hud.knob.style.left = `${(p * 100).toFixed(2)}%`;
  }

  _render(p, t) {
    const stops = this.stops;
    let A, B, tt;
    if (stops.length === 0) {
      A = B = { p: 0, name: '', data: undefined, pos: [0, 0, 120], look: [0, 0, 0] };
      tt = 0;
    } else if (stops.length === 1) {
      A = B = stops[0]; tt = 0;
    } else {
      let i = 0;
      while (i < stops.length - 2 && p > stops[i + 1].p) i++;
      A = stops[i]; B = stops[i + 1];
      tt = sstep(A.p, B.p, p);
    }
    this.camera.position.set(lerp(A.pos[0], B.pos[0], tt), lerp(A.pos[1], B.pos[1], tt), lerp(A.pos[2], B.pos[2], tt));
    this.camera.lookAt(lerp(A.look[0], B.look[0], tt), lerp(A.look[1], B.look[1], tt), lerp(A.look[2], B.look[2], tt));
    const zone = A.name === B.name ? A.name : tt < 0.5 ? A.name : B.name;
    this._zoneData = tt < 0.5 ? A.data : B.data;

    if (this.bgKeys) {
      let ci = 0;
      while (ci < this.bgKeys.length - 2 && p > this.bgKeys[ci + 1].p) ci++;
      const KA = this.bgKeys[ci], KB = this.bgKeys[ci + 1];
      this._bgColor ??= new THREE.Color();
      this._bgColor.copy(KA.c).lerp(KB.c, sstep(KA.p, KB.p, p));
      this.scene.background.copy(this._bgColor);
      if (this.scene.fog) this.scene.fog.color.copy(this._bgColor);
    }
    if (this.o.fog) {
      const fT = sstep(this.o.fog.range[0], this.o.fog.range[1], p);
      this.scene.fog.near = lerp(this.o.fog.near[0], this.o.fog.near[1], fT);
      this.scene.fog.far = lerp(this.o.fog.far[0], this.o.fog.far[1], fT);
    }

    const api = { film: this, THREE, helpers, scene: this.scene, camera: this.camera, renderer: this.renderer, p, t };
    this.o.onFrame?.(p, t, api);
    this.renderer.render(this.scene, this.camera);
    return { zone };
  }

  _syncPerf(dt, t) {
    if (!this._hud.fps && this.pixelRatio <= 1) return;
    if (dt > 0) this._fpsEma = (this._fpsEma ?? 60) + (1 / dt - (this._fpsEma ?? 60)) * 0.06;
    if (t - (this._lastFpsText ?? 0) > 0.5) {
      this._lastFpsText = t;
      const f = Math.round(this._fpsEma ?? 60);
      if (this._hud.fps) {
        this._hud.fps.textContent = `${f} fps`;
        this._hud.fps.className = `hud-fps ${f >= 40 ? 'good' : 'warn'}`;
      }
    }
    if (t - (this._lastQuality ?? 0) > 2.5) {
      this._lastQuality = t;
      if ((this._fpsEma ?? 60) < this.o.minFps && this.pixelRatio > 1) {
        this.pixelRatio = Math.max(1, this.pixelRatio - 0.25);
        this.renderer.setPixelRatio(this.pixelRatio);
      } else if ((this._fpsEma ?? 60) > 57 && this.pixelRatio < this.PR_CAP) {
        this.pixelRatio = Math.min(this.PR_CAP, this.pixelRatio + 0.25);
        this.renderer.setPixelRatio(this.pixelRatio);
      }
    }
  }

  _frame() {
    if (this._destroyed) return;
    this._raf = requestAnimationFrame(() => this._frame());
    const dt = Math.min(this._clock.getDelta(), 0.1);
    const t = (this._t = this._clock.elapsedTime);
    const k = 1 - Math.exp(-dt * this.o.damping);
    this.smoothP += (this.targetP - this.smoothP) * k;
    if (Math.abs(this.targetP - this.smoothP) < 0.0004) this.smoothP = this.targetP;
    const { zone } = this._render(this.smoothP, t);
    this._syncChapters(this.smoothP, zone);
    this._syncPerf(dt, t);
  }
}

export default ScrollFilm;
