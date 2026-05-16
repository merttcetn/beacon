import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { UserRole } from '@/types';

interface UserState {
  role: UserRole | null;
  onboardingComplete: boolean;
  setRole: (role: UserRole) => void;
  setOnboardingComplete: (complete: boolean) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      role: null,
      onboardingComplete: false,
      setRole: (role) => set({ role }),
      setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
      reset: () => set({ role: null, onboardingComplete: false }),
    }),
    {
      name: 'user-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
