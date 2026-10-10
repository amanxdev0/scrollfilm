# Show HN — copy-paste draft

**Title:**
Show HN: Scrollfilm – a cinematic scroll-driven WebGL film engine

**URL to submit:**
https://github.com/amanxdev0/scrollfilm

**First comment (post this yourself immediately after submitting):**

Hi HN! I've been building cinematic scroll-driven 3D websites — a voyage from the
Milky Way to Pluto (HELIOS), a descent to Challenger Deep (ABYSS) — and I kept
rebuilding the same engine every time:

- scroll position as a film playhead, with damped interpolation (`1 − e^(−dt·k)`)
  so irregular scroll events render as smooth 40+ fps film
- chapters measured from the real DOM layout, so text and camera can never drift apart
- a film-player HUD (zone label, progress, live FPS meter)
- adaptive resolution that steps down when FPS sags and recovers when it heals
- prefers-reduced-motion and no-WebGL fallbacks

So I extracted it into a library:

```js
new ScrollFilm({
  canvas: '#film',
  stops: [
    { chapter: 0, name: 'Intro', camera: { pos: [0, 20, 80], look: [0, 0, 0] } },
    { chapter: 1, name: 'The Deep', camera: { pos: [0, -40, 60], look: [0, -40, 0] } },
  ],
  onFrame: (p, t, api) => { /* your Three.js scene */ },
});
```

You bring the scene; the library handles scroll, camera, chapters, HUD and quality.
MIT licensed, no build step.

Live sites built with it: https://amanxdev0.github.io/helios/ ·
https://amanxdev0.github.io/abyss/

I'd especially love feedback on the API — does the stops model (chapter index +
fraction + camera pos/look) feel right, or would you design the camera journey
differently? Happy to go deep on the damping math too.

---
*Tips: post on a weekday morning US time for visibility. Reply to every comment
in the first few hours — HN rewards authors who stick around.*
