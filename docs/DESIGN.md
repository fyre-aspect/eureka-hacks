# DESIGN.md — PhysSketch: Physics Whiteboard Simulator

> **Usage:** This document is the canonical design spec and Claude build prompt for the PhysSketch web app. Feed the full contents of this file to Claude Code / Cursor / any AI coding assistant to bootstrap the project from scratch.

---

## 0. Project Summary

**PhysSketch** is a Next.js 14 + TypeScript web app that lets users sketch physics scenarios on a freeform canvas, then simulates them in real-time using a 2-D physics engine. A vision AI (Gemini 2.5 Flash) acts as a silent bridge between the drawing and the simulation — it reads the sketch and produces structured JSON that the physics engine consumes. The AI is never visible to the user as a chatbot; it is pure parsing infrastructure.

**Core user flow:**
```
Draw on canvas → [Parse Sketch button] → Gemini reads image → returns JSON objects
→ User can tweak object panel → [Simulate button] → Matter.js animates it live
→ [Reset button] → back to whiteboard
```

---

## 1. Tech Stack (exact versions)

```json
{
  "next": "14.2.x",
  "react": "18.x",
  "typescript": "5.x",
  "@tldraw/tldraw": "2.x",
  "matter-js": "0.19.x",
  "@types/matter-js": "0.19.x",
  "@google/generative-ai": "0.21.x",
  "tailwindcss": "3.x",
  "framer-motion": "11.x",
  "zustand": "4.x"
}
```

**Do NOT use:**
- App Router server components for anything that imports browser-only libraries (tldraw, matter-js). Use `"use client"` at the top of every component that touches these.
- `pages/` router — use `app/` directory throughout.

---

## 2. Project Scaffolding

```bash
npx create-next-app@latest physsketch \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias "@/*"

cd physsketch
npm install @tldraw/tldraw matter-js @types/matter-js \
  @google/generative-ai framer-motion zustand
```

---

## 3. File & Folder Structure

```
app/
  layout.tsx               # Root layout: Inter font, dark bg, global styles
  page.tsx                 # Landing page: hero, "Open Whiteboard" CTA
  simulate/
    page.tsx               # Main whiteboard + simulation page (client component shell)
  api/
    parse-sketch/
      route.ts             # POST /api/parse-sketch  — Gemini call lives here

components/
  Whiteboard.tsx           # tldraw canvas, exposes getSnapshot() via ref
  SimulationCanvas.tsx     # Matter.js renderer on a <canvas> element
  ObjectPanel.tsx          # Sidebar: list of parsed PhysicsObject[] with edit controls
  Toolbar.tsx              # Top bar: mode toggle (Draw / Simulate), action buttons
  LoadSampleModal.tsx      # Modal with 4 pre-built demo scenes

lib/
  gemini.ts                # buildPrompt(), callGemini(imageBase64): PhysicsScene
  physics.ts               # buildWorld(scene): Matter.World, runSimulation(), cleanup()
  types.ts                 # All shared TypeScript types (canonical source)
  samples.ts               # 4 hardcoded PhysicsScene objects for demos

store/
  useAppStore.ts           # Zustand store: mode, scene, objects, status

public/
  og-image.png             # Open Graph image for social sharing
  favicon.ico

.env.example               # GEMINI_API_KEY=
.env.local                 # gitignored, real key goes here
```

---

## 4. TypeScript Types (`lib/types.ts`)

