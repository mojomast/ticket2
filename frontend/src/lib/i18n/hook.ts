import { useAuthStore } from '../../stores/auth-store';
import { fr } from './locales/fr';
import { en } from './locales/en';

const catalogs: Record<string, Record<string, string>> = { fr, en };

export function useTranslation() {
  const locale = useAuthStore((s) => s.locale);
  const catalog = catalogs[locale] || catalogs['fr']!;

  function t(key: string, params?: Record<string, string | number>): string {
    let value = catalog[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{${k}}`, String(v));
      }
    }
    return value;
  }

  return { t, locale };
}
