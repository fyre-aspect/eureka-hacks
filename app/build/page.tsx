'use client';
import { useState } from 'react';
import Link from 'next/link';
import SimulationCanvas from '@/components/SimulationCanvas';
import { PhysicsScene, PhysicsObject } from '@/lib/types';

export default function BuildPage() {
  const [gravityEnabled, setGravityEnabled] = useState(false);

  const initialObjects: PhysicsObject[] = [
    {
      id: 'falling-box',
      role: 'block',
      shape: 'rectangle',
      x: 400,
      y: 100,
      width: 60,
      height: 60,
      color: '#ec4899', // pink-500
      restitution: 0.8, // Bouncy!
    },
    {
      id: 'ground',
      role: 'floor',
      shape: 'rectangle',
      x: 400,
      y: 580,
      width: 800,
      height: 40,
      isStatic: true,
      color: '#334155', // slate-700
    },
  ];

  const scene: PhysicsScene = {
    objects: initialObjects,
    gravity: { x: 0, y: gravityEnabled ? 1 : 0 },
    width: 800,
    height: 600,
  };

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-50">
      <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">Physics Builder</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setGravityEnabled(!gravityEnabled)}
            className={`rounded-lg px-6 py-2 font-semibold transition-all duration-200 ${
              gravityEnabled
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30'
                : 'bg-indigo-500 text-white hover:bg-indigo-400 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]'
            }`}
          >
            {gravityEnabled ? 'Gravity: ON' : 'Gravity: OFF'}
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        <div className="relative rounded-2xl p-4 bg-slate-900/50 backdrop-blur-sm border border-slate-800 shadow-2xl">
          {/* We add a 'key' here so that turning gravity on/off recreates the canvas instance and resets the block to the top */}
          <SimulationCanvas key={gravityEnabled ? 'on' : 'off'} scene={scene} />
        </div>
      </main>
    </div>
  );
}