```typescript
// The canonical physics object representation returned by Gemini and consumed by Matter.js

export type ObjectShape = 'rectangle' | 'circle' | 'polygon';
export type ObjectRole  = 'block' | 'ramp' | 'ball' | 'pendulum' | 'wall' | 'floor' | 'spring' | 'pivot';

export interface PhysicsObject {
  id: string;                // uuid
  role: ObjectRole;
  shape: ObjectShape;
  label?: string;            // human-readable, e.g. "block A"

  // Position & dimensions in simulation px (800 × 600 coordinate space)
  x: number;
  y: number;
  width?: number;            // for rectangles
  height?: number;
  radius?: number;           // for circles
  vertices?: { x: number; y: number }[];  // for polygons / ramps

  angleDeg?: number;         // rotation in degrees (default 0)
  isStatic?: boolean;        // true = immovable (walls, ramps, floor)
  restitution?: number;      // bounciness 0–1 (default 0.3)
  friction?: number;         // 0–1 (default 0.5)
  frictionAir?: number;      // air resistance 0–1 (default 0.01)
  color?: string;            // hex color for rendering

  // Spring / joint metadata (optional)
  attachedTo?: string;       // id of the object this pendulum/spring hangs from
  restLength?: number;       // spring rest length in px
  stiffness?: number;        // spring stiffness 0–1
}

export interface PhysicsScene {
  objects: PhysicsObject[];
  gravity?: { x: number; y: number };  // default { x: 0, y: 1 }
  width: number;    // simulation width, always 800
  height: number;   // simulation height, always 600
  notes?: string;   // Gemini's plain-English description of what it parsed
}

export type AppMode = 'draw' | 'parsed' | 'simulating';

export interface AppState {
  mode: AppMode;
  scene: PhysicsScene | null;
  parseStatus: 'idle' | 'loading' | 'success' | 'error';
  parseError: string | null;
  setMode: (mode: AppMode) => void;
  setScene: (scene: PhysicsScene) => void;
  setParseStatus: (s: AppState['parseStatus'], error?: string) => void;
  resetAll: () => void;
}
```

---

## 5. Zustand Store (`store/useAppStore.ts`)

```typescript
'use client';
import { create } from 'zustand';
import { AppState, AppMode, PhysicsScene } from '@/lib/types';

export const useAppStore = create<AppState>((set) => ({
  mode: 'draw',
  scene: null,
  parseStatus: 'idle',
  parseError: null,

  setMode: (mode) => set({ mode }),
  setScene: (scene) => set({ scene, mode: 'parsed', parseStatus: 'success' }),
  setParseStatus: (parseStatus, parseError = null) => set({ parseStatus, parseError }),
  resetAll: () => set({ mode: 'draw', scene: null, parseStatus: 'idle', parseError: null }),
}));
```

---

## 6. Gemini Integration (`lib/gemini.ts`)

### Prompt Engineering

The prompt must be deterministic, constrained, and JSON-only. Gemini 2.5 Flash handles vision + structured output well.

```typescript
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `
You are a physics scene parser. The user has drawn a rough sketch of a physics scenario on a whiteboard.
Your job is to identify every physical object in the sketch and return a JSON object that conforms exactly
to the PhysicsScene schema below.

