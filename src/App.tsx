import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { AuthForm } from './components/Auth/AuthForm';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { ResetPasswordForm } from './components/Auth/ResetPasswordForm';
import { AccountSettings } from './components/Auth/AccountSettings';
import { Header } from './components/Header';
import { TaskFocusedView } from './components/TaskFocusedView';
import { TaskHistory } from './components/TaskHistory';
import { useLanguage } from './contexts/LanguageContext';
import { useCallbacks } from './hooks/useCallbacks';
import { Task } from './types/Task';

function App() {
  useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [currentView, setCurrentView] = useState<'main' | 'settings'>('main');
  const {
    tasks,
    loading,
    error,
    lastRefresh,
    availableUsers,
    loadCallbacks,
    silentRefresh,
    updateLocalTask,
    removeLocalTask,
  } = useCallbacks();
  
  const handleConfigSaved = () => {
    loadCallbacks();
  };

  const handleUndoAction = (taskId: string, historyEntryId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.history) return;

    const historyEntry = task.history.find(h => h.id === historyEntryId);
    if (!historyEntry || !historyEntry.canUndo) return;

    const updates: Partial<Task> = {
      status: historyEntry.previousStatus || 'pending',
      completedAt: undefined,
      history: task.history.filter(h => h.id !== historyEntryId)
    };

    if (historyEntry.action === 'postponed') {
      updates.dueDate = undefined;
    }

    updateLocalTask(taskId, updates);
  };

  // Routing logic
  const isResetPassword = window.location.pathname === '/reset-password';
  
  if (isResetPassword) {
    return <ResetPasswordForm />;
  }

  return (
    <ProtectedRoute fallback={<AuthForm mode={authMode} onModeChange={setAuthMode} />}>
      {currentView === 'settings' ? (
        <AccountSettings onBack={() => setCurrentView('main')} />
      ) : (
        <MainApp
          tasks={tasks}
          loading={loading}
          error={error}
          lastRefresh={lastRefresh}
          handleConfigSaved={handleConfigSaved}
          updateLocalTask={updateLocalTask}
          removeLocalTask={removeLocalTask}
          handleUndoAction={handleUndoAction}
          onShowSettings={() => setCurrentView('settings')}
          loadCallbacks={loadCallbacks}
          silentRefresh={silentRefresh}
          availableUsers={availableUsers}
        />
      )}
    </ProtectedRoute>
  );
}

interface MainAppProps {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  lastRefresh: Date;
  handleConfigSaved: () => void;
  updateLocalTask: (taskId: string, updates: Partial<Task>) => void;
  removeLocalTask: (taskId: string) => void;
  handleUndoAction: (taskId: string, historyEntryId: string) => void;
  onShowSettings: () => void;
  loadCallbacks: () => void;
  silentRefresh: () => void;
  availableUsers: string[];
}

const MainApp: React.FC<MainAppProps> = ({
  tasks,
  loading,
  error,
  lastRefresh,
  handleConfigSaved,
  updateLocalTask,
  removeLocalTask,
  handleUndoAction,
  onShowSettings,
  loadCallbacks,
  silentRefresh,
  availableUsers
}) => {
  const { t } = useLanguage();

  // Pokaż komunikat o ładowaniu
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ładowanie kontaktów...</h3>
          <p className="text-gray-500">Pobieranie danych z API</p>
          <p className="text-xs text-gray-400 mt-2">Ostatnie odświeżenie: {lastRefresh.toLocaleTimeString()}</p>
        </div>
      </div>
    );
  }

  // Pokaż komunikat o błędzie
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Błąd połączenia</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadCallbacks}
            className="px-6 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#AB4D95' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9A3D85'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#AB4D95'}
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col">
        <Header 
          tasks={tasks}
          onConfigSaved={handleConfigSaved}
          onShowSettings={onShowSettings}
        />

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {t.yourTasks}
                </h1>
                <p className="text-gray-600">
                  {t.workTasksInOrder}
                </p>
              </div>
            </div>

            <div id="task-focused-view">
              <TaskFocusedView
                tasks={tasks}
                onUpdateLocalTask={updateLocalTask}
                onRemoveLocalTask={removeLocalTask}
                onLoadContacts={loadCallbacks}
                onSilentRefresh={silentRefresh}
                availableUsers={availableUsers}
              />
            </div>

            <div className="mt-8">
              <TaskHistory 
                tasks={tasks}
                onUndoAction={handleUndoAction}
              />
            </div>

          </div>
        </main>
      </div>

    </div>
  );
};

export default App;