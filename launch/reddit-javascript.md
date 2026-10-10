# r/javascript — copy-paste draft

**Title:**
[Showoff] scrollfilm — a scroll-driven WebGL film engine (damped playhead, DOM-measured chapters)

**Body:**

I kept rebuilding the same scroll engine for cinematic 3D sites, so I extracted it:

```js
import { ScrollFilm, env } from 'scrollfilm';

const film = new ScrollFilm({
  canvas: '#film',
  stops: [
    { chapter: 0, at: 0.5, name: 'Intro',
      camera: { pos: [0, 20, 80], look: [0, 0, 0] } },
    { chapter: 1, at: 0.3, name: 'Deep',
      camera: { pos: [0, -40, 60], look: [0, -40, 0] },
      data: { depth: 2400 } },
  ],
  background: [{ p: 0, color: 0x6fc7e3 }, { p: 1, color: 0x000409 }],
  fog: { near: [260, 50], far: [1000, 260], range: [0.1, 0.5] },
  onFrame: (p, t, api) => {
    // fade anything across scroll ranges with the env() helper
    myMaterial.opacity = env(p, 0.2, 0.3, 0.6, 0.7);
    film.setExtra(`${Math.round(depth).toLocaleString()} m`);
  },
  onZoneChange: (name, data) => console.log('entered', name, data),
});
```

The interesting bits:

- **Damped playhead**: `smoothP += (targetP - smoothP) * (1 - Math.exp(-dt * 5.5))` —
  frame-rate independent, so 20Hz scroll events still render 60fps film.
- **DOM-measured chapters**: stop positions are computed from `offsetTop`, so adding
  a chapter re-syncs the whole camera journey automatically. Two stops in one chapter
  = a push-in shot.
- **Adaptive quality**: pixel ratio steps down under 34fps, recovers above 57.

Single-file source (~450 lines), no build step, MIT:
https://github.com/amanxdev0/scrollfilm

Demos: https://amanxdev0.github.io/helios/ · https://amanxdev0.github.io/abyss/

Genuinely curious: how would you design the camera-journey API? Stops bound to
chapters felt right, but I'm not married to it.