Rules:
- Map the entire sketch into an 800×600 coordinate space (origin top-left).
- Every scene MUST have at least one floor (isStatic: true, role: "floor") at y=560 spanning the full width.
- Infer missing properties from context: a ramp is a static rectangle rotated at an angle; a pendulum ball hangs from a pivot.
- Be generous in detection — prefer false-positives over missing objects.
- If you see a circle, it is a "ball". If you see a tilted rectangle, it is a "ramp". A rectangle at the bottom is the "floor".
- Use the color field to assign visually distinct hex colors to each object.
- The notes field should be one plain-English sentence describing what the scene depicts.
- Return ONLY the JSON object. No markdown fences, no explanation text.
`;

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    objects: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id:          { type: SchemaType.STRING },
          role:        { type: SchemaType.STRING },
          shape:       { type: SchemaType.STRING },
          label:       { type: SchemaType.STRING },
          x:           { type: SchemaType.NUMBER },
          y:           { type: SchemaType.NUMBER },
          width:       { type: SchemaType.NUMBER },
          height:      { type: SchemaType.NUMBER },
          radius:      { type: SchemaType.NUMBER },
          angleDeg:    { type: SchemaType.NUMBER },
          isStatic:    { type: SchemaType.BOOLEAN },
          restitution: { type: SchemaType.NUMBER },
          friction:    { type: SchemaType.NUMBER },
          frictionAir: { type: SchemaType.NUMBER },
          color:       { type: SchemaType.STRING },
          attachedTo:  { type: SchemaType.STRING },
          restLength:  { type: SchemaType.NUMBER },
          stiffness:   { type: SchemaType.NUMBER },
        },
        required: ['id', 'role', 'shape', 'x', 'y'],
      },
    },
    gravity: {
      type: SchemaType.OBJECT,
      properties: {
        x: { type: SchemaType.NUMBER },
        y: { type: SchemaType.NUMBER },
      },
    },
    width:  { type: SchemaType.NUMBER },
    height: { type: SchemaType.NUMBER },
    notes:  { type: SchemaType.STRING },
  },
  required: ['objects', 'width', 'height'],
};

export async function parseSketch(imageBase64: string): Promise<import('./types').PhysicsScene> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent([
    { inlineData: { mimeType: 'image/png', data: imageBase64 } },
    'Parse this physics sketch.',
  ]);

  const raw = result.response.text();
  const scene = JSON.parse(raw) as import('./types').PhysicsScene;

  // Ensure defaults
  scene.width  = 800;
  scene.height = 600;
  scene.gravity ??= { x: 0, y: 1 };

  // Guarantee a floor exists
  const hasFloor = scene.objects.some(o => o.role === 'floor');
  if (!hasFloor) {
    scene.objects.push({
      id: 'auto-floor',
      role: 'floor',
      shape: 'rectangle',
      label: 'floor',
      x: 400, y: 570,
      width: 800, height: 20,
      isStatic: true,
      color: '#374151',
    });
  }

  return scene;
}
```

---

## 7. API Route (`app/api/parse-sketch/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { parseSketch } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });
    }
    const scene = await parseSketch(imageBase64);
    return NextResponse.json(scene);
  } catch (err) {
    console.error('[parse-sketch]', err);
    return NextResponse.json(
      { error: 'Failed to parse sketch. Try again or use a sample.' },
      { status: 500 }
    );
  }
}
```

---

## 8. Physics Engine (`lib/physics.ts`)

### Approach

- Use `Matter.Engine`, `Matter.Render` (Canvas 2D), and `Matter.Runner`.
- Map each `PhysicsObject` to the appropriate Matter body.
- Constraints (`Matter.Constraint`) handle pendulums and springs.
- Call `cleanup()` before every new simulation to destroy the previous engine instance.

```typescript
import Matter from 'matter-js';
import { PhysicsObject, PhysicsScene } from './types';

const { Engine, Render, Runner, Bodies, Body, Composite, Constraint, Events } = Matter;

let engine: Matter.Engine | null = null;
let render: Matter.Render | null = null;
let runner: Matter.Runner | null = null;

export function cleanup() {
  if (runner) Runner.stop(runner);
  if (render) {
    Render.stop(render);
    render.canvas.remove();
  }
  if (engine) Engine.clear(engine);
  engine = null; render = null; runner = null;
}

function objectToBody(obj: PhysicsObject): Matter.Body | null {
  const opts: Matter.IBodyDefinition = {
    label: obj.id,
    isStatic: obj.isStatic ?? false,
    restitution: obj.restitution ?? 0.3,
    friction: obj.friction ?? 0.5,
    frictionAir: obj.frictionAir ?? 0.01,
    render: { fillStyle: obj.color ?? '#6366f1' },
  };

  let body: Matter.Body;

  switch (obj.shape) {
    case 'circle':
      body = Bodies.circle(obj.x, obj.y, obj.radius ?? 30, opts);
      break;
    case 'polygon':
      if (!obj.vertices?.length) return null;
      body = Bodies.fromVertices(obj.x, obj.y, obj.vertices, opts);
      break;
    case 'rectangle':
    default:
      body = Bodies.rectangle(obj.x, obj.y, obj.width ?? 60, obj.height ?? 20, opts);
      if (obj.angleDeg) Body.setAngle(body, (obj.angleDeg * Math.PI) / 180);
      break;
  }

  return body;
}

