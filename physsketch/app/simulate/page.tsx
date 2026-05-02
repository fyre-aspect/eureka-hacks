'use client';
import dynamic from 'next/dynamic';
import { useRef } from 'react';
import Toolbar from '@/components/Toolbar';
import ObjectPanel from '@/components/ObjectPanel';
import { useAppStore } from '@/store/useAppStore';
import type { WhiteboardHandle } from '@/components/Whiteboard';
import SimulationCanvas from '@/components/SimulationCanvas';

const Whiteboard = dynamic(() => import('@/components/Whiteboard'), { ssr: false });

export default function SimulatePage() {
  const whiteboardRef = useRef<WhiteboardHandle>(null);
  const { mode, scene } = useAppStore();

  return (
    <div className="flex h-screen flex-col">
      <Toolbar />
      <main className="flex flex-1 pt-16">
        <div className="flex-1">
          {mode === 'draw' && <Whiteboard ref={whiteboardRef} />}
          {(mode === 'parsed' || mode === 'simulating') && scene && (
            <div className="w-full h-full flex items-center justify-center">
              <SimulationCanvas scene={scene} />
            </div>
          )}
        </div>
        <ObjectPanel />
      </main>
    </div>
  );
}
