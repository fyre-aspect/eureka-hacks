# INSTRUCTIONS.md — PhysSketch: 24-Hour Hackathon Battle Plan

> Hour-by-hour build order, exact commands, key decisions, and demo prep. Follow this top-to-bottom; don't skip ahead.

---

## Pre-Hackathon Checklist (do before the clock starts)

- [ ] Each team member has Node.js ≥ 18 installed (`node -v`)
- [ ] Each team member has a free [Google AI Studio](https://aistudio.google.com/) account and has generated an API key
- [ ] Git repo created (this one), everyone cloned it
- [ ] Agree on who owns which hour-blocks below
- [ ] Laptop chargers, snacks, water

---

## Hour 0–1: Scaffold & "Hello World" Running

**Goal:** Next.js app boots, tldraw renders, no red errors in terminal.

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias "@/*"

npm install @tldraw/tldraw matter-js @types/matter-js \
  @google/generative-ai framer-motion zustand
```

### Step 1 — Add `.env.example` and `.env.local`

```bash
echo "GEMINI_API_KEY=your_key_here" > .env.example
cp .env.example .env.local
# Edit .env.local and paste your real key
```

### Step 2 — Create `lib/types.ts`

Copy the full `PhysicsObject`, `PhysicsScene`, `AppMode`, and `AppState` interfaces from `DESIGN.md` section 4.

### Step 3 — Create `store/useAppStore.ts`

Copy from `DESIGN.md` section 5.

### Step 4 — Smoke-test tldraw

In `app/simulate/page.tsx`:

```tsx
'use client';
import dynamic from 'next/dynamic';

const Whiteboard = dynamic(() => import('@/components/Whiteboard'), { ssr: false });

export default function SimulatePage() {
  return (
    <div className="w-screen h-screen bg-slate-900">
      <Whiteboard />
    </div>
  );
}
```

Create `components/Whiteboard.tsx` with just the tldraw `<Tldraw />` wrapper (no ref yet).

```bash
npm run dev
```

Open `http://localhost:3000/simulate` — you should see a blank tldraw canvas. If you do, **Hour 1 is done.**

**Milestone checkpoint:** Draw something on the canvas, take a screenshot, share in team chat.

---

## Hour 1–2: Gemini Integration

**Goal:** API route accepts a base64 image, returns a `PhysicsScene` JSON.

### Step 1 — Create `lib/gemini.ts`

Copy the full `parseSketch()` function from `DESIGN.md` section 6.

### Step 2 — Create `app/api/parse-sketch/route.ts`

Copy from `DESIGN.md` section 7.

### Step 3 — Test the API manually

```bash
# In a separate terminal, while dev server is running:
curl -X POST http://localhost:3000/api/parse-sketch \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"'$(base64 -i /path/to/any/png | tr -d '\n')'"}'
```

You should get back a JSON object with an `objects` array. If you see a 500 error, check `GEMINI_API_KEY` is set.

**Milestone checkpoint:** Gemini returns valid JSON from a test image.

---

## Hour 2–3: Canvas Export + Parse Flow

**Goal:** "Parse Sketch" button captures the tldraw canvas and sends it to Gemini.

### Step 1 — Add the imperative handle to `Whiteboard.tsx`

Upgrade `Whiteboard.tsx` to expose `getImageBase64()` via `forwardRef` + `useImperativeHandle`.
See `DESIGN.md` section 9.1 for the full implementation.

Key snippet — tldraw's image export API:

```typescript
const { blob } = await editor.toImage([...shapeIds], {
  type: 'png',
  background: true,
});
```

### Step 2 — Wire the "Parse Sketch" button

In `app/simulate/page.tsx`:

```tsx
const whiteboardRef = useRef<WhiteboardHandle>(null);
const store = useAppStore();

async function handleParseSketch() {
  try {
    store.setParseStatus('loading');
    const base64 = await whiteboardRef.current!.getImageBase64();
    const res = await fetch('/api/parse-sketch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64 }),
    });
    if (!res.ok) throw new Error(await res.text());
    const scene = await res.json();
    store.setScene(scene);
  } catch (err) {
    store.setParseStatus('error', String(err));
  }
}
```

### Step 3 — Add a temporary debug panel

Below the canvas, render `<pre>{JSON.stringify(scene, null, 2)}</pre>` so you can see what Gemini returns. Remove this later.

**Milestone checkpoint:** Draw a ramp + block on the canvas, click "Parse Sketch," see JSON appear in the debug panel.

---

## Hour 3–5: Matter.js Physics Engine

**Goal:** `SimulationCanvas` renders a live physics simulation from the parsed scene.

### Step 1 — Create `lib/physics.ts`

Copy the full `buildWorld()` and `cleanup()` functions from `DESIGN.md` section 8.

> **Common gotcha:** Matter.js `Render.create()` needs a real DOM canvas element. The canvas must already be in the DOM before calling `buildWorld`. Use `useEffect` with the canvas ref.

### Step 2 — Create `components/SimulationCanvas.tsx`

```tsx
'use client';
import { useEffect, useRef } from 'react';
import { buildWorld, cleanup } from '@/lib/physics';
import type { PhysicsScene } from '@/lib/types';

export default function SimulationCanvas({ scene }: { scene: PhysicsScene }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    buildWorld(scene, canvasRef.current);
    return () => cleanup();
  }, [scene]);

  return (
    <canvas
      ref={canvasRef}
      width={scene.width}
      height={scene.height}
      className="rounded-xl border border-white/10"
    />
  );
}
```

### Step 3 — Build a hard-coded test scene

**Do NOT test with Gemini output yet.** Build a known-good `PhysicsScene` manually:

```typescript
// in app/simulate/page.tsx temporarily
const testScene: PhysicsScene = {
  width: 800,
  height: 600,
  gravity: { x: 0, y: 1 },
  objects: [
    { id: 'floor', role: 'floor', shape: 'rectangle', x: 400, y: 580, width: 800, height: 20, isStatic: true, color: '#374151' },
    { id: 'block', role: 'block', shape: 'rectangle', x: 200, y: 100, width: 60, height: 40, isStatic: false, color: '#6366f1' },
    { id: 'ball',  role: 'ball',  shape: 'circle',    x: 400, y: 100, radius: 30, isStatic: false, color: '#f59e0b', restitution: 0.8 },
  ],
};
```

Render `<SimulationCanvas scene={testScene} />` directly and verify the block and ball fall, hit the floor, and the ball bounces.

### Step 4 — Add a ramp test

Add a static ramp to your test scene:

```typescript
{ id: 'ramp', role: 'ramp', shape: 'rectangle', x: 300, y: 400, width: 200, height: 20, angleDeg: -25, isStatic: true, color: '#10b981' }
```

Verify the block slides down it.

**Milestone checkpoint:** Matter.js simulation runs, objects obey gravity, ramp deflects the block. Take a screenshot.

---

## Hour 5–6: Connect Gemini → Physics (End-to-End)

**Goal:** The full flow works: Draw → Parse → Simulate.

### Step 1 — Swap test scene for store scene

In `app/simulate/page.tsx`, read `store.scene` and pass it to `<SimulationCanvas>`.

### Step 2 — Implement mode switching

```tsx
{store.mode === 'draw' && <Whiteboard ref={whiteboardRef} />}
{store.mode === 'simulating' && store.scene && <SimulationCanvas scene={store.scene} />}
```

### Step 3 — Add "Simulate" button that switches mode

```typescript
function handleSimulate() {
  store.setMode('simulating');
}
```

### Step 4 — Add "Reset" button

```typescript
function handleReset() {
  store.resetAll();
  whiteboardRef.current?.clear();
}
```

### Step 5 — Full end-to-end test

1. Open the whiteboard
2. Draw a ramp and a ball (rough sketch is fine)
3. Click "Parse Sketch" — wait for Gemini
4. Click "Simulate" — physics runs
5. Click "Reset" — back to blank canvas

**Milestone checkpoint:** Full flow works. Demo-able product. Everything after this is polish + samples.

---

## Hour 6–7: Object Panel

**Goal:** Users can see and edit parsed objects before simulating.

### What to build

`components/ObjectPanel.tsx`:

- Renders a list of `PhysicsObject[]` from `store.scene`
- Each row shows: colored dot (using `obj.color`), `obj.label || obj.role`, and a `isStatic` badge ("Fixed" / "Dynamic")
- Clicking a row expands it to show editable fields: `x`, `y`, `friction`, `restitution`
- Delete button (trash icon) removes the object from the scene
- "Add Floor" button if no floor exists

Keep editing simple: controlled `<input type="number">` elements. On change, update `store.scene` via:

```typescript
const updated = { ...scene, objects: scene.objects.map(o => o.id === id ? { ...o, [field]: value } : o) };
store.setScene(updated);
```

**Do NOT over-engineer.** The panel is a quality-of-life feature, not the core product. Timebox to 60 minutes max.

---

## Hour 7–8: Sample Scenes

**Goal:** "Load Sample" modal works with 4 pre-built scenes.

### Create `lib/samples.ts`

Define the four `PhysicsScene` objects described in `DESIGN.md` section 12.

**Tips for Newton's Cradle:** Set the leftmost bob's initial position using `Matter.Body.setPosition()` right after building the world, before the runner starts. Give it a displacement of `{ x: initialX - 80, y: initialY - 60 }` to create a swing.

### Create `components/LoadSampleModal.tsx`

Simple modal:
- Backdrop: `fixed inset-0 bg-black/60 z-50`
- Card: centered, `bg-slate-800 rounded-2xl p-6 w-96`
- 4 buttons, one per sample, each calls `store.setScene(sample)` and switches to `parsed` mode

### Wire "Load Sample" button in `Toolbar.tsx`

Clicking it sets local state `showSampleModal = true`.

**Milestone checkpoint:** All 4 samples load and simulate correctly. Newton's Cradle swings. Take a video.

---

## Hour 8–10: UI Polish Pass

**Goal:** App looks hackathon-winner quality. These details matter for judges.

### Priority order:

1. **Landing page** (`app/page.tsx`) — hero text, 3 feature cards, CTA button. Use `framer-motion` for stagger entrance.

2. **Parse loading state** — full-canvas overlay with steps:
   ```
   ⣾ Reading sketch...
   ⣾ Identifying objects...  (after 600ms)
   ⣾ Building scene...      (after 1200ms)
   ✓ Done!                   (on success)
   ```
   Use `setTimeout` to fake the step progression while the real async call runs.

3. **Toolbar design** — make it look good. Dark pill background, icon + text buttons, `active` state for mode toggle.

4. **Error toast** — `fixed bottom-6 right-6 z-50` with slide-in animation. Auto-dismiss after 4 seconds.

5. **SimulationCanvas border animation** — when simulation starts, animate a glowing indigo border:
   ```css
   animation: pulse-border 2s ease-in-out infinite;
   ```

6. **Keyboard shortcuts:**
   - `Cmd/Ctrl+Enter` → Parse Sketch
   - `Space` → Start/Pause simulation
   - `Escape` → Reset

### What NOT to polish:

- Don't touch tldraw's internal UI
- Don't add animations to the physics canvas itself (Matter.js owns it)
- Don't rebuild the layout — it's good enough from earlier

---

## Hour 10–12: Edge Cases & Hardening

**Goal:** App doesn't crash in front of judges.

### Checklist:

- [ ] Empty canvas: "Parse Sketch" button disabled, tooltip "Draw something first" (check `editor.getCurrentPageShapeIds().size === 0`)
- [ ] Gemini returns 0 objects: show "Couldn't detect objects. Try drawing more clearly or use a sample."
- [ ] `buildWorld` throws (bad vertices from polygon): wrap in try/catch, catch shows error toast, stays in `parsed` mode
- [ ] Rapid "Parse Sketch" clicks: debounce at 2 seconds, disable button while loading
- [ ] API key missing at runtime: check `process.env.GEMINI_API_KEY` in route handler, return 500 with clear message; display banner in UI
- [ ] `cleanup()` called before `buildWorld` on every simulate: verify no Matter.js memory leaks by pressing Simulate → Reset → Simulate 10 times rapidly

---

## Hour 12–14: Deploy to Vercel

**Goal:** Live URL that judges can visit on their phones.

```bash
# 1. Push everything to GitHub
git add .
git commit -m "feat: working PhysSketch MVP"
git push

# 2. Deploy
npx vercel --prod
# Follow prompts, link to your GitHub repo

# 3. Add environment variable
# Vercel dashboard → Project → Settings → Environment Variables
# Name: GEMINI_API_KEY
# Value: your key
# Environment: Production + Preview

# 4. Redeploy
npx vercel --prod
```

### Verify on Vercel:

- [ ] Landing page loads
- [ ] tldraw canvas works
- [ ] Parse Sketch sends request (check Vercel function logs)
- [ ] Simulation runs

**Keep the Vercel URL open in a tab for the demo.**

---

## Hour 14–20: Buffer / Stretch Features

If you're ahead of schedule, tackle these in order:

### Stretch 1 — Better object detection prompt (30 min)

Test 10 different sketch types and look for failure patterns. Tweak the system prompt to handle the most common failures (e.g., ramps parsed as blocks, multiple balls merged into one).

### Stretch 2 — Initial velocity editor (45 min)

Add `velocityX` and `velocityY` fields to `PhysicsObject`. In `physics.ts`, call `Matter.Body.setVelocity(body, { x, y })` after adding it to the world. Expose these in the Object Panel with a direction arrow widget.

### Stretch 3 — Gravity control (20 min)

Add a gravity slider in the Toolbar: `0g → Earth (1g) → Moon (0.17g) → Mars (0.38g) → Jupiter (2.5g)`. Map to the `scene.gravity.y` value. Rebuilds the simulation on change.

### Stretch 4 — Replay mode (60 min)

Record Matter.js body positions every frame into a `frames[]` array (up to 10 seconds). Add a "Replay" button that plays back the recorded frames using `requestAnimationFrame` on the canvas. Adds a "wow, look at it again" moment for demos.

### Stretch 5 — Share link (90 min)

Encode the `PhysicsScene` as base64 in the URL hash: `physsketch.vercel.app/#eyJvYmplY3RzIjpb...`. On page load, decode and auto-simulate. Lets judges scan a QR code and see the scene run on their phone.

---

## Hour 20–22: Demo Rehearsal

Run through the judge demo at least 3 times:

### Demo Script (4 minutes)

**0:00 — Hook**
"Every physics simulation you've ever seen online was hand-built. We built the one that builds itself."

**0:20 — Draw**
Draw a ramp on the left side of the canvas, a block at the top, and a pile of balls at the bottom right. Talk while drawing: "I'm just sketching this — no coordinates, no settings."

**1:00 — Parse**
Hit "Parse Sketch." While it loads: "We're sending this to a vision AI. Not to ask it questions — just to read the scene, like an OCR for physics."
When the panel appears: "It found the ramp — static, 30 degrees. It found the block. It found the balls."

**1:45 — Simulate**
Hit "Simulate." Block slides, hits balls.
"That's Matter.js. Real physics. Not a pre-built animation — this came from my sketch."

**2:15 — Sample**
Load Newton's Cradle.
"And we've baked in some demo scenes. But here's the thing — you could have drawn this and parsed it too."

**2:45 — Pitch**
"PhET has 150 simulations, each hand-coded. We have infinite. You draw it, we run it. That's the gap."

**3:00 — Q&A buffer**

### Demo tips:

- Draw on a trackpad, not a mouse — smoother lines look more impressive.
- Pre-warm the API: run one Parse Sketch before your demo so the cold start is absorbed.
- If Gemini mis-parses, use the Object Panel to fix it on stage — "See, you can correct it manually too. Total control."
- Have the Newton's Cradle sample ready as backup if live parsing fails.
- Use full-screen mode (F11 or browser kiosk mode) during the demo.

---

## Hour 22–24: Last Touches

- [ ] Remove all `console.log` debugging statements
- [ ] Remove the `<pre>` JSON debug panel
- [ ] Double-check `.env.local` is in `.gitignore`
- [ ] Update README with the live Vercel URL
- [ ] Make sure all 4 sample scenes work on the deployed URL
- [ ] Take a demo screenshot for the DevPost submission
- [ ] Record a 2-minute Loom of the full demo flow (DevPost often asks for video)
- [ ] Write DevPost description (use the PITCH section below)
- [ ] Final `git push`

---

## DevPost Submission Template

**Project name:** PhysSketch

**Tagline:** Draw a physics scenario. Watch it come alive.

**About the project:**
PhysSketch is a whiteboard web app that brings physics to life from rough sketches. Draw any classical mechanics scenario — a ramp, pendulum, collision, spring system — on the canvas, hit "Parse Sketch," and a vision AI identifies every object. Hit "Simulate," and a real physics engine animates your drawing in real time.

The AI doesn't explain physics — it reads your sketch and hands it off to the physics engine. The product is the simulation, not the chatbot.

**What it does:**
1. Freeform drawing on a digital whiteboard (tldraw)
2. AI vision parsing (Gemini 2.5 Flash) converts the sketch to structured physics objects
3. Manual correction via an Object Panel before simulating
4. Real-time 2D physics simulation (Matter.js)
5. Built-in sample scenes: ramp, billiards, pendulum, Newton's Cradle

**How we built it:**
Next.js 14 + TypeScript, tldraw for the canvas, Gemini 2.5 Flash for sketch-to-JSON parsing, Matter.js for physics, Tailwind CSS, Zustand for state, deployed on Vercel.

**Challenges:**
Sketch parsing accuracy — a rough drawing is ambiguous. We solved this with a constrained JSON schema response from Gemini and an Object Panel for manual corrections.

**What's next:**
Velocity editor, gravity control, shareable scene URLs, more physics domains (circuits, optics).

---

## Pivot Criteria

If something isn't working with 8+ hours left, switch strategy:

| Problem | Pivot |
|---|---|
| Gemini parsing is too inaccurate for live demo | Fall back to manual scene builder UI only; remove Parse Sketch from demo |
| Matter.js simulation crashes on parsed output | Pre-validate Gemini output; clamp all values to safe ranges before building world |
| tldraw canvas export breaks | Use `html2canvas` on the canvas container div instead |
| Vercel deploy fails | Demo locally on your laptop using `npm start` |
| Out of Gemini free credits | Switch to Gemini via OpenRouter (has free fallback models) or hardcode samples-only mode |

---

## Key API References

- **Gemini 2.5 Flash**: [ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs) — use `gemini-2.5-flash` model name
- **tldraw image export**: `editor.toImage(shapeIds, { type: 'png' })` → returns `{ blob: Blob }`
- **tldraw React**: `<Tldraw onMount={(editor) => ...} />` — editor is available immediately after mount
- **Matter.js quickstart**: `Engine.create()` → `Bodies.rectangle()` → `Composite.add()` → `Render.create()` → `Runner.run()`
- **Matter.js Constraint**: `Constraint.create({ bodyA, bodyB, length, stiffness })` for pendulums
- **Zustand**: `create<State>()(set => ({ ... }))` — no Provider needed in Next.js App Router

---

## Emergency Contacts

- Google AI Studio free tier limits: [aistudio.google.com/limits](https://aistudio.google.com/limits)
- tldraw docs: [tldraw.dev/docs](https://tldraw.dev/docs)
- Matter.js docs: [brm.io/matter-js/docs](https://brm.io/matter-js/docs)
- Next.js App Router: [nextjs.org/docs/app](https://nextjs.org/docs/app)
