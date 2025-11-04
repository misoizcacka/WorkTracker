import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import sv from './locales/sv.json';
import sr from './locales/sr.json';
import de from './locales/de.json';

const i18n = new I18n({
  en,
  sv,
  sr,
  de,
});

i18n.defaultLocale = 'en';
i18n.locale = Localization.locale || 'en';
i18n.enableFallback = true;

export default i18n;
