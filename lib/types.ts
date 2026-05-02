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
