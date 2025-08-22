import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  // Load user's preferred language when user data is available
  useEffect(() => {
    if (currentUser && users.length > 0) {
      const userProfile = users.find(u => u.id === currentUser.id);
      if (userProfile?.preferred_language) {
        setLanguage(userProfile.preferred_language);
      }
    }
  }, [currentUser, users]);

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

  return (
    <LanguageContext.Provider value={{ language, setLanguage, updateUserLanguage, t }}>
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