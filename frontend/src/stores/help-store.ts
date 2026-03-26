import { create } from 'zustand';

interface HelpState {
  isOpen: boolean;
  currentPageKey: string;
  toggle: () => void;
  open: () => void;
  close: () => void;
  setPageKey: (key: string) => void;
}

export const useHelpStore = create<HelpState>((set) => ({
  isOpen: false,
  currentPageKey: 'dashboard',
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setPageKey: (key) => set({ currentPageKey: key }),
}));
