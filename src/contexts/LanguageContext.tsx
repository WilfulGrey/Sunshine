import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Language, useTranslation } from '../utils/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: ReturnType<typeof useTranslation>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('de');
  const t = useTranslation(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};