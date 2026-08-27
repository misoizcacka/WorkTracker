import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import de from './locales/de.json';
import sv from './locales/sv.json';
import sr from './locales/sr.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'sv', label: 'Svenska' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

const STORAGE_KEY = 'koordinate_language';

function getWebStoredLanguage(): LanguageCode | null {
  if (Platform.OS === 'web') {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
        return saved as LanguageCode;
      }
    } catch (_) {}
  }
  return null;
}

function detectLanguage(): LanguageCode {
  // 1. Web: persisted preference in localStorage
  const webStored = getWebStoredLanguage();
  if (webStored) return webStored;

  // 2. Browser / OS language
  let deviceLang: string | null = null;
  try {
    if (Platform.OS === 'web') {
      deviceLang = (typeof navigator !== 'undefined' ? navigator.language : '')
        .split('-')[0]
        .toLowerCase();
    } else {
      deviceLang = Localization.getLocales()[0]?.languageCode?.toLowerCase() ?? null;
    }
  } catch (_) {}

  if (deviceLang && SUPPORTED_LANGUAGES.some(l => l.code === deviceLang)) {
    return deviceLang as LanguageCode;
  }

  return 'en';
}

/** Persist language preference — localStorage on web, AsyncStorage on native */
function persistLanguage(code: LanguageCode) {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, code);
      }
    } catch (_) {}
  } else {
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});
  }
}

/**
 * Change language. Persists the choice and tells i18next to switch.
 * Components using useTranslation() / t() re-render automatically.
 */
export function changeLanguage(code: LanguageCode) {
  persistLanguage(code);
  i18n.changeLanguage(code);
}

/**
 * Load persisted language from AsyncStorage on native and apply it.
 * Call this once at app startup (in _layout.tsx) after i18n is initialised.
 */
export async function loadPersistedLanguage(): Promise<void> {
  if (Platform.OS === 'web') return; // web uses localStorage, already handled synchronously
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
      i18n.changeLanguage(saved);
    }
  } catch (_) {}
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    sv: { translation: sv },
    sr: { translation: sr },
    fr: { translation: fr },
    es: { translation: es },
    nl: { translation: nl },
    pl: { translation: pl },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
