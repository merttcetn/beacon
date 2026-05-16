import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Ticket } from '@/types';

interface TicketState {
  userTickets: Ticket[];
  addTicket: (ticket: Ticket) => void;
  reset: () => void;
}

export const useTicketStore = create<TicketState>()(
  persist(
    (set) => ({
      userTickets: [],
      addTicket: (ticket) =>
        set((state) => ({ userTickets: [ticket, ...state.userTickets] })),
      reset: () => set({ userTickets: [] }),
    }),
    {
      name: 'ticket-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
