import { createContext, useContext, type ReactNode } from 'react';
import { useAuthStore } from '../../stores/auth-store';

interface I18nContextValue {
  locale: 'fr' | 'en';
  setLocale: (locale: 'fr' | 'en') => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'fr',
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useAuthStore((s) => s.locale);
  const setLocale = useAuthStore((s) => s.setLocale);

  return (
    <I18nContext.Provider value={{ locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
