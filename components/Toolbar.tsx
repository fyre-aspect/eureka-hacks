'use client';

import { useAppStore } from "@/store/useAppStore";
import { Play, Sparkles, RotateCcw, Loader2 } from "lucide-react";
import type { WhiteboardHandle } from '@/components/Whiteboard';

interface ToolbarProps {
    whiteboardRef: React.RefObject<WhiteboardHandle | null>;
}

export default function Toolbar({ whiteboardRef }: ToolbarProps) {
    const { mode, setMode, parseStatus, setParseStatus, setScene, resetAll } = useAppStore();

    const handleParseSketch = async () => {
        if (!whiteboardRef.current) return;
        
        try {
            setParseStatus('loading');
            const imageBase64 = await whiteboardRef.current.getImageBase64();
            
            const res = await fetch('/api/parse-sketch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64 }),
            });
            
            if (!res.ok) throw new Error('Failed to parse sketch');
            
            const scene = await res.json();
            setScene(scene);
        } catch (error) {
            console.error(error);
            setParseStatus('error', 'Failed to parse image. Try again.');
        }
    };

    const handleSimulate = () => {
        setMode('simulating');
    };

    const handleReset = () => {
        resetAll();
        // Give time for mode switch to re-mount whiteboard, then clear it
        setTimeout(() => {
            whiteboardRef.current?.clear();
        }, 100);
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-slate-900/60 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-semibold text-xl tracking-tight">PhysSketch</span>
            </div>
            
            <div className="flex items-center gap-3">
                {mode === 'draw' && (
                    <button
                        className="group relative flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium py-2 px-5 rounded-full transition-all duration-200 border border-white/5 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                        onClick={handleParseSketch}
                        disabled={parseStatus === 'loading'}
                    >
                        {parseStatus === 'loading' ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                                <span>Analyzing...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                                <span>Parse with AI</span>
                            </>
                        )}
                    </button>
                )}

                {mode === 'parsed' && (
                    <button
                        className="group flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-medium py-2 px-5 rounded-full transition-all duration-200 shadow-lg shadow-indigo-500/20"
                        onClick={handleSimulate}
                    >
                        <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                        <span>Simulate</span>
                    </button>
                )}

                <button
                    className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-medium py-2 px-4 rounded-full transition-all duration-200 border border-rose-500/20 hover:border-rose-500/30 ml-2"
                    onClick={handleReset}
                >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset</span>
                </button>
            </div>
        </header>
    );
}
