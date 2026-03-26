import { create } from 'zustand';

interface AuthState {
  locale: 'fr' | 'en';
  setLocale: (locale: 'fr' | 'en') => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  locale: (localStorage.getItem('locale') as 'fr' | 'en') || 'fr',
  setLocale: (locale) => {
    localStorage.setItem('locale', locale);
    set({ locale });
  },
}));
