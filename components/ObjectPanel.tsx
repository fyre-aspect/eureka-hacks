'use client';

import { useAppStore } from "@/store/useAppStore";

export default function ObjectPanel() {
    const scene = useAppStore((state) => state.scene);

    if (!scene) {
        return null;
    }

    return (
        <div className="w-80 bg-slate-800 p-4 overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">Parsed Objects</h2>
            <ul>
                {scene.objects.map((obj) => (
                    <li key={obj.id} className="text-white mb-2">
                        {obj.label || obj.role}
                    </li>
                ))}
            </ul>
        </div>
    );
}