export function buildWorld(scene: PhysicsScene, canvasEl: HTMLCanvasElement): void {
  cleanup();

  engine = Engine.create({ gravity: scene.gravity ?? { x: 0, y: 1 } });

  render = Render.create({
    canvas: canvasEl,
    engine,
    options: {
      width: scene.width,
      height: scene.height,
      wireframes: false,
      background: '#0f172a',
    },
  });

  const bodyMap = new Map<string, Matter.Body>();
  const bodies: Matter.Body[] = [];

  for (const obj of scene.objects) {
    const body = objectToBody(obj);
    if (body) {
      bodyMap.set(obj.id, body);
      bodies.push(body);
    }
  }

  Composite.add(engine.world, bodies);

  // Build constraints (pendulums, springs)
  for (const obj of scene.objects) {
    if (!obj.attachedTo) continue;
    const bodyA = bodyMap.get(obj.attachedTo);
    const bodyB = bodyMap.get(obj.id);
    if (!bodyA || !bodyB) continue;

    const constraint = Constraint.create({
      bodyA,
      bodyB,
      length: obj.restLength ?? 120,
      stiffness: obj.stiffness ?? 0.9,
      render: { strokeStyle: '#a5b4fc', lineWidth: 2 },
    });
    Composite.add(engine.world, constraint);
  }

  Render.run(render);
  runner = Runner.create();
  Runner.run(runner, engine);
}
```

---

## 9. Components

### 9.1 `components/Whiteboard.tsx`

```typescript
'use client';
import { useRef, forwardRef, useImperativeHandle } from 'react';
import { Tldraw, createTLStore, defaultShapeUtils } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';

export interface WhiteboardHandle {
  getImageBase64(): Promise<string>;
  clear(): void;
}

const Whiteboard = forwardRef<WhiteboardHandle>((_, ref) => {
  const editorRef = useRef<import('@tldraw/tldraw').Editor | null>(null);

  useImperativeHandle(ref, () => ({
    async getImageBase64() {
      const editor = editorRef.current;
      if (!editor) throw new Error('Editor not ready');
      const shapeIds = editor.getCurrentPageShapeIds();
      const { blob } = await editor.toImage([...shapeIds], { type: 'png', background: true });
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    },
    clear() {
      editorRef.current?.selectAll();
      editorRef.current?.deleteShapes(editorRef.current.getSelectedShapeIds());
    },
  }));

  return (
    <div className="w-full h-full">
      <Tldraw
        onMount={(editor) => { editorRef.current = editor; }}
        hideUi={false}
      />
    </div>
  );
});

Whiteboard.displayName = 'Whiteboard';
export default Whiteboard;
```

### 9.2 `components/SimulationCanvas.tsx`

```typescript
'use client';
import { useEffect, useRef } from 'react';
import { buildWorld, cleanup } from '@/lib/physics';
import { PhysicsScene } from '@/lib/types';

interface Props {
  scene: PhysicsScene;
}

