# ⚡ PhysSketch — Draw It. Watch It Move.

> A real-time physics whiteboard where you sketch any scenario and watch it come alive — no pre-built simulations, just your drawing and a physics engine.

---

## What Is This?

**PhysSketch** is a web app built for EUReka Hacks 2026. You draw a physics scene on a canvas — a ramp with a block, a swinging pendulum, a spring, colliding balls — hit **"Simulate"**, and the app:

1. Sends your sketch to **Gemini 2.5 Flash** (vision API) which parses it into structured physics objects (JSON).
2. Loads those objects into **Matter.js**, a 2-D physics engine.
3. Plays back the simulation right on screen, in real time.

The AI is invisible plumbing. The product is your drawing coming alive.

---

## Live Demo

> Deployed on Vercel → **[physsketch.vercel.app](https://physsketch.vercel.app)** *(link active after deployment)*

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) + TypeScript |
| Canvas | [tldraw](https://tldraw.dev/) v2 (free for hackathon use) |
| Physics Engine | [Matter.js](https://brm.io/matter-js/) |
| AI Vision | [Gemini 2.5 Flash](https://ai.google.dev/) via `@google/generative-ai` |
| Styling | [Tailwind CSS](https://tailwindcss.com/) v3 |
| Deployment | [Vercel](https://vercel.com/) |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A free [Google AI Studio](https://aistudio.google.com/) API key

### 1 — Clone & install

```bash
git clone https://github.com/Fyre-Aspect/Eureka-Hacks.git
cd Eureka-Hacks
npm install
```

### 2 — Set environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```
GEMINI_API_KEY=your_google_ai_studio_key_here
```

Getting a free key: [aistudio.google.com](https://aistudio.google.com/) → "Get API key" → free tier gives ~1 500 requests/day on Flash.

### 3 — Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4 — Build for production

```bash
npm run build
npm start
```

---

## Folder Structure

```
├── app/
│   ├── layout.tsx          # Root layout + fonts
│   ├── page.tsx            # Landing / home page
│   ├── simulate/
│   │   └── page.tsx        # Main whiteboard + simulation view
│   └── api/
│       └── parse-sketch/
│           └── route.ts    # POST endpoint → Gemini vision call
├── components/
│   ├── Whiteboard.tsx      # tldraw canvas wrapper
│   ├── SimulationCanvas.tsx# Matter.js renderer (HTML5 Canvas)
│   ├── ObjectPanel.tsx     # Editable parsed-objects sidebar
│   └── Toolbar.tsx         # Mode toggle, simulate button, clear
├── lib/
│   ├── gemini.ts           # Gemini API client + prompt
│   ├── physics.ts          # Matter.js world builder from JSON
│   └── types.ts            # Shared TypeScript interfaces
├── public/
│   └── demo-samples/       # Pre-processed sample scenes for demo
├── DESIGN.md               # Full design spec (also a Claude build prompt)
├── INSTRUCTIONS.md         # Hour-by-hour hackathon build plan
└── .env.example
```

---

## How to Use

1. **Draw** your physics scene on the whiteboard — rough sketches work fine.
2. Click **"Parse Sketch"** — the app screenshots the canvas, sends it to Gemini, and shows you the detected objects in the sidebar.
3. **Adjust** any mis-detected objects directly in the Object Panel (drag, resize, change type).
4. Click **"Simulate"** — the physics engine takes over. Watch it run.
5. Hit **"Reset"** to go back to the whiteboard and iterate.

---

## Demo Scenes (built-in samples)

Hit the **"Load Sample"** button to instantly load a pre-verified scene:

- 🏔️ **Ramp + Block** — inclined plane with adjustable friction
- 🔵 **Billiard Balls** — elastic collision of 3 circles
- 🌀 **Pendulum** — single pendulum with adjustable length
- 🌸 **Newton's Cradle** — 5-ball momentum transfer

---

## Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio key (free tier) |

---

## Team

Built at **EUReka Hacks 2026** in 24 hours.

Inspired by logic from [FlowBoard-AI](https://github.com/Fyre-Aspect/FlowBoard-AI).

---

## License

MIT