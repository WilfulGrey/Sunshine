import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useRef } from 'react';
import { Language, useTranslation } from '../utils/translations';
import { useAuth } from './AuthContext';
import { useUsers } from '../hooks/useUsers';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  updateUserLanguage: (language: Language) => Promise<void>;
  t: ReturnType<typeof useTranslation>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('pl'); // Default fallback
  const { user: currentUser } = useAuth();
  const { users, updateUserLanguage: updateUserLanguageInUsers } = useUsers();
  const t = useTranslation(language);

  // Optimize: only find user profile when necessary and cache result
  const currentUserProfile = useMemo(() => {
    if (!currentUser || users.length === 0) return null;
    return users.find(u => u.id === currentUser.id) || null;
  }, [currentUser?.id, users]);

  // Language is always PL - no switching
  const _hasSetLanguageFromProfile = useRef(false);
  void _hasSetLanguageFromProfile;

  const updateUserLanguage = async (newLanguage: Language): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Update in Supabase
      await updateUserLanguageInUsers(currentUser.id, newLanguage);
      
      // Update local state
      setLanguage(newLanguage);
    } catch (error) {
      console.error('Failed to update user language preference:', error);
      throw error;
    }
  };

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    updateUserLanguage,
    t
  }), [language, t]);

  return (
    <LanguageContext.Provider value={contextValue}>
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