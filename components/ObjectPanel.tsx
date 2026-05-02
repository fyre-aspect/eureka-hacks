'use client';

import { useAppStore } from "@/store/useAppStore";
import { Box, Shapes } from "lucide-react";

export default function ObjectPanel() {
    const scene = useAppStore((state) => state.scene);
    const mode = useAppStore((state) => state.mode);

    if (mode === 'draw') {
        return (
            <div className="w-80 rounded-2xl bg-slate-900/40 border border-white/5 shadow-2xl backdrop-blur-md p-6 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 border border-white/5">
                    <Shapes className="w-8 h-8 text-slate-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-300 mb-2">Empty Scene</h2>
                <p className="text-sm text-slate-500">Draw a physics scenario and click "Parse with AI" to detect objects.</p>
            </div>
        );
    }

    if (!scene) {
        return null;
    }

    return (
        <div className="w-80 rounded-2xl bg-slate-900/40 border border-white/5 shadow-2xl backdrop-blur-md flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-slate-800/20">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Box className="w-4 h-4 text-indigo-400" />
                    Parsed Objects
                    <span className="ml-auto bg-indigo-500/20 text-indigo-300 py-0.5 px-2 rounded-full text-xs font-semibold">
                        {scene.objects.length}
                    </span>
                </h2>
            </div>
            
            <ul className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {scene.objects.map((obj) => (
                    <li 
                        key={obj.id} 
                        className="group flex items-center gap-3 bg-slate-800/40 hover:bg-slate-700/50 p-3 rounded-xl border border-white/5 transition-all duration-200"
                    >
                        <div 
                            className="w-4 h-4 rounded-full shadow-sm border border-white/10 shrink-0" 
                            style={{ backgroundColor: obj.color || '#6366f1' }}
                        />
                        <div className="flex flex-col min-w-0">
                            <span className="text-slate-200 font-medium truncate">
                                {obj.label || obj.role}
                            </span>
                            <div className="flex gap-2 text-xs text-slate-500 mt-1">
                                <span className="capitalize">{obj.shape}</span>
                                {obj.isStatic && (
                                    <span className="text-amber-500/80 bg-amber-500/10 px-1.5 rounded-sm">Static</span>
                                )}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