export default function SimulationCanvas({ scene }: Props) {
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
      className="rounded-xl border border-white/10 shadow-2xl"
    />
  );
}
```

### 9.3 `components/ObjectPanel.tsx`

- Renders a scrollable list of `PhysicsObject[]`.
- Each item shows: role icon, label, `isStatic` badge, color swatch.
- Inline editing: clicking a value opens an `<input>` that updates the Zustand scene on blur.
- "Add Floor" button adds a safe floor if none exists.
- "Delete" icon (trash) removes an object.

Key implementation notes:
- Use `useAppStore` to read `scene` and update it: `store.setScene({ ...scene, objects: updatedObjects })`.
- Animate list items in/out with `framer-motion` `AnimatePresence`.

### 9.4 `components/Toolbar.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ PhysSketch    [Draw Mode] ← toggle → [Preview]    [? Help]  │
│                                                                  │
│  [Load Sample ▼]  [Parse Sketch 🔍]  [Simulate ▶]  [Reset 🔁]  │
└─────────────────────────────────────────────────────────────────┘
```

Button states:
- **Parse Sketch**: enabled only in `draw` mode; shows spinner during `parseStatus === 'loading'`.
- **Simulate**: enabled only in `parsed` mode.
- **Reset**: always enabled; calls `store.resetAll()`.
- **Load Sample**: opens `LoadSampleModal`.

---

## 10. Main Page Layout (`app/simulate/page.tsx`)

```
┌──────────── Toolbar (fixed top, h-16) ────────────────────────┐
│                                                                 │
│  ┌─────────────── Main Area (flex row) ──────────────────────┐ │
│  │                                       │                   │ │
│  │   Whiteboard (tldraw)                 │  ObjectPanel      │ │
│  │   OR                                 │  (w-80, sidebar)  │ │
│  │   SimulationCanvas (Matter.js)        │                   │ │
│  │                                       │                   │ │
│  │   fills remaining height              │  scrollable       │ │
│  └───────────────────────────────────────┴───────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

Switching logic:
- `mode === 'draw'` → show `<Whiteboard />`
- `mode === 'parsed' || mode === 'simulating'` → show `<SimulationCanvas />` when simulating, otherwise whiteboard with overlay
- `parseStatus === 'loading'` → show full-canvas loading overlay with animated spinner and status text

---

## 11. Landing Page (`app/page.tsx`)

A single dark-themed hero screen:

```
┌─────────────────────────────────────────┐
│           ⚡ PhysSketch                  │
│   Draw physics. Watch it move.          │
│                                         │
│   [Open Whiteboard →]                   │
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ 🎨 Draw │  │ 🤖 Parse│  │ ▶ Run  │ │
│  │ a scene │  │ with AI │  │ physics │ │
│  └─────────┘  └─────────┘  └─────────┘ │
│                                         │
│  "No pre-built simulations. Just your  │
│   drawing and a physics engine."        │
└─────────────────────────────────────────┘
```

Use `framer-motion` for entrance animations (fade + slide up, staggered).

---

## 12. Sample Scenes (`lib/samples.ts`)

Define four `PhysicsScene` objects as constants. Each is carefully hand-tuned so the simulation runs cleanly without AI parsing.

**Scene 1 — Ramp + Block**
- Static ramp: rectangle at 30° angle, isStatic true
- Block: rectangle sitting at top of ramp, isStatic false
- Floor: full-width static rectangle at bottom

**Scene 2 — Billiard Collision**
- 3 circles in a line, first one launched with initial velocity

**Scene 3 — Single Pendulum**
- Pivot: static circle at top center
- Bob: dynamic circle
- Constraint with restLength 150, stiffness 1.0

**Scene 4 — Newton's Cradle**
- 5 static pivots in a row, 5 bobs hanging from them
- Leftmost bob displaced by 80px at t=0

> **Note**: For the Newton's Cradle, set the initial position of the leftmost pendulum bob before starting the runner so it swings into the others.

---

## 13. Styling & Visual Design

### Color Palette

```
Background:     #0f172a  (slate-900)
Surface:        #1e293b  (slate-800)
Border:         rgba(255,255,255,0.08)
Accent:         #6366f1  (indigo-500)
Accent bright:  #818cf8  (indigo-400)
Success:        #22c55e  (green-500)
Error:          #ef4444  (red-500)
Text primary:   #f1f5f9  (slate-100)
Text secondary: #94a3b8  (slate-400)
```

### Typography

- Font: `Inter` (next/font/google)
- Headings: `font-bold tracking-tight`
- Body: `text-sm leading-relaxed`

### Component Style Tokens (Tailwind classes to reuse)

