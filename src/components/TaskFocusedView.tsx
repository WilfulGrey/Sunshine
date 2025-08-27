import React, { useState, useEffect } from 'react';
import { Clock, User, CheckCircle2, Pause, AlertTriangle, ArrowRight, ExternalLink, Phone, X, Skull, XCircle, Eye, Plus, Trash2, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTimezone } from '../contexts/TimezoneContext';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Task } from '../types/Task';
import { formatDate, isOverdue } from '../utils/helpers';
import { useTaskActions } from '../hooks/useTaskActions';
import { useDialogState } from '../hooks/useDialogState';
import { getTypeIcon, getTypeColor, getPriorityColor, getProcessedTasks } from '../utils/taskUtils';
import { CompletionDialog } from './dialogs/CompletionDialog';
import { AbandonDialog } from './dialogs/AbandonDialog';
import { TransferDialog } from './dialogs/TransferDialog';
import { PostponeDialog } from './dialogs/PostponeDialog';

interface TaskFocusedViewProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onLoadContacts?: () => void;
  onSilentRefresh?: () => void;
  availableUsers?: string[];
}

export const TaskFocusedView: React.FC<TaskFocusedViewProps> = ({ tasks, onUpdateTask, onLoadContacts, onSilentRefresh, availableUsers = [] }) => {
  const { t } = useLanguage();
  const { timezone } = useTimezone();
  const { users, getUserDisplayName } = useUsers();
  const { user } = useAuth();
  
  // console.log('🎯 TaskFocusedView: Hooks initialized, user:', !!user);
  
  // Debug: Simple test to see if component loads
  if (tasks.length > 0) {
    // console.log('🔍 TaskFocusedView DEBUG: First task title:', tasks[0]?.title || 'NO TITLE');
  }
  
  const taskActions = useTaskActions(tasks, onUpdateTask, onLoadContacts, onSilentRefresh);
  const dialogState = useDialogState();
  const [showFutureTasks, setShowFutureTasks] = useState(false);

  // 🚀 REAL-TIME MVP: Listen for task assignments and refresh focused task + list
  useEffect(() => {
    console.log('🎯 TaskFocusedView: useEffect called - supabase:', !!supabase, 'user:', !!user);
    if (!supabase || !user) {
      console.log('🎯 TaskFocusedView: Skipping real-time - Supabase not available or user not logged in');
      return;
    }

    console.log('🎯 TaskFocusedView: Setting up real-time listener for focused task updates');
    
    const channel = supabase.channel('task-events-global');
    
    channel.on(
      'broadcast',
      { event: 'task-update' },
      async (payload) => {
        console.log('🔥 BROADCAST RECEIVED:', payload);
        console.log('🎯 TaskFocusedView: Received real-time event:', payload);
        
        const eventType = payload.payload?.type || 'task-update';
        console.log(`🔄 Processing ${eventType} event`);
        
        // Add small delay to ensure broadcast is processed
        setTimeout(() => {
          if (eventType === 'task-transfer') {
            // Handle task transfer: someone transferred a task
            const { toUser, fromUser } = payload.payload || {};
            const currentUserName = user?.user_metadata?.full_name || user?.email || '';
            
            if (toUser === currentUserName) {
              console.log('📥 Task transferred TO me - full refresh needed');
              onLoadContacts && onLoadContacts(); // Full refresh - new task assigned to me
            } else {
              console.log('📤 Task transferred to someone else - silent refresh');
              onSilentRefresh && onSilentRefresh(); // Silent refresh - task reassigned elsewhere
            }
          } else if (eventType === 'task-unassign') {
            // Handle task unassign: someone unassigned themselves
            console.log('🔓 Task unassigned - full refresh needed (task became available)');
            onLoadContacts && onLoadContacts(); // Full refresh - task became available
          } else {
            // Default logic for regular task-update events
            console.log('🔄 Smart solution: Intelligent refresh based on task assignment status');
            const currentTask = tasks[0];
            const isTaskUnassigned = !currentTask || (!currentTask.assignedTo || currentTask.assignedTo.trim() === '');
            
            if (isTaskUnassigned) {
              console.log('⚠️ Task was unassigned - full refresh needed (potential conflict)');
              onLoadContacts && onLoadContacts(); // Full refresh with spinners - user might have conflict
            } else {
              console.log('✅ Task was assigned - silent background refresh only');
              onSilentRefresh && onSilentRefresh(); // Silent refresh without loading states
            }
          }
        }, 500);
      }
    );

    // Subscribe to channel
    channel.subscribe((status) => {
      console.log('🎯 TaskFocusedView: Real-time subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ TaskFocusedView: Successfully subscribed to realtime channel');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ TaskFocusedView: Channel subscription error - checking auth');
        console.error('❌ User email:', user?.email);
        console.error('❌ Channel config: private channels require proper auth');
      } else if (status === 'CLOSED') {
        console.log('🔒 TaskFocusedView: Channel closed - will reconnect');
      }
    });

    // Cleanup function
    return () => {
      console.log('🎯 TaskFocusedView: Cleaning up real-time listener');
      supabase.removeChannel(channel);
    };
  }, [user, onLoadContacts]); // Depend on user and onLoadContacts
  const [editingWklejka, setEditingWklejka] = useState<string | null>(null);
  const [wklejkaInput, setWklejkaInput] = useState('');

  // EMERGENCY DEBUG: Log current user name
  if (typeof window !== 'undefined' && user?.email?.includes('info')) {
    console.log(`🚨 USER B DEBUG: currentUserName="${taskActions.currentUserName}", tasks=${tasks.length}`);
  }
  
  const { nextTask, upcomingTasks, hiddenFutureTasksCount } = getProcessedTasks(tasks, taskActions.currentUserName, taskActions.takenTasks, showFutureTasks);

  const isWklejkaOld = (wklejkaDate?: Date): boolean => {
    if (!wklejkaDate) return false;
    const now = new Date();
    const diffHours = (now.getTime() - wklejkaDate.getTime()) / (1000 * 60 * 60);
    return diffHours > 24;
  };

  const handleStartEditingWklejka = (taskId: string, currentUrl?: string) => {
    setEditingWklejka(taskId);
    setWklejkaInput(currentUrl || '');
  };

  const handleSaveWklejka = async (taskId: string) => {
    try {
      const currentTask = tasks.find(t => t.id === taskId);
      const now = new Date();
      
      await onUpdateTask(taskId, {
        airtableUpdates: {
          'Wklejka': wklejkaInput || null,
          'Data wklejki': wklejkaInput ? now.toISOString() : null
        },
        airtableData: {
          ...currentTask?.airtableData,
          wklejkaUrl: wklejkaInput || undefined,
          wklejkaDate: wklejkaInput ? now : undefined
        }
      } as any);
      
      setEditingWklejka(null);
      setWklejkaInput('');
    } catch (error) {
      console.error('Failed to update wklejka:', error);
    }
  };

  const handleCancelEditingWklejka = () => {
    setEditingWklejka(null);
    setWklejkaInput('');
  };

  const handleRemoveWklejka = async (taskId: string) => {
    try {
      const currentTask = tasks.find(t => t.id === taskId);
      const currentFailedCount = currentTask?.airtableData?.nieudaneWklejki || 0;
      const newFailedCount = currentFailedCount + 1;
      
      console.log('🗑️ Removing wklejka:', {
        taskId,
        currentFailedCount,
        newFailedCount,
        currentUrl: currentTask?.airtableData?.wklejkaUrl
      });
      
      await onUpdateTask(taskId, {
        airtableUpdates: {
          'Wklejka': '', // Pusty string zamiast null
          'Ile nieudanych wklejek': newFailedCount
        },
        airtableData: {
          ...currentTask?.airtableData,
          wklejkaUrl: undefined,
          nieudaneWklejki: newFailedCount
          // Data wklejki zostaje bez zmian
        }
      } as any);
      
      console.log('✅ Wklejka removed successfully');
    } catch (error) {
      console.error('❌ Failed to remove wklejka:', error);
    }
  };



  const handleStartTask = (task: Task) => {
    dialogState.openPhoneDialog(task);
  };

  const handlePhoneCall = (reachable: boolean) => {
    if (!dialogState.showPhoneDialog) return;
    
    taskActions.handlePhoneCall(dialogState.showPhoneDialog, reachable);
    dialogState.closePhoneDialog();
  };

  const handleCompleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      dialogState.openCompletionDialog(task);
    }
  };

  const handlePostponeTask = (taskId: string) => {
    dialogState.openPostponeDialog(taskId);
  };

  const handlePostponeConfirm = () => {
    if (dialogState.showPostponeDialog && dialogState.postponeDate && dialogState.postponeTime) {
      const task = tasks.find(t => t.id === dialogState.showPostponeDialog);
      if (task) {
        taskActions.handlePostponeTask(
          task,
          dialogState.postponeDate,
          dialogState.postponeTime,
          dialogState.postponeNotes
        );
      }
      dialogState.closePostponeDialog();
    }
  };


  const handleCompletionConfirm = () => {
    if (!dialogState.showCompletionDialog) return;
    
    taskActions.handleCompleteTask(
      dialogState.showCompletionDialog,
      dialogState.completionSummary
    );
    dialogState.closeCompletionDialog();
  };

  const handleAbandonConfirm = () => {
    if (!dialogState.showAbandonDialog) return;
    
    taskActions.handleAbandonTask(
      dialogState.showAbandonDialog,
      dialogState.abandonReason
    );
    dialogState.closeAbandonDialog();
  };

  const handleTransferTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      dialogState.openTransferDialog(task);
    }
  };

  const handleTransferConfirm = () => {
    if (!dialogState.showTransferDialog || !dialogState.transferToUser) return;
    
    taskActions.handleTransferTask(
      dialogState.showTransferDialog,
      dialogState.transferToUser,
      dialogState.transferReason
    );
    dialogState.closeTransferDialog();
  };

  const handleUnassignTask = () => {
    if (!dialogState.showTransferDialog) return;
    
    taskActions.handleUnassignTask(dialogState.showTransferDialog);
    dialogState.closeTransferDialog();
  };


  const handleAbandonTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      dialogState.openAbandonDialog(task);
    }
  };






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
              <span className="text-sm font-bold">{t.urgent}</span>
              <button
                onClick={() => taskActions.handleRemoveUrgent(nextTask.id)}
                className="ml-2 p-1 hover:bg-red-200 rounded-full transition-colors"
                title={t.removeUrgentStatus}
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
                {/* console.log('=== DEBUG PREVIOUS RECOMMENDATION ===', nextTask.airtableData.previousRecommendation) */}
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

            {/* Linki z Airtable - widoczne zawsze do testów */}
            {nextTask.airtableData && (nextTask.airtableData.profileLink || nextTask.airtableData.retellLink || nextTask.airtableData.jobLink || nextTask.airtableData.wklejkaUrl) && (
              <div className="flex items-center space-x-3 mb-6">
                {nextTask.airtableData.profileLink && (
                  <a
                    href={nextTask.airtableData.profileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>{t.profilePortalLink}</span>
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
                    <span>{t.dashboardRetellLink}</span>
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
                    <span>{t.jobLink}</span>
                  </a>
                )}
                {nextTask.airtableData.wklejkaUrl && (
                  <a
                    href={nextTask.airtableData.wklejkaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      isWklejkaOld(nextTask.airtableData.wklejkaDate)
                        ? 'bg-red-100 text-red-700 hover:bg-red-200 ring-2 ring-red-400'
                        : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                    }`}
                    title={
                      isWklejkaOld(nextTask.airtableData.wklejkaDate)
                        ? t.wklejkaOldWarning
                        : 'Wklejka'
                    }
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>
                      Wklejka
                      {isWklejkaOld(nextTask.airtableData.wklejkaDate) && ' ⚠️'}
                    </span>
                  </a>
                )}
              </div>
            )}

            {/* Edycja wklejki */}
            {nextTask.airtableData && (
              <div className="mb-6">
                {/* Licznik nieudanych wklejek */}
                {(nextTask.airtableData.nieudaneWklejki || 0) > 0 && (
                  <div className="mb-3 text-sm text-gray-600">
                    <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded-full">
                      ⚠️ {t.failedWklejka} {nextTask.airtableData.nieudaneWklejki}
                    </span>
                  </div>
                )}
                
                {editingWklejka === nextTask.id ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="url"
                      value={wklejkaInput}
                      onChange={(e) => setWklejkaInput(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveWklejka(nextTask.id);
                        } else if (e.key === 'Escape') {
                          handleCancelEditingWklejka();
                        }
                      }}
                    />
                    <button
                      onClick={() => handleSaveWklejka(nextTask.id)}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      ✓
                    </button>
                    <button
                      onClick={handleCancelEditingWklejka}
                      className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleStartEditingWklejka(nextTask.id, nextTask.airtableData?.wklejkaUrl)}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{nextTask.airtableData.wklejkaUrl ? t.editWklejka : t.addWklejka}</span>
                    </button>
                    
                    {nextTask.airtableData.wklejkaUrl && (
                      <button
                        onClick={() => handleRemoveWklejka(nextTask.id)}
                        className="inline-flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                        title={t.removeWklejka}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
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
                  {taskActions.canTakeTask(nextTask) ? (
                    <button
                      disabled={taskActions.takingTask === nextTask.id}
                      onClick={() => taskActions.handleTakeTask(nextTask.id)}
                      className="px-6 py-3 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: '#AB4D95' }}
                      onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#9A3D85')}
                      onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#AB4D95')}
                    >
                      <User className="h-5 w-5" />
                      <span>{taskActions.takingTask === nextTask.id ? t.taking : t.take}</span>
                    </button>
                  ) : taskActions.isTaskVerifying(nextTask) ? (
                    <div className="px-6 py-3 bg-yellow-100 text-yellow-800 rounded-lg font-medium flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                      <span>{t.verifyingAssignment}</span>
                    </div>
                  ) : taskActions.isTaskFailed(nextTask) ? (
                    <div className="px-6 py-3 bg-red-100 text-red-800 rounded-lg font-medium flex items-center space-x-2">
                      <XCircle className="h-5 w-5" />
                      <span>{t.assignmentFailed}</span>
                    </div>
                  ) : taskActions.isTaskAssignedToSomeoneElse(nextTask) ? (
                    <div className="px-6 py-3 bg-gray-100 text-gray-600 rounded-lg font-medium flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>{t.assignedTo.replace('{name}', Array.isArray(nextTask.airtableData?.user) ? nextTask.airtableData.user.join(', ') : (nextTask.assignedTo || nextTask.airtableData?.user))}</span>
                    </div>
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
                        <span>{t.transfer}</span>
                      </button>
                      
                      <button
                        onClick={() => handleAbandonTask(nextTask.id)}
                        className="px-6 py-3 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors flex items-center space-x-2"
                      >
                        <Skull className="h-5 w-5" />
                        <span>{t.abandon}</span>
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
                    <span>{t.transfer}</span>
                  </button>
                  
                  <button
                    onClick={() => handleAbandonTask(nextTask.id)}
                    className="px-6 py-3 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors flex items-center space-x-2"
                  >
                    <Skull className="h-5 w-5" />
                    <span>{t.abandon}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Tasks */}
      {(upcomingTasks.length > 0 || hiddenFutureTasksCount > 0) && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>{t.upcomingTasks}</span>
              <span className="text-sm font-normal text-gray-500">({upcomingTasks.length})</span>
            </h3>
            
            {hiddenFutureTasksCount > 0 && !showFutureTasks && (
              <button
                onClick={() => setShowFutureTasks(true)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1"
              >
                <Eye className="h-4 w-4" />
                <span>Pokaż {hiddenFutureTasksCount} starszych zadań</span>
              </button>
            )}
            
            {showFutureTasks && (
              <button
                onClick={() => setShowFutureTasks(false)}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center space-x-1"
              >
                <X className="h-4 w-4" />
                <span>Ukryj starsze zadania</span>
              </button>
            )}
          </div>
          
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
                        <button
                          onClick={() => taskActions.handleBoostUrgent(task.id)}
                          disabled={taskActions.boostingTask === task.id}
                          className="p-1 text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                          title="Przenieś zadanie na pierwszą pozycję"
                        >
                          {taskActions.boostingTask === task.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => taskActions.handleBoostPriority(task.id)}
                          disabled={taskActions.boostingTask === task.id}
                          className="p-1 text-gray-400 hover:text-purple-600 transition-colors disabled:opacity-50"
                          title="Osoba dzwoni - przenieś na pierwszą pozycję"
                        >
                          {taskActions.boostingTask === task.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Phone className="h-4 w-4" />
                          )}
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
      {dialogState.showPhoneDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📞</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.startCall}</h3>
              <p className="text-gray-600 mb-4">{dialogState.showPhoneDialog.title}</p>
              
              {/* Phone Number Display */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">{t.phoneNumber}</p>
                <a 
                  href={`tel:${taskActions.extractPhoneNumber(dialogState.showPhoneDialog).replace(/\s/g, '')}`}
                  className="text-2xl font-bold text-blue-600 hover:text-blue-800 transition-colors block"
                >
                  {taskActions.extractPhoneNumber(dialogState.showPhoneDialog)}
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
                onClick={dialogState.closePhoneDialog}
                className="w-full px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Abandon Contact Dialog */}
      {dialogState.showAbandonDialog && (
        <AbandonDialog
          task={dialogState.showAbandonDialog}
          abandonReason={dialogState.abandonReason}
          setAbandonReason={dialogState.setAbandonReason}
          onConfirm={handleAbandonConfirm}
          onClose={dialogState.closeAbandonDialog}
        />
      )}

      {/* Transfer Dialog */}
      {dialogState.showTransferDialog && (
        <TransferDialog
          task={dialogState.showTransferDialog}
          transferToUser={dialogState.transferToUser}
          setTransferToUser={dialogState.setTransferToUser}
          transferReason={dialogState.transferReason}
          setTransferReason={dialogState.setTransferReason}
          currentUserName={taskActions.currentUserName}
          availableUsers={availableUsers}
          onConfirm={handleTransferConfirm}
          onUnassign={handleUnassignTask}
          onClose={dialogState.closeTransferDialog}
        />
      )}

      {/* Postpone Dialog */}
      {dialogState.showPostponeDialog && (
        <PostponeDialog
          postponeDate={dialogState.postponeDate}
          setPostponeDate={dialogState.setPostponeDate}
          postponeTime={dialogState.postponeTime}
          setPostponeTime={dialogState.setPostponeTime}
          postponeNotes={dialogState.postponeNotes}
          setPostponeNotes={dialogState.setPostponeNotes}
          onConfirm={handlePostponeConfirm}
          onClose={dialogState.closePostponeDialog}
        />
      )}

      {/* Completion Summary Dialog */}
      {dialogState.showCompletionDialog && (
        <CompletionDialog
          task={dialogState.showCompletionDialog}
          completionSummary={dialogState.completionSummary}
          setCompletionSummary={dialogState.setCompletionSummary}
          onConfirm={handleCompletionConfirm}
          onClose={dialogState.closeCompletionDialog}
        />
      )}
    </div>
  );
};