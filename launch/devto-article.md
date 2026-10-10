# Dev.to — article draft

**Title:** I built 3 cinematic 3D websites, then extracted the engine — meet scrollfilm

**Tags:** javascript, threejs, webgl, opensource

---

I have a problem: I can't stop making websites where scrolling plays a movie.

It started with SCROLLFILM — a WebGL film scrubbed by the scrollbar. Then HELIOS,
a voyage from the Milky Way to Pluto. Then ABYSS, a descent to Challenger Deep.
Three sites, three moods — and three times I rebuilt the exact same machinery:

1. Turn scroll position into a **playhead**.
2. Smooth it, because scroll events fire at ~20Hz and film needs 60fps.
3. Sync HTML chapters to a **flying camera**.
4. Show a little film-player HUD: zone, progress, FPS.

The third time, I stopped and pulled the engine out. That's **scrollfilm** —
an open-source library that does all four, so the next site starts at "draw your
3D scene" instead of "reinvent scrolling."

## The core trick: the damped playhead

Raw scroll position is jittery. The fix is one line, run every frame:

```js
smoothP += (targetP - smoothP) * (1 - Math.exp(-dt * 5.5));
```

Because it's frame-rate independent (`dt`-based), the film feels identical at
30fps and 144Hz. This single line is 80% of the "cinematic" feeling.

## Chapters measured, not guessed

My first version hardcoded chapter timings (`data-from="0.055"`) — and the text
kept vanishing between sections because the guesses never matched the real layout.
The library measures `offsetTop`/`offsetHeight` of your actual chapters and derives
both the text-activation windows and the camera stops from them. Add a chapter;
the whole journey re-syncs. Exactly one chapter is ever active.

## The API

```js
new ScrollFilm({
  canvas: '#film',
  stops: [
    { chapter: 0, name: 'Intro', camera: { pos: [0, 20, 80], look: [0, 0, 0] } },
    { chapter: 1, name: 'The Deep', camera: { pos: [0, -40, 60], look: [0, -40, 0] } },
  ],
  background: [{ p: 0, color: 0x6fc7e3 }, { p: 1, color: 0x000409 }],
  onFrame: (p, t, api) => { /* your Three.js scene */ },
});
```

Stops also carry arbitrary `data` (depth, distance…) and there's `film.setExtra()`
for live HUD tickers, `onZoneChange` for side effects, adaptive pixel-ratio scaling
for weak devices, and `prefers-reduced-motion` / no-WebGL fallbacks baked in.

## Try it

- GitHub: https://github.com/amanxdev0/scrollfilm
- Minimal example (3 chapters, one file): `examples/minimal` in the repo
- Built with it: [HELIOS](https://amanxdev0.github.io/helios/) · [ABYSS](https://amanxdev0.github.io/abyss/)

It's MIT licensed, and PRs are welcome — there's a `CONTRIBUTING.md` with the
ground rules. If you build something with it, open a PR and I'll add it to the
gallery. 🎬
