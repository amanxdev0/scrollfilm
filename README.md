<div align="center">

# 🎬 scrollfilm

**A cinematic scroll-driven WebGL film engine.**

Real HTML chapters floating over a live Three.js scene. Scroll is the playhead —
a damped interpolation loop turns janky scroll input into buttery 40+ fps film.

[![npm version](https://img.shields.io/npm/v/scrollfilm?style=flat-square)](https://www.npmjs.com/package/scrollfilm)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![three.js](https://img.shields.io/badge/three.js-%5E0.160.0-black?style=flat-square)](https://threejs.org/)

[Live demo](https://amanxdev0.github.io/helios/) · [Report a bug](https://github.com/amanxdev0/scrollfilm/issues) · [Contribute](CONTRIBUTING.md)

</div>

---

## 30-second start

```html
<canvas id="film"></canvas>

<section class="chapter"><div class="chapter-inner"><h1>Intro</h1></div></section>
<section class="chapter"><div class="chapter-inner"><h1>The Deep</h1></div></section>

<script type="importmap">
{ "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "scrollfilm": "https://cdn.jsdelivr.net/npm/scrollfilm/+esm"
} }
</script>
<script type="module">
import { ScrollFilm } from 'scrollfilm';

const film = new ScrollFilm({
  canvas: '#film',
  stops: [
    { chapter: 0, name: 'Intro', camera: { pos: [0, 20, 80], look: [0, 0, 0] } },
    { chapter: 1, name: 'The Deep', camera: { pos: [0, -40, 60], look: [0, -40, 0] } },
  ],
  background: [
    { p: 0, color: 0x6fc7e3 },
    { p: 1, color: 0x000409 },
  ],
  onFrame: (p, t, api) => {
    // draw your Three.js scene here with api.scene / api.camera
  },
});
</script>
```

Add one CSS rule and chapters fade in as they activate:

```css
.chapter-inner { opacity: 0; transition: opacity .7s ease; }
.chapter.is-active .chapter-inner { opacity: 1; }
```

That's the whole mental model: **chapters are real HTML, the camera flies between stops, your `onFrame` draws the world.**

## Install

```bash
npm install scrollfilm
```

```js
import { ScrollFilm } from 'scrollfilm';
```

Or straight from a CDN with an import map (no build step) — see above.

## API

### `new ScrollFilm(options)`

| Option | Type | Default | What it does |
|---|---|---|---|
| `canvas` | string \| element | — | **Required.** The fixed WebGL canvas. |
| `chapterSelector` | string | `'.chapter'` | Sections that become chapters. |
| `stops` | array | `[]` | The camera journey (see below). |
| `hud` | boolean \| object | `true` | Film-player HUD. `true` wires `#hudZone #hudExtra #hudBar #hudKnob #hudFps`; pass `{ zone: '#myZone', … }` for custom hooks; `false` disables. |
| `background` | array | — | `[{ p, color }]` gradient keys the scene background fades through. |
| `fog` | object | — | `{ near:[a,b], far:[a,b], range:[p0,p1] }` — fog distances interpolated across the range. |
| `damping` | number | `5.5` | Playhead follow speed. Higher = snappier, lower = dreamier. |
| `maxPixelRatio` | number | `2` (`1.75` on touch) | Render resolution cap. |
| `minFps` | number | `34` | Below this, resolution steps down automatically — then recovers. |
| `onFrame(p, t, api)` | function | — | Your scene code, every frame. `api` = `{ film, THREE, helpers, scene, camera, renderer, p, t }`. |
| `onZoneChange(name, data)` | function | — | Fires when the HUD zone label changes. |

### Stops

Each stop pins the camera to a point in a chapter:

```js
{
  chapter: 1,        // index into your chapter sections (DOM order)
  at: 0.5,           // where inside the chapter (0 = top, 1 = bottom)
  name: 'The Deep',  // HUD zone label
  camera: { pos: [x, y, z], look: [x, y, z] },
  data: { depth: 2400 },  // anything — handed to onZoneChange
}
```

Stop positions are **measured from your real page layout**, so text and camera can never drift apart — add a chapter and everything re-syncs. Put two stops in one chapter for a push-in shot.

### Instance methods

| Method | What it does |
|---|---|
| `film.setExtra(text)` | Update the HUD extra readout (depth ticker, distance, …). |
| `film.scrollToChapter(i)` | Smooth-scroll to a chapter. |
| `film.measureChapters()` | Re-measure layout (call after DOM changes). |
| `film.getState()` | `{ p, t, zone }` — playhead, clock, active zone. |
| `film.destroy()` | Stop the loop, remove listeners. |

### Helpers

Also exported for your scene code: `clamp01`, `lerp`, `sstep`, `env(p, a, b, c, d)`, `rnd(a, b)`.
`env` is the workhorse — fade anything in/out across scroll ranges:
`material.opacity = env(p, 0.2, 0.3, 0.6, 0.7)`.

### Built-in behavior

- **Damped playhead** — `1 − e^(−dt·k)` interpolation: irregular scroll events → smooth film.
- **Adaptive quality** — pixel ratio drops when FPS sags, recovers when it heals.
- **`prefers-reduced-motion`** — renders one static frame per scroll position.
- **No WebGL** — adds `body.no-webgl`, reveals `#nogl`, activates all chapters. Your words survive.

## Examples

- [`examples/minimal`](examples/minimal/) — three chapters, one glowing scene. Start here.

## Built with scrollfilm

- [HELIOS](https://amanxdev0.github.io/helios/) — a 3D voyage from the Milky Way to Pluto
- [ABYSS](https://amanxdev0.github.io/abyss/) — a descent to Challenger Deep
- [SCROLLFILM](https://amanxdev0.github.io/scrollfilm-3d/) — the original cinematic engine demo

*Made something? Open a PR and add it to this list.*

## Contributing

Ideas, bug reports and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT © Aman Singh
