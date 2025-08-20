import React from 'react';
import { Settings, AlertTriangle, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSwitch } from './LanguageSwitch';
import { TimezoneSelect } from './TimezoneSelect';
import { AirtableConfig } from './AirtableConfig';
import { TwilioConfig } from './TwilioConfig';
import { useLanguage } from '../contexts/LanguageContext';
import { Task } from '../types/Task';
import { filterActiveTasks } from '../utils/taskUtils';
import { useTaskActions } from '../hooks/useTaskActions';

interface HeaderProps {
  tasks: Task[];
  onConfigSaved?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ tasks, onConfigSaved }) => {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const taskActions = useTaskActions(tasks, () => {}); // Empty callback since we only need currentUserName

  // Count urgent tasks - only those available to current user
  const activeTasks = filterActiveTasks(tasks, taskActions.currentUserName, taskActions.takenTasks);
  const urgentTasks = activeTasks.filter(task => task.airtableData?.urgent === true);
  const urgentCount = urgentTasks.length;

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
          
          {urgentCount > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-red-500 text-white rounded-full">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {urgentCount} pilnych kontaktów
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <LanguageSwitch />
          
          <TimezoneSelect />
          
          <AirtableConfig onConfigSaved={onConfigSaved || (() => {})} />
          
          <TwilioConfig onConfigSaved={onConfigSaved || (() => {})} />
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-white/90">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">
                {user?.user_metadata?.full_name || user?.email}
              </span>
            </div>
            
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-3 py-2 bg-white/20 rounded-lg text-white/90 hover:bg-white/30 transition-colors"
              title="Wyloguj się"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Wyloguj</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Settings className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-white">{t.manage}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};