import { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'tr' | 'en';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  /** Returns the Turkish or English text for the active language. */
  tx: (tr: string, en: string) => string;
  /** BCP 47 locale used for date formatting. */
  locale: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem('language') === 'en' ? 'en' : 'tr'
  );

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const value: LanguageContextType = {
    language,
    toggleLanguage: () => setLanguage((prev) => (prev === 'tr' ? 'en' : 'tr')),
    tx: (tr, en) => (language === 'en' ? en : tr),
    locale: language === 'en' ? 'en-US' : 'tr-TR',
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
