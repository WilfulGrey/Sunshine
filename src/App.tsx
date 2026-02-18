import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
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
import { Task, TaskType, TaskPriority, TaskStatus } from './types/Task';
import { generateId, addHistoryEntry } from './utils/helpers';

function App() {
  const { user } = useAuth();
  const { t } = useLanguage();
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
  
  const [showSampleTasks, setShowSampleTasks] = useState(false);

  const createTestTasks = () => {
    const sampleTasks: Task[] = [
      {
        id: generateId(),
        title: t.sampleTask1Title,
        description: t.sampleTask1Description,
        type: 'manual',
        priority: 'urgent',
        status: 'pending',
        assignedTo: t.mariaSchmidt,
        category: t.matchingContact,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: generateId(),
        title: t.sampleTask2Title,
        description: t.sampleTask2Description,
        type: 'manual',
        priority: 'high',
        status: 'pending',
        assignedTo: t.thomasWeber,
        category: t.matchingContact,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        history: []
      },
      {
        id: generateId(),
        title: t.sampleTask3Title,
        description: t.sampleTask3Description,
        type: 'manual',
        priority: 'urgent',
        status: 'pending',
        assignedTo: t.annaMueller,
        category: t.matchingContact,
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        history: []
      },
      {
        id: generateId(),
        title: t.sampleTask4Title,
        description: t.sampleTask4Description,
        type: 'manual',
        priority: 'urgent',
        status: 'pending',
        assignedTo: t.michaelBauer,
        category: t.matchingContact,
       createdAt: new Date(Date.now() - 45 * 60 * 1000),
       history: []
      },
      {
        id: generateId(),
        title: t.sampleTask5Title,
        description: t.sampleTask5Description,
        type: 'manual',
        priority: 'urgent',
        status: 'pending',
        assignedTo: t.sandraKoch,
        category: t.matchingContact,
       createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
       history: []
      },
      {
        id: generateId(),
        title: t.sampleTask6Title,
        description: t.sampleTask6Description,
        type: 'manual',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // in 4h
        assignedTo: t.mariaSchmidt,
        category: t.communication,
       createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
       history: []
      },
      {
        id: generateId(),
        title: t.sampleTask7Title,
        description: t.sampleTask7Description,
        type: 'manual',
        priority: 'high',
        status: 'pending',
        assignedTo: t.thomasWeber,
        category: t.matchingContact,
       createdAt: new Date(Date.now() - 15 * 60 * 1000),
       history: []
      },
      {
        id: generateId(),
        title: t.sampleTask8Title,
        description: t.sampleTask8Description,
        type: 'manual',
        priority: 'medium',
        status: 'pending',
        assignedTo: t.annaMueller,
        category: t.qualityControl,
       createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
       history: []
      },
      {
        id: generateId(),
        title: t.sampleTask9Title,
        description: t.sampleTask9Description,
        type: 'manual',
        priority: 'low',
        status: 'pending',
        assignedTo: t.michaelBauer,
        category: t.communication,
       createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
       history: []
      }
    ];
    
    console.log('Creating 9 test tasks:', sampleTasks.length);
    setShowSampleTasks(true);
  };

  const handleResetTasks = () => {
    loadCallbacks();
  };

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

  const handleStartTaskFromNotification = (task: Task) => {
    // This will be handled by TaskFocusedView, we just need to scroll to it
    const element = document.getElementById('task-focused-view');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Routing logic
  const urlParams = new URLSearchParams(window.location.search);
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
          showSampleTasks={showSampleTasks}
          setShowSampleTasks={setShowSampleTasks}
          createTestTasks={createTestTasks}
          handleResetTasks={handleResetTasks}
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
  showSampleTasks: boolean;
  setShowSampleTasks: (show: boolean) => void;
  createTestTasks: () => void;
  handleResetTasks: () => void;
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
  showSampleTasks,
  setShowSampleTasks,
  createTestTasks,
  handleResetTasks,
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
            onClick={handleResetTasks}
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

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-gray-900">Zarządzanie danymi</h3>
                  <p className="text-sm text-gray-500">
                    Dane z API ({tasks.length} {tasks.length === 1 ? 'kontakt' : 'kontaktów'}) - ostatnie odświeżenie: {lastRefresh.toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={() => setShowSampleTasks(!showSampleTasks)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  {showSampleTasks ? t.hideSampleTasks : t.showSampleTasks}
                </button>
              </div>
              
              {showSampleTasks && (
                <div className="mb-4">
                  <button
                    onClick={createTestTasks}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                  >
                    <span>🔄</span>
                    <span>Dodaj przykładowe zadania</span>
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Dodaje 9 przykładowych zadań do testowania funkcjonalności
                  </p>
                </div>
              )}
              
              <button
                onClick={handleResetTasks}
                className="px-4 py-2 text-white rounded-lg transition-colors flex items-center space-x-2"
                style={{ backgroundColor: '#AB4D95' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9A3D85'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#AB4D95'}
              >
                <span>🔄</span>
                <span>Odśwież dane z API</span>
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Przeładowuje najnowsze dane z Sunshine API
              </p>
            </div>
          </div>
        </main>
      </div>

    </div>
  );
};

export default App;