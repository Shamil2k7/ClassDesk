'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '@/messages/en.json';
import ml from '@/messages/ml.json';
import hi from '@/messages/hi.json';

export type Locale = 'en' | 'ml' | 'hi';

type Messages = typeof en;

const dictionaries: Record<Locale, Messages> = {
  en,
  ml: ml as unknown as Messages,
  hi: hi as unknown as Messages,
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (keyPath: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (keyPath: string, fallback?: string) => fallback || keyPath,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem('classdesk_locale') as Locale | null;
    if (saved && (saved === 'en' || saved === 'ml' || saved === 'hi')) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('classdesk_locale', newLocale);
  };

  const t = (keyPath: string, fallback?: string): string => {
    const dict = dictionaries[locale] || dictionaries.en;
    const parts = keyPath.split('.');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = dict;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // Fallback to English if missing in Malayalam or Hindi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let fallbackVal: any = dictionaries.en;
        for (const p of parts) {
          if (fallbackVal && typeof fallbackVal === 'object' && p in fallbackVal) {
            fallbackVal = fallbackVal[p];
          } else {
            return fallback || keyPath;
          }
        }
        return typeof fallbackVal === 'string' ? fallbackVal : fallback || keyPath;
      }
    }
    return typeof current === 'string' ? current : fallback || keyPath;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
