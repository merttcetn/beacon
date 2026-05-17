import { create } from 'zustand';

interface DebugState {
  vlmBypass: boolean;
  toggleVlmBypass: () => void;
  setVlmBypass: (value: boolean) => void;
}

// Demo flag: when true, Buddy screen replays BUDDY_FRAME_CACHE instead of
// hitting /v1/assist. Toggle from the company dashboard. Reset on app restart.
export const useDebugStore = create<DebugState>()((set) => ({
  vlmBypass: true,
  toggleVlmBypass: () => set((state) => ({ vlmBypass: !state.vlmBypass })),
  setVlmBypass: (value) => set({ vlmBypass: value }),
}));
