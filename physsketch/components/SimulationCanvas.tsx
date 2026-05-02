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
