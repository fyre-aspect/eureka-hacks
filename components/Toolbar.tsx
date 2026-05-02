'use client';

import { useAppStore } from "@/store/useAppStore";

export default function Toolbar() {
    const { mode, setMode, parseStatus, setParseStatus, resetAll } = useAppStore();

    const handleParseSketch = () => {
        // Placeholder
    };

    const handleSimulate = () => {
        setMode('simulating');
    };

    const handleReset = () => {
        resetAll();
    };

    return (
        <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 flex items-center justify-between px-4">
            <div className="text-white font-bold text-lg">PhysSketch</div>
            <div>
                <button
                    className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-2 px-4 rounded mr-2"
                    onClick={handleParseSketch}
                    disabled={mode !== 'draw' || parseStatus === 'loading'}
                >
                    {parseStatus === 'loading' ? 'Parsing...' : 'Parse Sketch'}
                </button>
                <button
                    className="bg-green-500 hover:bg-green-400 text-white font-bold py-2 px-4 rounded mr-2"
                    onClick={handleSimulate}
                    disabled={mode !== 'parsed'}
                >
                    Simulate
                </button>
                <button
                    className="bg-red-500 hover:bg-red-400 text-white font-bold py-2 px-4 rounded"
                    onClick={handleReset}
                >
                    Reset
                </button>
            </div>
        </div>
    );
}
