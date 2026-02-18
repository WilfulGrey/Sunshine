import React from 'react';
import { Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSwitch } from './LanguageSwitch';
import { TimezoneSelect } from './TimezoneSelect';
import { TwilioConfig } from './TwilioConfig';
import { useLanguage } from '../contexts/LanguageContext';
import { Task } from '../types/Task';

interface HeaderProps {
  tasks: Task[];
  onConfigSaved?: () => void;
  onShowSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ tasks, onConfigSaved, onShowSettings }) => {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="px-6 py-4 border-b border-gray-200" style={{ backgroundColor: '#AB4D95' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="font-bold text-sm" style={{ color: '#AB4D95' }}>M</span>
            </div>
            <span className="font-semibold text-white">{t.appTitle}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <LanguageSwitch />
          
          <TimezoneSelect />

          <TwilioConfig onConfigSaved={onConfigSaved || (() => {})} />
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-white/90">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">
                {user?.user_metadata?.full_name || user?.email}
              </span>
            </div>
            
            <button
              onClick={onShowSettings}
              className="flex items-center space-x-2 px-3 py-2 bg-white/20 rounded-lg text-white/90 hover:bg-white/30 transition-colors"
              title={t.accountSettings}
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">{t.account}</span>
            </button>
            
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-3 py-2 bg-white/20 rounded-lg text-white/90 hover:bg-white/30 transition-colors"
              title={t.signOutTitle}
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">{t.signOut}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};