# Gesture Bloom

Shape thousands of glowing particles with your bare hands, right in the browser.
Webcam hand tracking (MediaPipe) drives shape, size and rotation of a GPU-animated particle cloud.
No camera? Watch the demo, or use touch and mouse.

**Live:** _add your deploy URL here_

![Gesture Bloom demo](docs/demo.gif)

## Features

- **Hand control.** Open and close your hand to grow and shrink the cloud. Move it to rotate, repel and swirl particles.
- **Gesture story.** Each sign (peace, call me, rock, pointing, thumbs up…) moves the story forward, with a ring and screen-reader announcement when a gesture is recognised.
- **Make your own.** Type a word or drop an image: the particles reform into it, and images keep their colors.
- **Record and share.** One tap for a PNG, or a 10-second clip (with music if playing). Phones open the share sheet.
- **Demo mode.** A virtual hand plays the whole experience without a camera.
- **Installable and offline.** PWA with a service worker. MediaPipe is self-hosted, so nothing loads from a CDN.
- **Accessible.** Keyboard control (Space to advance, Esc to leave a custom shape), `prefers-reduced-motion` support, live region for gestures.

## Run locally

```sh
npm install
npm run dev        # http://localhost:8080
```

The camera works only on `localhost` or HTTPS.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests (Vitest) for gesture detection |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript checks |

`dev` and `build` first copy the MediaPipe runtime from `node_modules` into `public/mediapipe` (`scripts/copy-mediapipe.mjs`).

## Gestures

| Gesture | Effect |
| --- | --- |
| Open hand / fist | Expand / contract |
| 👌 OK | Start the story |
| ✌️ Peace, 🤙 Call me, 🤘 Rock, ☝️ Pointing, 🖕, 👍 | Next chapter |
| Move hand | Rotate, repel and swirl |

## Deploy

Both configs are included. Pick one:

- **Vercel:** import the repo; `vercel.json` sets caching and the camera permission policy.
- **Netlify:** import the repo; `netlify.toml` does the same.

Then put the URL at the top of this README. To make the GIF, start Demo mode, press the record button, and convert the clip:

```sh
ffmpeg -i gesture-bloom.webm -vf "fps=15,scale=640:-1:flags=lanczos" -loop 0 docs/demo.gif
```

## How it stays light

- All particle motion, transitions and colors run in a vertex shader. JavaScript updates a few uniforms per frame (~1 ms).
- Hand landmarks reach the renderer through a ref, so React re-renders only when the gesture changes.
- Particle count adapts: 18k desktop, 5–7k phones. Resolution drops by itself on slow devices.
- Hand tracking loads only after you choose the camera. Phones use the lite model at ~24 fps. It pauses when the tab is hidden.

## Stack

Vite, React, TypeScript, Three.js (custom shaders), MediaPipe Hands, Tailwind CSS, Vitest.
