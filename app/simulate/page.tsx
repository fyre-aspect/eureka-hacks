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
    <div className="flex h-screen flex-col bg-slate-950 font-sans text-slate-100 selection:bg-indigo-500/30">
      <Toolbar whiteboardRef={whiteboardRef} />
      
      <main className="flex flex-1 pt-20 pb-4 px-4 gap-4 overflow-hidden">
        {/* Main Canvas Area */}
        <div className="relative flex-1 rounded-2xl bg-slate-900/50 border border-white/5 shadow-2xl overflow-hidden backdrop-blur-sm flex flex-col">
          {mode === 'draw' && (
            <div className="absolute inset-0 z-10">
              <Whiteboard ref={whiteboardRef} />
            </div>
          )}
          
          {(mode === 'parsed' || mode === 'simulating') && scene && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0f172a]">
              <SimulationCanvas scene={scene} />
            </div>
          )}
        </div>
        
        {/* Right Sidebar */}
        <ObjectPanel />
      </main>
    </div>
  );
}
