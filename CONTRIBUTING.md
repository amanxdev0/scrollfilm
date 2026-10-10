# Contributing to scrollfilm

Thanks for wanting to make the film better. 🎬

## Quick start

1. **Fork** the repo and clone your fork.
2. Create a branch: `git checkout -b feature/my-idea`
3. Serve the minimal example to test your change:
   ```bash
   cd examples/minimal
   python3 -m http.server 8000
   # open http://localhost:8000/
   ```
4. Push and open a **pull request** against `main`.

## What makes a good PR

- **One idea per PR.** Small, focused changes merge fastest.
- **Keep the runtime lean.** This library runs every frame — avoid allocations in hot paths.
- **Match the existing style.** Plain ES modules, JSDoc on public API, no build step.
- **Test on mobile.** Check the minimal example on a phone-sized viewport and with
  `prefers-reduced-motion` enabled.

## Reporting issues

Open an issue with:
- What you expected vs. what happened
- Browser + OS + device
- A minimal reproduction (a few lines or a link)

## Ideas welcome

Feature requests are issues too — describe the shot you want to achieve
("I want the camera to orbit while the chapter fades") and we'll figure out
the API together.

By contributing you agree your work is released under the MIT license.