```
Card:      bg-slate-800 border border-white/10 rounded-xl p-4
Button:    px-4 py-2 rounded-lg font-medium transition-all duration-200
Btn-primary:  bg-indigo-500 hover:bg-indigo-400 text-white
Btn-ghost:    bg-transparent hover:bg-white/5 text-slate-300
Btn-danger:   bg-red-500/10 hover:bg-red-500/20 text-red-400
Badge:     text-xs px-2 py-0.5 rounded-full font-medium
```

---

## 14. Error Handling & Fallbacks

| Scenario | Handling |
|---|---|
| Gemini returns malformed JSON | Catch parse error, show toast "Parse failed — try again or use a sample", stay in draw mode |
| Gemini API key missing | Show banner on page load: "Add GEMINI_API_KEY to .env.local" |
| Empty canvas (no shapes drawn) | Disable "Parse Sketch" button and show tooltip "Draw something first" |
| Gemini rate limit (429) | Toast: "API rate limit hit. Use a sample scene or wait a minute." |
| Matter.js crash (bad vertices) | try/catch around buildWorld, toast error, do not unmount component |
| Canvas export fails | Fallback: use `html2canvas` on the whiteboard DOM element |

---

## 15. `.env.example`

```
# Required
GEMINI_API_KEY=your_google_ai_studio_key_here
```

---

## 16. `next.config.ts` Notes

```typescript
const nextConfig = {
  // tldraw uses some edge-incompatible packages; keep everything in Node runtime
  experimental: {
    serverComponentsExternalPackages: ['@tldraw/tldraw'],
  },
};
```

---

## 17. Performance Notes

- tldraw canvas: lazy-load it with `next/dynamic` and `{ ssr: false }` — it crashes on server.
- Matter.js Render: it draws directly to the canvas element, does not use React's render loop. No `useState` triggers needed.
- Gemini call: average latency ~800 ms on Flash model. Show progress indicator with steps: "Reading sketch → Identifying objects → Building scene."
- Large sketches: before sending to Gemini, resize the exported PNG to max 800×600 client-side using a hidden `<canvas>` to reduce token usage.

---

## 18. Accessibility

- All interactive buttons have `aria-label` attributes.
- Keyboard shortcut: `Cmd/Ctrl+Enter` triggers "Parse Sketch" while in draw mode.
- Keyboard shortcut: `Space` starts/pauses simulation.
- `role="status"` live region for parse status messages (screen readers).

---

## 19. Deployment

```bash
# Vercel (recommended)
npx vercel --prod

# Set environment variable in Vercel dashboard:
# GEMINI_API_KEY = <your key>
```

No database, no auth, no server-side state. Pure stateless deployment.

---

## 20. What NOT to Build

To keep the 24-hour scope sane, **explicitly exclude**:

- ❌ User accounts or persistence
- ❌ Multiple simultaneous physics domains (e.g., circuits, optics) — classical mechanics only
- ❌ Mobile / touch optimization (desktop demo only)
- ❌ Video export of simulation
- ❌ Multiplayer / real-time collaboration
- ❌ Fine-tuned sketch recognition (Gemini is good enough for demo)
- ❌ Undo/redo in the simulation view (only in the drawing view via tldraw's built-in undo)

---

## 21. Demo Script (for judges)

1. Open the app. Show the blank whiteboard.
2. Draw: a tilted ramp with a box at the top, and some circles scattered below.
3. Hit **"Parse Sketch"** — show the loading animation (~1 second).
4. Point out the Object Panel — "Look, it found the ramp, the block, and the two balls."
5. Optionally tweak one value (e.g., increase friction on the ramp).
6. Hit **"Simulate"** — physics engine takes over, box slides down ramp, hits the balls.
7. Hit **"Reset"** and load the Newton's Cradle sample. Let it run. Audience goes "oh."
8. Pitch: "Every PhET simulation is hand-built. Ours lets you sketch any scenario and run it instantly. That's the gap."

## External Codebases

* [FlowBoard-AI](https://github.com/Fyre-Aspect/FlowBoard-AI): An AI-powered video storyboarding tool. We will be integrating its logic for sketch-to-video generation.
