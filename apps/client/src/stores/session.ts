import { create } from 'zustand';

type Session = {
  name: string;
  email: string;
  accessToken?: string;
  mode: 'account' | 'demo';
};

type SessionState = {
  session: Session | null;
  authReady: boolean;
  routineItems: string[];
  setSession: (session: Session) => void;
  setAuthReady: () => void;
  startDemo: () => void;
  addRoutineItem: (item: string) => void;
  removeRoutineItem: (item: string) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  authReady: false,
  routineItems: ['Gentle cleanser', 'Daily moisturizer', 'SPF 30 sunscreen'],
  setSession: (session) => set({ session, authReady: true }),
  setAuthReady: () => set({ authReady: true }),
  startDemo: () => set({
    session: { name: 'Sarah', email: 'sarah@example.test', mode: 'demo' },
    authReady: true,
    routineItems: ['Gentle cleanser', 'Daily moisturizer', 'SPF 30 sunscreen'],
  }),
  addRoutineItem: (item) => set((state) => ({
    routineItems: state.routineItems.includes(item) ? state.routineItems : [...state.routineItems, item],
  })),
  removeRoutineItem: (item) => set((state) => ({
    routineItems: state.routineItems.filter((routineItem) => routineItem !== item),
  })),
  clearSession: () => set({ session: null, routineItems: [] }),
}));