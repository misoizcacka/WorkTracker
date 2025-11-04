import React from 'react';
import i18n from './i18n';

export const I18nContext = React.createContext(i18n);

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  return <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>;
};
