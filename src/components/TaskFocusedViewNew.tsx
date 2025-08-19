import React from 'react';
import { Clock, User, Bot, Zap, CheckCircle2, Pause, AlertTriangle, ArrowRight, XCircle, ExternalLink, Phone, X, Skull } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTimezone } from '../contexts/TimezoneContext';
import { useUsers } from '../hooks/useUsers';
import { Task } from '../types/Task';
import { formatDate, isOverdue, addHistoryEntry } from '../utils/helpers';

interface TaskFocusedViewProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
}

export const TaskFocusedView: React.FC<TaskFocusedViewProps> = ({ tasks, onUpdateTask }) => {
  const { t } = useLanguage();
  const { timezone } = useTimezone();
  const { user } = useAuth();
  const { users, getUserDisplayName } = useUsers();
  const [showPostponeDialog, setShowPostponeDialog] = React.useState<string | null>(null);
  const [postponeDate, setPostponeDate] = React.useState('');
  const [postponeTime, setPostponeTime] = React.useState('');
  const [postponeNotes, setPostponeNotes] = React.useState('');
  const [showPhoneDialog, setShowPhoneDialog] = React.useState<Task | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = React.useState<Task | null>(null);
  const [completionSummary, setCompletionSummary] = React.useState('');
  const [showAbandonDialog, setShowAbandonDialog] = React.useState<Task | null>(null);
  const [abandonReason, setAbandonReason] = React.useState('');
  const [showTransferDialog, setShowTransferDialog] = React.useState<Task | null>(null);
  const [transferToUser, setTransferToUser] = React.useState('');
  const [transferReason, setTransferReason] = React.useState('');
  const [takenTasks, setTakenTasks] = React.useState<Set<string>>(new Set());
  const [takingTask, setTakingTask] = React.useState<string | null>(null);

  // Get current user's full name for comparison
  const currentUserName = user?.user_metadata?.full_name || user?.email || 'Nieznany użytkownik';
  
  // Filter and sort tasks by priority and due date
  const activeTasks = tasks.filter(task => {
    // Exclude completed and cancelled tasks
    if (task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }
    
    // Check if task is assigned to someone else
    const isAssignedToSomeoneElse = (
      // Check assignedTo field
      (task.assignedTo && task.assignedTo !== currentUserName) ||
      // Check airtableData.user field (can be array or string)
      (task.airtableData?.user && (
        Array.isArray(task.airtableData.user) 
          ? !task.airtableData.user.includes(currentUserName)
          : task.airtableData.user !== currentUserName
      ))
    );
    
    // If task is assigned to someone else, hide it completely
    if (isAssignedToSomeoneElse) {
      return false;
    }
    
    // Show task if it's not assigned or assigned to current user
    return true;
  });
  
  const sortedTasks = [...activeTasks].sort((a, b) => {
    // Sort by status - in_progress tasks ALWAYS come first
    if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
    if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
    
    // TYLKO dla zadań które zostały ręcznie "boosted" (kliknięte w czerwony wykrzyknik w ostatnich 5 minutach)
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Sprawdź czy zadanie zostało ręcznie "boosted" - ma bardzo świeżą datę (ostatnie 5 min) I flagę urgent
    const aRecentlyBoosted = a.dueDate && a.dueDate >= fiveMinutesAgo && a.dueDate <= now && a.airtableData?.urgent;
    const bRecentlyBoosted = b.dueDate && b.dueDate >= fiveMinutesAgo && b.dueDate <= now && b.airtableData?.urgent;
    
    if (aRecentlyBoosted && !bRecentlyBoosted) return -1;
    if (!aRecentlyBoosted && bRecentlyBoosted) return 1;
    
    // GŁÓWNE SORTOWANIE: tylko według dat kontaktu (dueDate)
    if (a.dueDate && b.dueDate) {
      // Sortuj według daty kontaktu - wcześniejsze pierwsze
      return a.dueDate.getTime() - b.dueDate.getTime();
    }
    
    // Zadania z datą idą przed zadaniami bez daty
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    
    // Jeśli oba nie mają daty, sortuj według priorytetu
    if (!a.dueDate && !b.dueDate) {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    
    return 0;
  });

  const nextTask = sortedTasks[0];
  const upcomingTasks = sortedTasks.slice(1); // All remaining tasks

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'manual': return User;
      case 'voicebot': return Bot;
      case 'automatic': return Zap;
      default: return User;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'manual': return 'bg-blue-100 text-blue-700';
      case 'voicebot': return 'bg-purple-100 text-purple-700';
      case 'automatic': return 'bg-green-100 text-green-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'urgent': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Extract phone number from task title or description
  const extractPhoneNumber = (task: Task): string => {
    // Użyj numeru telefonu z danych Airtable jeśli dostępny
    if (task.airtableData?.phoneNumber) {
      return task.airtableData.phoneNumber;
    }
    
    // Fallback - spróbuj wyciągnąć z tytułu
    const name = task.title.split(' - ')[0];
    
    return '+48 XXX XXX XXX';
  };

  const handleStartTask = (task: Task) => {
    // Show manual phone dialog
    setShowPhoneDialog(task);
  };

  const handlePhoneCall = (reachable: boolean) => {
    if (!showPhoneDialog) return;
    
    let updatedTask = showPhoneDialog;
    
    if (reachable) {
      // Add history entry for reachable
      updatedTask = addHistoryEntry(updatedTask, 'reachable', t.callSuccessfulDetails);
      onUpdateTask(showPhoneDialog.id, { 
        status: 'in_progress',
        history: updatedTask.history
      });
    } else {
      // Add history entry for not reachable and update Airtable
      updatedTask = addHistoryEntry(updatedTask, 'not_reachable', t.callUnsuccessfulDetails);
      
      // Calculate new call time (1 hour from now in Warsaw timezone)
      const now = new Date();
      const warsawTime = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // CEST is UTC+2
      const newCallTime = new Date(warsawTime.getTime() + (60 * 60 * 1000)); // Add 1 hour
      
      onUpdateTask(showPhoneDialog.id, {
        status: 'pending', // Keep as pending for retry
        dueDate: newCallTime, // Set new call time
        description: (showPhoneDialog.description || '') + '\n\n[Nicht erreicht - ' + now.toLocaleString('de-DE') + ' - Wiedervorlage: ' + newCallTime.toLocaleString('de-DE') + ']',
        history: updatedTask.history,
        // Flag to update Airtable
        airtableUpdates: {
          'User': user?.email || undefined
        }
      });
    }
    setShowPhoneDialog(null);
  };

  const handleCompleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setShowCompletionDialog(task);
      setCompletionSummary('');
    }
  };

  const handlePostponeTask = (taskId: string) => {
    setShowPostponeDialog(taskId);
    setPostponeNotes('');
    // Set default to tomorrow at 9 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    setPostponeDate(tomorrow.toISOString().slice(0, 10));
    setPostponeTime('09:00');
  };

  const handlePostponeConfirm = () => {
    if (showPostponeDialog && postponeDate && postponeTime) {
      const task = tasks.find(t => t.id === showPostponeDialog);
      if (task) {
        console.log('=== ALGORYTM UTC ===');
        console.log('1. Wartość z kontrolki:', postponeTime);
        
        // 1. Weź dokładnie wartość z kontrolki
        const [hours, minutes] = postponeTime.split(':').map(Number);
        const [year, month, day] = postponeDate.split('-').map(Number);
        console.log('2. Sparsowane:', { hours, minutes, day, month, year });
        
        // 2. Sprawdź ustawienie strefy czasowej aplikacji
        const timezoneOffset = getTimezoneOffsetHours(timezone);
        console.log('3. Strefa czasowa:', timezone, 'Offset:', timezoneOffset);
        
        // 3. Wykonaj działanie matematyczne: czas lokalny - offset = UTC
        const utcHours = hours - timezoneOffset;
        console.log('4. Działanie matematyczne:', hours, '-', timezoneOffset, '=', utcHours);
        
        // 4. Zapisz do bazy wartość przeliczoną (UTC)
        const utcDateTime = new Date(Date.UTC(year, month - 1, day, utcHours, minutes));
        console.log('5. Zapisuję do bazy UTC:', utcDateTime.toISOString());
        console.log('=== KONIEC ALGORYTMU ===');
        
        const updatedTask = addHistoryEntry(task, 'postponed', t.postponeDetails.replace('{date}', utcDateTime.toLocaleString('de-DE', { timeZone: timezone })));
        onUpdateTask(showPostponeDialog, {
          status: 'pending', // Reset to pending so it can be started again
          dueDate: utcDateTime,
          history: updatedTask.history,
          airtableUpdates: postponeNotes ? {
            'Następne kroki': postponeNotes
          } : undefined
        });
      }
      setShowPostponeDialog(null);
      setPostponeDate('');
      setPostponeTime('');
      setPostponeNotes('');
    }
  };

  // Helper function to get timezone offset in hours (GMT+2 = 2)
  const getTimezoneOffsetHours = (tz: string): number => {
    // Używamy prostej metody z getTimezoneOffset() dla aktualnej daty
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const targetTime = new Date(utcTime + (3600000 * getOffsetForTimezone(tz)));
    
    return getOffsetForTimezone(tz);
  };

  // Helper function to get standard offset for common timezones
  const getOffsetForTimezone = (tz: string): number => {
    const offsets: { [key: string]: number } = {
      'Europe/Warsaw': 2,    // CEST (summer time)
      'Europe/Berlin': 2,    // CEST (summer time)
      'Europe/London': 1,    // BST (summer time)
      'America/New_York': -4, // EDT (summer time)
      'America/Los_Angeles': -7, // PDT (summer time)
      'Asia/Tokyo': 9,
      'Australia/Sydney': 10,
      'UTC': 0
    };
    
    // For winter time, subtract 1 hour for European timezones
    const now = new Date();
    const isWinter = now.getMonth() < 2 || now.getMonth() > 9; // Rough approximation
    
    if (tz.startsWith('Europe/') && isWinter && tz !== 'UTC') {
      return (offsets[tz] || 0) - 1;
    }
    
    return offsets[tz] || 0;
  };

  const handleCompletionConfirm = () => {
    if (!showCompletionDialog) return;
    
    const updatedTask = addHistoryEntry(showCompletionDialog, 'completed', `Zadanie zakończone: ${completionSummary || 'Brak dodatkowych uwag'}`);
    
    onUpdateTask(showCompletionDialog.id, {
      status: 'completed',
      history: updatedTask.history,
      airtableUpdates: {
        'Status': 'kontakt udany',
        'Następne kroki': completionSummary
      }
    });
    
    setShowCompletionDialog(null);
    setCompletionSummary('');
  };

  const handleAbandonConfirm = () => {
    if (!showAbandonDialog) return;
    
    const updatedTask = addHistoryEntry(showAbandonDialog, 'cancelled', `Kontakt porzucony: ${abandonReason || 'Brak dodatkowych uwag'}`);
    
    onUpdateTask(showAbandonDialog.id, {
      status: 'cancelled',
      history: updatedTask.history,
      airtableUpdates: {
        'Status': 'porzucony',
        'Następne kroki': abandonReason
      }
    });
    
    setShowAbandonDialog(null);
    setAbandonReason('');
  };

  const handleTransferTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setShowTransferDialog(task);
      setTransferToUser('');
      setTransferReason('');
    }
  };

  const handleTransferConfirm = () => {
    if (!showTransferDialog || !transferToUser) return;
    
    const updatedTask = addHistoryEntry(showTransferDialog, 'created', `Zadanie przekazane do: ${transferToUser}. Powód: ${transferReason || 'Brak dodatkowych uwag'}`);
    
    onUpdateTask(showTransferDialog.id, {
      assignedTo: transferToUser,
      status: 'pending',
      history: updatedTask.history,
      airtableUpdates: {
        'User': [transferToUser],
        'Następne kroki': transferReason
      }
    });
    
    setShowTransferDialog(null);
    setTransferToUser('');
    setTransferReason('');
  };

  const handleTakeTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Prevent double-clicking
    if (takingTask === taskId) {
      console.log('⏳ Already taking this task...');
      return;
    }
    
    setTakingTask(taskId);
    
    // Get current user info
    const userName = user?.user_metadata?.full_name || user?.email || 'Nieznany użytkownik';
    
    try {
      // Add to taken tasks set optimistically
      console.log('👤 Taking task as user:', currentUserName);
      console.log('📋 Task before update:', {
        id: task.id,
        title: task.title,
        assignedTo: task.assignedTo,
        airtableRecordId: task.airtableData?.recordId
      });
      setTakenTasks(prev => new Set([...prev, taskId]));
      
      // Update task with user assignment but keep status as pending
      const updatedTask = addHistoryEntry(task, 'created', `Zadanie przypisane do: ${userName}`);
      
      await onUpdateTask(taskId, {
        status: 'pending', // Keep as pending, don't activate yet
        assignedTo: userName,
        history: updatedTask.history,
        airtableUpdates: {
          'User': userName ? [userName] : undefined
        }
      });
      
      console.log('✅ Successfully took task:', taskId);
      
    } catch (error) {
      console.error('❌ Failed to take task:', error);
      
      // Remove from taken tasks set on error
      setTakenTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
      
      // Show error message to user
      if (error instanceof Error) {
        alert(`Nie udało się przypisać zadania: ${error.message}`);
      } else {
        alert('Nie udało się przypisać zadania. Spróbuj ponownie.');
      }
    } finally {
      setTakingTask(null);
    }
  };

  const handleAbandonTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setShowAbandonDialog(task);
      setAbandonReason('');
    }
  };

  const handleBoostPriority = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      return;
    }
    
    // First, reset current active task (if any) back to pending
    const currentActiveTask = tasks.find(t => t.status === 'in_progress');
    if (currentActiveTask) {
      const resetTask = addHistoryEntry(currentActiveTask, 'started', 'Zadanie wstrzymane - priorytet przejęła inna osoba');
      
      // Update current active task first
      const resetUpdates = {
        status: 'pending',
        priority: currentActiveTask.priority === 'urgent' ? 'high' : currentActiveTask.priority,
        history: resetTask.history
      };
      onUpdateTask(currentActiveTask.id, resetUpdates);
    }
    
    // Then boost the selected task to top priority and active state immediately
    const now = new Date();
    const updatedTask = addHistoryEntry(task, 'started', 'Zadanie rozpoczęte - osoba dzwoni');
    
    const boostUpdates = {
      priority: 'urgent' as const,
      dueDate: now,
      status: 'in_progress' as const,
      history: updatedTask.history,
      airtableUpdates: {
        'kiedy dzwonić': now.toISOString()
      }
    };
    onUpdateTask(taskId, boostUpdates);
  };

  const handleBoostUrgent = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      return;
    }
    
    // Boost the urgent task to top priority and current time
    const now = new Date();
    const updatedTask = addHistoryEntry(task, 'started', 'Pilny kontakt - przeniesiony na górę listy');
    
    const boostUpdates = {
      priority: 'urgent' as const,
      dueDate: now,
      history: updatedTask.history,
      airtableUpdates: {
        'kiedy dzwonić': now.toISOString()
      }
    };
    onUpdateTask(taskId, boostUpdates);
  };

  const handleRemoveUrgent = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      return;
    }
    
    // Update task to remove urgent status
    const updatedTask = addHistoryEntry(task, 'started', 'Usunięto status pilny');
    
    const updates = {
      // Remove urgent flag locally
      airtableData: {
        ...task.airtableData,
        urgent: false
      },
      history: updatedTask.history,
      airtableUpdates: {
        'Urgent': false // Remove the urgent flag in Airtable
      }
    };
    onUpdateTask(taskId, updates);
  };

  // Check if current user is assigned to the task
  const isTaskAssignedToMe = (task: Task): boolean => {
    return (
      task.assignedTo === currentUserName ||
      (task.airtableData?.user && (
        Array.isArray(task.airtableData.user) 
          ? task.airtableData.user.includes(currentUserName)
          : task.airtableData.user === currentUserName
      )) ||
      takenTasks.has(task.id)
    );
  };

  // Available users for transfer (excluding current user)
  const availableUsers = [
    'Maria Schmidt',
    'Thomas Weber', 
    'Anna Müller',
    'Michael Bauer',
    'Sandra Koch',
    'Michał Kępiński',
    'Administrator Mamamia'
  ].filter(user => user !== currentUserName);

  if (!nextTask) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t.allTasksCompleted}</h3>
        <p className="text-gray-500">{t.greatWork}</p>
      </div>
    );
  }

  const TypeIcon = getTypeIcon(nextTask.type);
  const isNextTaskOverdue = nextTask.dueDate && isOverdue(nextTask.dueDate);

  return (
    <div className="space-y-8">
      {/* Next Task - Hero Section */}
      <div className={`bg-white rounded-xl border-2 p-8 ${
        isNextTaskOverdue ? 'border-red-300 bg-red-50' : 'border-purple-200'
      }`}>
        <div className="flex items-center space-x-3 mb-4">
          {nextTask.airtableData?.urgent && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-700 rounded-full relative group">
              <span className="text-lg">🚨</span>
              <span className="text-sm font-bold">PILNE</span>
              <button
                onClick={() => handleRemoveUrgent(nextTask.id)}
                className="ml-2 p-1 hover:bg-red-200 rounded-full transition-colors"
                title="Usuń status pilny"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(nextTask.priority)}`}>
            {nextTask.priority === 'low' ? t.low : 
             nextTask.priority === 'medium' ? t.medium : 
             nextTask.priority === 'high' ? t.high : t.urgent}
          </span>
          {nextTask.dueDate && (
            <div className={`flex items-center space-x-2 ${isNextTaskOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
              <Clock className="h-4 w-4" />
              <span className="text-sm">{formatDate(nextTask.dueDate, t, timezone)}</span>
              {isNextTaskOverdue && <AlertTriangle className="h-4 w-4" />}
            </div>
          )}
          {isNextTaskOverdue && (
            <span className="text-red-600 font-semibold">{t.overdue}</span>
          )}
        </div>

        <div className="flex items-start space-x-6">
          <div className={`p-4 rounded-xl ${getTypeColor(nextTask.type)}`}>
            <TypeIcon className="h-8 w-8" />
          </div>

          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{nextTask.title}</h3>

            {nextTask.description && (
              <p className="text-gray-700 text-lg mb-4">{nextTask.description}</p>
            )}

            {/* Poprzednie rekomendacje z Airtable */}
            {nextTask.airtableData?.previousRecommendation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                {console.log('=== DEBUG PREVIOUS RECOMMENDATION ===', nextTask.airtableData.previousRecommendation)}
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm">💡</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Notatka Agenta:</h4>
                    <p className="text-blue-800 text-sm leading-relaxed whitespace-pre-wrap">
                      {nextTask.airtableData.previousRecommendation}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Następne kroki z Airtable */}
            {nextTask.airtableData?.nextSteps && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-sm">📝</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-900 mb-2">Następne kroki:</h4>
                    <p className="text-green-800 text-sm leading-relaxed whitespace-pre-wrap">
                      {nextTask.airtableData.nextSteps}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Linki z Airtable */}
            {nextTask.airtableData && (nextTask.airtableData.profileLink || nextTask.airtableData.retellLink || nextTask.airtableData.jobLink) && (
              <div className="flex items-center space-x-3 mb-6">
                {nextTask.airtableData.profileLink && (
                  <a
                    href={nextTask.airtableData.profileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Profil w portalu MM</span>
                  </a>
                )}
                {nextTask.airtableData.retellLink && (
                  <a
                    href={nextTask.airtableData.retellLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Dashboard Retell</span>
                  </a>
                )}
                {nextTask.airtableData.jobLink && (
                  <a
                    href={nextTask.airtableData.jobLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Link do JOBa</span>
                  </a>
                )}
              </div>
            )}

            {nextTask.category && nextTask.category !== 'Matching & Kontakt' && nextTask.category !== t.matchingContact && (
              <div className="mb-6">
                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                  {nextTask.category}
                </span>
              </div>
            )}

            <div className="flex space-x-3">
              {nextTask.status === 'pending' && (
                <>
                  {!isTaskAssignedToMe(nextTask) ? (
                    <button
                      disabled={takingTask === nextTask.id}
                      onClick={() => handleTakeTask(nextTask.id)}
                      className="px-6 py-3 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: '#AB4D95' }}
                      onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#9A3D85')}
                      onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#AB4D95')}
                    >
                      <User className="h-5 w-5" />
                      <span>{takingTask === nextTask.id ? 'Przypisuję...' : 'Biorę'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStartTask(nextTask)}
                        className="px-6 py-3 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                        style={{ backgroundColor: '#AB4D95' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9A3D85'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#AB4D95'}
                      >
                        <Phone className="h-5 w-5" />
                        <span>{t.startNow}</span>
                      </button>
                      
                      <button
                        onClick={() => handlePostponeTask(nextTask.id)}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center space-x-2"
                      >
                        <Pause className="h-5 w-5" />
                        <span>{t.postpone}</span>
                      </button>
                      
                      <button
                        onClick={() => handleTransferTask(nextTask.id)}
                        className="px-6 py-3 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors flex items-center space-x-2"
                      >
                        <ArrowRight className="h-5 w-5" />
                        <span>Transfer</span>
                      </button>
                      
                      <button
                        onClick={() => handleAbandonTask(nextTask.id)}
                        className="px-6 py-3 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors flex items-center space-x-2"
                      >
                        <Skull className="h-5 w-5" />
                        <span>Porzuć kontakt</span>
                      </button>
                    </>
                  )}
                </>
              )}
              
              {nextTask.status === 'in_progress' && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleCompleteTask(nextTask.id)}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    <span>{t.complete}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <span>{t.upcomingTasks}</span>
            <span className="text-sm font-normal text-gray-500">({upcomingTasks.length})</span>
          </h3>
          
          <div className="space-y-3">
            {upcomingTasks.map((task, index) => {
              const TaskTypeIcon = getTypeIcon(task.type);
              const taskOverdue = task.dueDate && isOverdue(task.dueDate);
              
              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-lg border p-4 hover:shadow-md transition-all ${
                    taskOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-sm font-medium text-gray-400 w-6">#{index + 2}</span>
                      
                      <div className={`p-2 rounded-lg ${getTypeColor(task.type)}`}>
                        <TaskTypeIcon className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
                          {task.airtableData?.urgent && (
                            <span className="text-red-500 text-lg" title="Pilne zadanie z Airtable">🚨</span>
                          )}
                          {taskOverdue && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          {task.dueDate && (
                            <div className={`flex items-center space-x-1 ${taskOverdue ? 'text-red-600' : ''}`}>
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(task.dueDate, t, timezone)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority === 'low' ? t.low.replace('🟢 ', '') : 
                         task.priority === 'medium' ? t.medium.replace('🟡 ', '') : 
                         task.priority === 'high' ? t.high.replace('🟠 ', '') : t.urgent.replace('🔴 ', '')}
                      </span>
                      
                      <div className="flex items-center space-x-1">
                        {task.airtableData?.urgent && (
                          <button
                            onClick={() => handleBoostUrgent(task.id)}
                            className="p-1 text-red-500 hover:text-red-700 transition-colors"
                            title="Pilny kontakt - przenieś na pierwszą pozycję"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleBoostPriority(task.id)}
                          className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                          title="Osoba dzwoni - przenieś na pierwszą pozycję"
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Phone Call Dialog */}
      {showPhoneDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📞</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.startCall}</h3>
              <p className="text-gray-600 mb-4">{showPhoneDialog.title}</p>
              
              {/* Phone Number Display */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">{t.phoneNumber}</p>
                <a 
                  href={`tel:${extractPhoneNumber(showPhoneDialog).replace(/\s/g, '')}`}
                  className="text-2xl font-bold text-blue-600 hover:text-blue-800 transition-colors block"
                >
                  {extractPhoneNumber(showPhoneDialog)}
                </a>
                <p className="text-xs text-gray-500 mt-2">{t.clickToCall}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-center text-gray-700 font-medium">{t.wasPersonReachable}</p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => handlePhoneCall(true)}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  <span>{t.yesReachable}</span>
                </button>
                
                <button
                  onClick={() => handlePhoneCall(false)}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <XCircle className="h-5 w-5" />
                  <span>{t.notReachable}</span>
                </button>
              </div>
              
              <button
                onClick={() => setShowPhoneDialog(null)}
                className="w-full px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Abandon Contact Dialog */}
      {showAbandonDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Skull className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Porzuć kontakt</h3>
              <p className="text-gray-600 mb-4">{showAbandonDialog.title}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Powód porzucenia kontaktu:
              </label>
              <textarea
                rows={4}
                value={abandonReason}
                onChange={(e) => setAbandonReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Opisz dlaczego kontakt został porzucony (np. niewłaściwa osoba, brak zainteresowania, inne powody)..."
              />
              <p className="text-xs text-gray-500 mt-2">
                Ten komentarz zostanie zapisany w polu "Następne kroki" w Airtable
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <div className="flex items-center space-x-2">
                <Skull className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800 font-medium">
                  Status zostanie zmieniony na "porzucony"
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAbandonDialog(null);
                  setAbandonReason('');
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Anuluj
              </button>
              
              <button
                onClick={handleAbandonConfirm}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Skull className="h-5 w-5" />
                <span>Porzuć kontakt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Dialog */}
      {showTransferDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowRight className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Transfer zadania</h3>
              <p className="text-gray-600 mb-4">{showTransferDialog.title}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Przekaż do użytkownika: *
                </label>
                <select
                  value={transferToUser}
                  onChange={(e) => setTransferToUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Wybierz użytkownika...</option>
                  {users
                    .filter(u => getUserDisplayName(u) !== currentUserName)
                    .map(user => (
                      <option key={user.id} value={getUserDisplayName(user)}>
                        {getUserDisplayName(user)}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Powód transferu:
                </label>
                <textarea
                  rows={3}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Opisz dlaczego przekazujesz to zadanie..."
                />
              </div>
            </div>

            {transferToUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <div className="flex items-center space-x-2">
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Zadanie zostanie przekazane do: <strong>{transferToUser}</strong>
                  </span>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowTransferDialog(null);
                  setTransferToUser('');
                  setTransferReason('');
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Anuluj
              </button>
              
              <button
                onClick={handleTransferConfirm}
                disabled={!transferToUser}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowRight className="h-5 w-5" />
                <span>Przekaż zadanie</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Postpone Dialog */}
      {showPostponeDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.setPostpone}</h3>
            
            {/* Notes Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notatka z rozmowy:
              </label>
              <textarea
                rows={3}
                value={postponeNotes}
                onChange={(e) => setPostponeNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Opisz powód przełożenia, ustalenia z rozmowy..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Ta notatka zostanie zapisana w polu "Następne kroki" w Airtable
              </p>
            </div>

            {/* Preset Options */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t.quickSelection}
              </label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => {
                    const now = new Date();
                    now.setHours(now.getHours() + 1);
                    setPostponeDate(now.toISOString().slice(0, 10));
                    setPostponeTime(now.toTimeString().slice(0, 5));
                  }}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {t.in1Hour}
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    now.setHours(now.getHours() + 2);
                    setPostponeDate(now.toISOString().slice(0, 10));
                    setPostponeTime(now.toTimeString().slice(0, 5));
                  }}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {t.in2Hours}
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    now.setDate(now.getDate() + 1);
                    now.setHours(9, 0, 0, 0);
                    setPostponeDate(now.toISOString().slice(0, 10));
                    setPostponeTime('09:00');
                  }}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {t.tomorrow9}
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    now.setDate(now.getDate() + 1);
                    now.setHours(14, 0, 0, 0);
                    setPostponeDate(now.toISOString().slice(0, 10));
                    setPostponeTime('14:00');
                  }}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {t.tomorrow14}
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    const monday = new Date(now);
                    const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7;
                    monday.setDate(now.getDate() + daysUntilMonday);
                    monday.setHours(9, 0, 0, 0);
                    setPostponeDate(monday.toISOString().slice(0, 10));
                    setPostponeTime('09:00');
                  }}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {t.nextWeek}
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    now.setDate(now.getDate() + 7);
                    now.setHours(9, 0, 0, 0);
                    setPostponeDate(now.toISOString().slice(0, 10));
                    setPostponeTime('09:00');
                  }}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {t.in1Week}
                </button>
              </div>
            </div>

            {/* Custom Date and Time Pickers */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.orSelectCustomTime}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Datum</label>
                  <input
                    type="date"
                    value={postponeDate}
                    onChange={(e) => setPostponeDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Uhrzeit</label>
                  <div className="flex space-x-1">
                    <select
                      value={postponeTime.split(':')[0] || '09'}
                      onChange={(e) => {
                        const minutes = postponeTime.split(':')[1] || '00';
                        setPostponeTime(`${e.target.value}:${minutes}`);
                      }}
                      className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-center"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i.toString().padStart(2, '0')}>
                          {i.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <span className="flex items-center text-gray-500 font-medium">:</span>
                    <select
                      value={postponeTime.split(':')[1] || '00'}
                      onChange={(e) => {
                        const hours = postponeTime.split(':')[0] || '09';
                        setPostponeTime(`${hours}:${e.target.value}`);
                      }}
                      className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-center"
                    >
                      {Array.from({ length: 60 }, (_, i) => (
                        <option key={i} value={i.toString().padStart(2, '0')}>
                          {i.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPostponeDialog(null);
                  setPostponeDate('');
                  setPostponeTime('');
                  setPostponeNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handlePostponeConfirm}
                disabled={!postponeDate || !postponeTime}
                className="px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#AB4D95' }}
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#9A3D85')}
                onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#AB4D95')}
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Summary Dialog */}
      {showCompletionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.completeTask}</h3>
              <p className="text-gray-600 mb-4">{showCompletionDialog.title}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Podsumowanie rozmowy:
              </label>
              <textarea
                rows={4}
                value={completionSummary}
                onChange={(e) => setCompletionSummary(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                placeholder="Opisz wynik rozmowy, ustalenia, następne kroki..."
              />
              <p className="text-xs text-gray-500 mt-2">
                Ten komentarz zostanie zapisany w polu "Następne kroki" w Airtable
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800 font-medium">
                  Status zostanie zmieniony na "kontakt udany"
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCompletionDialog(null);
                  setCompletionSummary('');
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Anuluj
              </button>
              
              <button
                onClick={handleCompletionConfirm}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="h-5 w-5" />
                <span>Zakończ zadanie</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};