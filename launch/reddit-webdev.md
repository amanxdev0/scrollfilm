# r/webdev — copy-paste draft

**Title:**
I extracted the scroll engine from my cinematic 3D sites into an open-source library

**Body:**

Over the last few weeks I built three scroll-driven 3D websites — a solar-system
voyage, an ocean descent to Challenger Deep — and every single one needed the same
machinery: turning scroll position into a film playhead, smoothing it with damped
interpolation, syncing HTML chapters to a flying camera, and a little film-player HUD.

So I pulled the engine out into its own library: **scrollfilm**.

What you write:

```js
new ScrollFilm({
  canvas: '#film',
  stops: [
    { chapter: 0, name: 'Intro', camera: { pos: [0, 20, 80], look: [0, 0, 0] } },
    { chapter: 1, name: 'Deep',  camera: { pos: [0, -40, 60], look: [0, -40, 0] } },
  ],
  onFrame: (p, t, api) => { /* your three.js scene */ },
});
```

What you get: buttery scroll-to-film rendering, chapters that can never desync from
the camera (stop positions are measured from your real page layout), zone /
progress / FPS HUD, adaptive resolution, reduced-motion and no-WebGL fallbacks.

GitHub: https://github.com/amanxdev0/scrollfilm
Built with it: https://amanxdev0.github.io/helios/ · https://amanxdev0.github.io/abyss/

Roast my API — what would you change?

---
*Tips: check the subreddit rules first — r/webdev runs a "Showoff Saturday" thread
for self-promotion; post there if the rules require it. Best time: Saturday morning US.*
