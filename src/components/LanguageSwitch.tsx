import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../utils/translations';

export const LanguageSwitch: React.FC = () => {
  const { language, updateUserLanguage } = useLanguage();

  const handleLanguageChange = async (newLanguage: Language) => {
    try {
      await updateUserLanguage(newLanguage);
    } catch (err) {
      console.error('Failed to update language:', err);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Languages className="h-4 w-4 text-white/70" />
      <div className="flex bg-white/20 rounded-lg p-1">
        <button
          onClick={() => handleLanguageChange('de')}
          className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
            language === 'de'
              ? 'bg-white text-purple-600'
              : 'text-white/80 hover:text-white'
          }`}
        >
          DE
        </button>
        <button
          onClick={() => handleLanguageChange('pl')}
          className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
            language === 'pl'
              ? 'bg-white text-purple-600'
              : 'text-white/80 hover:text-white'
          }`}
        >
          PL
        </button>
      </div>
    </div>
  );
};