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
