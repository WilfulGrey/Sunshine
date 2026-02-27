import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, User, CheckCircle2, Pause, AlertTriangle, ArrowRight, Phone, X, Skull, XCircle, Eye, Loader2, RefreshCw, ExternalLink, MessageSquare, ScrollText, Heart } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Task } from '../types/Task';
import { formatDate, isOverdue } from '../utils/helpers';
import { useTaskActions } from '../hooks/useTaskActions';
import { sunshineService } from '../services/sunshineService';
import { useDialogState } from '../hooks/useDialogState';
import { useActivityRefresh } from '../hooks/useActivityRefresh';
import { useVisibilityRefresh } from '../hooks/useVisibilityRefresh';
import { useSmartPolling } from '../hooks/useSmartPolling';
import { getTypeIcon, getTypeColor, getPriorityColor, getProcessedTasks, isTaskDueToday } from '../utils/taskUtils';
import { CompletionDialog } from './dialogs/CompletionDialog';
import { AbandonDialog } from './dialogs/AbandonDialog';
import { TransferDialog } from './dialogs/TransferDialog';
import { PostponeDialog } from './dialogs/PostponeDialog';
import { LogsDialog } from './dialogs/LogsDialog';
import { CloseTaskDialog } from './dialogs/CloseTaskDialog';
import { SunshineLog, SimilarJob } from '../services/sunshineService';

interface TaskFocusedViewProps {
  tasks: Task[];
  onUpdateLocalTask: (taskId: string, updates: Partial<Task>) => void;
  onRemoveLocalTask: (taskId: string) => void;
  onLoadContacts?: () => void;
  onSilentRefresh?: () => void;
  availableUsers?: string[];
}

export const TaskFocusedView: React.FC<TaskFocusedViewProps> = ({ tasks, onUpdateLocalTask, onRemoveLocalTask, onLoadContacts, onSilentRefresh, availableUsers = [] }) => {
  const { t } = useLanguage();
  const { users, getUserDisplayName } = useUsers();
  const { user } = useAuth();
  
  // console.log('🎯 TaskFocusedView: Hooks initialized, user:', !!user);
  
  // Debug: Simple test to see if component loads
  if (tasks.length > 0) {
    // console.log('🔍 TaskFocusedView DEBUG: First task title:', tasks[0]?.title || 'NO TITLE');
  }
  
  const taskActions = useTaskActions(tasks, onUpdateLocalTask, onRemoveLocalTask, onLoadContacts, onSilentRefresh);
  const dialogState = useDialogState();
  const [showFutureTasks, setShowFutureTasks] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);

  // 🛡️ Track if any dialog is open - blocks refresh to prevent state overwrite
  const isAnyDialogOpenRef = useRef(false);
  isAnyDialogOpenRef.current = !!(
    dialogState.showPhoneDialog ||
    dialogState.showCompletionDialog ||
    dialogState.showCloseTaskDialog ||
    dialogState.showAbandonDialog ||
    dialogState.showTransferDialog ||
    dialogState.showPostponeDialog ||
    showLogsDialog
  );

  // 🚀 SMART REFRESH INTEGRATION - FIXED INFINITE LOOP
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  
  // 🛡️ BOOST DISABLE REFRESH: Wyłącza refresh dopóki user nie weźmie zadania
  const [refreshDisabledAfterBoost, setRefreshDisabledAfterBoost] = useState(false);
  
  // Manual refresh handler (stable reference to avoid re-renders)
  const handleManualRefresh = useCallback(async () => {
    if (isManualRefreshing) return;
    
    setIsManualRefreshing(true);
    setRefreshError(null);
    
    try {
      if (onLoadContacts) {
        await onLoadContacts();
      }
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Manual refresh failed:', error);
      setRefreshError(t.refreshError || 'Błąd podczas odświeżania');
    } finally {
      setIsManualRefreshing(false);
    }
  }, [isManualRefreshing, onLoadContacts, t.refreshError]);

  // Activity detection (stable callback)
  const handleActivityRefresh = useCallback(async () => {
    // 🛡️ WYŁĄCZ REFRESH gdy dialog otwarty lub po boost
    if (refreshDisabledAfterBoost || isAnyDialogOpenRef.current) {
      console.log('🚫 Activity refresh DISABLED - dialog otwarty lub boost');
      return;
    }
    
    if (onSilentRefresh) {
      await onSilentRefresh();
      setLastUpdateTime(new Date()); // Update timestamp after successful refresh
    }
  }, [onSilentRefresh, refreshDisabledAfterBoost]);

  // Visibility refresh (stable callback)
  const handleVisibilityRefresh = useCallback(async () => {
    // 🛡️ WYŁĄCZ REFRESH gdy dialog otwarty lub po boost
    if (refreshDisabledAfterBoost || isAnyDialogOpenRef.current) {
      console.log('🚫 Visibility refresh DISABLED - dialog otwarty lub boost');
      return;
    }
    
    if (onSilentRefresh) {
      await onSilentRefresh();
      setLastUpdateTime(new Date()); // Update timestamp after successful refresh
    }
  }, [onSilentRefresh, refreshDisabledAfterBoost]);

  // Polling refresh (stable callback)
  const handlePollingRefresh = useCallback(async () => {
    // 🛡️ WYŁĄCZ REFRESH gdy dialog otwarty lub po boost
    if (refreshDisabledAfterBoost || isAnyDialogOpenRef.current) {
      console.log('🚫 Polling refresh DISABLED - dialog otwarty lub boost');
      return;
    }
    
    if (onSilentRefresh) {
      await onSilentRefresh();
      setLastUpdateTime(new Date()); // Update timestamp after successful refresh
    }
  }, [onSilentRefresh, refreshDisabledAfterBoost]);

  // Now use the hooks with stable callbacks (prevents infinite loops)
  useActivityRefresh(handleActivityRefresh, 5 * 60 * 1000); // 5 minutes inactivity threshold
  useVisibilityRefresh(handleVisibilityRefresh, 30000); // 30 second minimum interval
  const pollingState = useSmartPolling(handlePollingRefresh, {
    activeInterval: 30000, // 30 seconds when user active
    idleInterval: 120000, // 2 minutes when idle
    minInterval: 10000,   // 10 seconds minimum
    maxInterval: 300000,  // 5 minutes maximum
    backoffMultiplier: 2,
    maxRetries: 3
  }, true);

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
          if (isAnyDialogOpenRef.current) {
            console.log('🚫 Real-time refresh BLOCKED - dialog is open');
            return;
          }

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
  // EMERGENCY DEBUG: Log current user name
  if (typeof window !== 'undefined' && user?.email?.includes('info')) {
    console.log(`🚨 USER B DEBUG: currentUserName="${taskActions.currentUserName}", tasks=${tasks.length}`);
  }
  
  // Fetch latest contact note from logs - single source of truth
  const CONTACT_TITLES = ['Note Only', 'Contact successfully', 'Contact not successfully'];
  const [latestNote, setLatestNote] = useState<{ content: string; author: string; date: string } | null>(null);
  const latestNoteRef = useRef(latestNote);
  latestNoteRef.current = latestNote;

  const findLatestContactNote = (logs: SunshineLog[]) => {
    return logs.find(log => CONTACT_TITLES.includes(log.title)) || null;
  };

  const logToNote = (log: SunshineLog) => ({
    content: log.content,
    author: log.custom_author_name || (log.author ? `${log.author.first_name} ${log.author.last_name}`.trim() : ''),
    date: log.created_at,
  });

  // Retry-based refresh: keeps fetching until API returns a newer note than what we currently have
  const refreshLatestNote = useCallback(async (caregiverId: number, maxRetries = 5) => {
    const currentContent = latestNoteRef.current?.content || '';
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
      try {
        const response = await sunshineService.getLogs(caregiverId, 1, 10);
        const contactNote = response.data.find(
          (log: SunshineLog) => CONTACT_TITLES.includes(log.title)
        );
        if (contactNote && contactNote.content !== currentContent) {
          setLatestNote(logToNote(contactNote));
          return;
        }
      } catch (err) {
        console.error('Failed to refresh latest note (attempt', attempt + 1, '):', err);
      }
    }
  }, []);

  // Interest job offer ID - fetched from logs when callbackSource is "Interest"
  const [interestJobOfferId, setInterestJobOfferId] = useState<number | null>(null);
  const [jobActive, setJobActive] = useState<boolean | null>(null);
  const [similarJobs, setSimilarJobs] = useState<SimilarJob[]>([]);
  const [jobStatusLoading, setJobStatusLoading] = useState(false);

  // Logs dialog state (declared here so logsData etc. are available below)
  const [logsData, setLogsData] = useState<SunshineLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsLoadingMore, setLogsLoadingMore] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsHasMore, setLogsHasMore] = useState(false);

  const { nextTask, upcomingTasks, hiddenFutureTasksCount } = getProcessedTasks(tasks, taskActions.takenTasks, taskActions.currentEmployeeId, showFutureTasks);

  useEffect(() => {
    const caregiverId = nextTask?.apiData?.caregiverId;
    if (!caregiverId) {
      setLatestNote(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await sunshineService.getLogs(caregiverId, 1, 10);
        if (!cancelled) {
          const contactNote = response.data.find(
            (log: SunshineLog) => CONTACT_TITLES.includes(log.title)
          );
          if (contactNote) {
            setLatestNote(logToNote(contactNote));
          } else {
            setLatestNote(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch latest note:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [nextTask?.id, nextTask?.apiData?.caregiverId]);


  // Fetch job_offer_id from logs when callback source is Interest
  useEffect(() => {
    const caregiverId = nextTask?.apiData?.caregiverId;
    const callbackSource = nextTask?.apiData?.callbackSource;

    if (!caregiverId || callbackSource !== 'Interest') {
      setInterestJobOfferId(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await sunshineService.getLogs(caregiverId, 1, 25);
        if (!cancelled) {
          const interestLog = response.data.find(
            (log: SunshineLog) => log.title === 'interest' && log.job_offer_id
          );
          setInterestJobOfferId(interestLog?.job_offer_id ?? null);
        }
      } catch (err) {
        console.error('Failed to fetch interest log:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [nextTask?.id, nextTask?.apiData?.caregiverId, nextTask?.apiData?.callbackSource]);

  // Check job status and fetch similar jobs when interestJobOfferId is available
  useEffect(() => {
    const caregiverId = nextTask?.apiData?.caregiverId;

    if (interestJobOfferId === null || !caregiverId) {
      setJobActive(null);
      setSimilarJobs([]);
      setJobStatusLoading(false);
      return;
    }

    let cancelled = false;
    setJobStatusLoading(true);
    setJobActive(null);
    setSimilarJobs([]);

    (async () => {
      try {
        const status = await sunshineService.checkJobStatus(interestJobOfferId);
        if (cancelled) return;
        setJobActive(status.active);

        if (!status.active) {
          try {
            const similar = await sunshineService.getSimilarJobs(caregiverId, interestJobOfferId);
            if (!cancelled) {
              setSimilarJobs(similar.slice(0, 3));
            }
          } catch (similarErr) {
            console.error('Failed to fetch similar jobs:', similarErr);
          }
        }
      } catch (err) {
        console.error('Failed to check job status:', err);
        if (!cancelled) {
          setJobActive(null);
        }
      } finally {
        if (!cancelled) {
          setJobStatusLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [interestJobOfferId, nextTask?.apiData?.caregiverId]);

  const handleOpenLogs = useCallback(async () => {
    const caregiverId = nextTask?.apiData?.caregiverId;
    if (!caregiverId) return;

    setShowLogsDialog(true);
    setLogsLoading(true);
    setLogsData([]);
    setLogsPage(1);

    try {
      const response = await sunshineService.getLogs(caregiverId, 1, 25);
      setLogsData(response.data);
      setLogsHasMore(response.meta.current_page < response.meta.last_page);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [nextTask?.apiData?.caregiverId]);

  const handleLoadMoreLogs = useCallback(async () => {
    const caregiverId = nextTask?.apiData?.caregiverId;
    if (!caregiverId || logsLoadingMore) return;

    const nextPage = logsPage + 1;
    setLogsLoadingMore(true);

    try {
      const response = await sunshineService.getLogs(caregiverId, nextPage, 25);
      setLogsData(prev => [...prev, ...response.data]);
      setLogsPage(nextPage);
      setLogsHasMore(response.meta.current_page < response.meta.last_page);
    } catch (err) {
      console.error('Failed to fetch more logs:', err);
    } finally {
      setLogsLoadingMore(false);
    }
  }, [nextTask?.apiData?.caregiverId, logsPage, logsLoadingMore]);

  const handleStartTask = (task: Task) => {
    onUpdateLocalTask(task.id, { status: 'in_progress' });
    dialogState.openPhoneDialog(task);
  };

  const handlePhoneCall = (reachable: boolean) => {
    if (!dialogState.showPhoneDialog) return;

    const task = dialogState.showPhoneDialog;
    const caregiverId = task.apiData?.caregiverId;
    taskActions.handlePhoneCall(task, reachable).then(() => {
      if (!reachable && caregiverId) {
        refreshLatestNote(caregiverId);
      }
    });
    dialogState.closePhoneDialog();

    if (reachable) {
      // Immediately open the conversation summary dialog
      dialogState.openCompletionDialog(task);
    } else {
      setRefreshDisabledAfterBoost(false);
      console.log('✅ REFRESH ENABLED po phone call (nie odebrał)');
    }
  };

  const handleCompleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      dialogState.openCloseTaskDialog(task);
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
      setRefreshDisabledAfterBoost(false);
      console.log('✅ REFRESH ENABLED po postpone - user odłożył zadanie');
    }
  };


  const handleCloseTaskConfirm = (reason: string, notes: string) => {
    if (!dialogState.showCloseTaskDialog) return;

    taskActions.handleCloseTask(
      dialogState.showCloseTaskDialog,
      reason,
      notes
    );
    dialogState.closeCloseTaskDialog();
    setRefreshDisabledAfterBoost(false);
  };

  const handleCompletionConfirm = () => {
    if (!dialogState.showCompletionDialog) return;

    const caregiverId = dialogState.showCompletionDialog.apiData?.caregiverId;
    taskActions.handleCompleteTask(
      dialogState.showCompletionDialog,
      dialogState.completionSummary
    ).then(() => {
      if (caregiverId) {
        refreshLatestNote(caregiverId);
      }
    });
    dialogState.closeCompletionDialog();
    setRefreshDisabledAfterBoost(false);
  };

  const handleCompletionBack = () => {
    if (!dialogState.showCompletionDialog) return;
    const task = dialogState.showCompletionDialog;
    dialogState.closeCompletionDialog();
    dialogState.openPhoneDialog(task);
  };

  const handleAbandonConfirm = () => {
    if (!dialogState.showAbandonDialog) return;
    
    taskActions.handleAbandonTask(
      dialogState.showAbandonDialog,
      dialogState.abandonReason
    );
    dialogState.closeAbandonDialog();
    setRefreshDisabledAfterBoost(false);
    console.log('✅ REFRESH ENABLED po abandon - user porzucił zadanie');
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
    setRefreshDisabledAfterBoost(false);
    console.log('✅ REFRESH ENABLED po transfer - user przekazał zadanie');
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
    <div className="space-y-8" data-testid="task-focused-view">
      {/* Smart Refresh Controls - FIXED INFINITE LOOP */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleManualRefresh}
            disabled={isManualRefreshing}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isManualRefreshing 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
            }`}
            data-testid="manual-refresh-button"
          >
            {isManualRefreshing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t.loading || 'Ładowanie...'}</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>{t.refresh || 'Odśwież'}</span>
              </>
            )}
          </button>
          
          {refreshError && (
            <div className="text-red-600 text-sm font-medium">
              {refreshError}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600" data-testid="last-update-timestamp">
            {t.lastUpdated || 'Ostatnia aktualizacja'}: {lastUpdateTime.toLocaleTimeString()}
          </div>
          
          {pollingState && (
            <div 
              className={`w-3 h-3 rounded-full transition-all ${
                pollingState.errorCount > 0 
                  ? 'bg-red-400 animate-pulse' 
                  : pollingState.isActive 
                    ? 'bg-green-400 animate-pulse' 
                    : 'bg-yellow-400'
              }`}
              data-testid="auto-refresh-indicator"
              title={`Smart refresh: ${pollingState.isActive ? 'Active' : 'Idle'} (${pollingState.errorCount} errors)`}
            />
          )}
        </div>
      </div>

      {/* Next Task - Hero Section */}
      <div className={`bg-white rounded-xl border-2 p-8 ${
        isNextTaskOverdue ? 'border-red-300 bg-red-50' : 'border-purple-200'
      } ${!isTaskDueToday(nextTask, 'Europe/Warsaw') && !isNextTaskOverdue ? 'task-inactive' : ''}`}>
        <div className="flex items-center space-x-3 mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(nextTask.priority)}`}>
            {nextTask.priority === 'low' ? t.low : 
             nextTask.priority === 'medium' ? t.medium : 
             nextTask.priority === 'high' ? t.high : t.urgent}
          </span>
          {nextTask.dueDate && (
            <div className={`flex items-center space-x-2 ${isNextTaskOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
              <Clock className="h-4 w-4" />
              <span className="text-sm">{formatDate(nextTask.dueDate, t, 'Europe/Warsaw')}</span>
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

            {/* Profile / Chat / Logs links */}
            {nextTask.apiData?.caregiverId && (
              <div className="flex items-center space-x-4 mb-3" data-testid="caregiver-links">
                <a
                  href={`https://portal.mamamia.app/caregiver-agency/caregivers/${nextTask.apiData.caregiverId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-sm font-medium transition-colors hover:underline"
                  style={{ color: '#AB4D95' }}
                  data-testid="profile-link"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Profil</span>
                </a>
                <a
                  href={`https://portal.mamamia.app/caregiver-agency/messages/${nextTask.apiData.caregiverId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-sm font-medium transition-colors hover:underline"
                  style={{ color: '#AB4D95' }}
                  data-testid="chat-link"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat</span>
                </a>
                <button
                  onClick={handleOpenLogs}
                  className="inline-flex items-center space-x-1 text-sm font-medium transition-colors hover:underline"
                  style={{ color: '#AB4D95' }}
                  data-testid="logs-button"
                >
                  <ScrollText className="h-4 w-4" />
                  <span>Notatki</span>
                </button>
              </div>
            )}

            {/* Latest contact note - prefer rich display from logs, fall back to task.description */}
            {latestNote ? (() => {
              const noteDate = new Date(latestNote.date && !latestNote.date.endsWith('Z') && latestNote.date.includes('T') ? latestNote.date + 'Z' : latestNote.date);
              const ageDays = Math.floor((Date.now() - noteDate.getTime()) / 86400000);
              const formattedDate = noteDate.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
              const isOld = ageDays > 30;
              const isStale = ageDays > 7 && ageDays <= 30;
              const bgColor = isOld ? 'bg-gray-100' : isStale ? 'bg-amber-50' : 'bg-blue-50';
              const borderColor = isOld ? 'border-gray-300' : isStale ? 'border-amber-200' : 'border-blue-200';
              const iconBg = isOld ? 'bg-gray-200' : isStale ? 'bg-amber-100' : 'bg-blue-100';
              const titleColor = isOld ? 'text-gray-700' : isStale ? 'text-amber-900' : 'text-blue-900';
              const textColor = isOld ? 'text-gray-600' : isStale ? 'text-amber-800' : 'text-blue-800';
              const dateColor = isOld ? 'text-gray-500' : isStale ? 'text-amber-600' : 'text-blue-600';
              return (
              <div className={`${bgColor} border ${borderColor} rounded-lg p-4 mb-6`} data-testid="agent-note">
                <div className="flex items-start space-x-2">
                  <div className={`w-6 h-6 ${iconBg} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    {isOld ? <AlertTriangle className="h-3.5 w-3.5 text-gray-500" /> : <span className={`${isStale ? 'text-amber-600' : 'text-blue-600'} text-sm`}>💡</span>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between flex-wrap gap-1 mb-2">
                      <h4 className={`font-medium ${titleColor}`}>
                        Notatka Agenta{latestNote.author ? ` (${latestNote.author})` : ''}:
                      </h4>
                      <span className={`text-xs ${dateColor}`}>{formattedDate}</span>
                    </div>
                    {isOld && <p className="text-xs text-gray-500 font-medium mb-1">⚠ Stara notatka</p>}
                    {isStale && <p className={`text-xs ${dateColor} mb-1`}>{ageDays} dni temu</p>}
                    <p className={`${textColor} text-sm leading-relaxed whitespace-pre-wrap`}>
                      {latestNote.content}
                    </p>
                  </div>
                </div>
              </div>
              );
            })() : nextTask.description ? (() => {
              // Try to extract date from description text like "Podsumowanie (01.12.2025 09:55 - 01.12.2025 12:42):"
              const dateMatch = nextTask.description!.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
              let descAgeDays: number | null = null;
              let descFormattedDate: string | null = null;
              if (dateMatch) {
                const descDate = new Date(Date.UTC(parseInt(dateMatch[3]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]), parseInt(dateMatch[4]), parseInt(dateMatch[5])));
                if (!isNaN(descDate.getTime())) {
                  descAgeDays = Math.floor((Date.now() - descDate.getTime()) / 86400000);
                  descFormattedDate = descDate.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                }
              }
              const isOld = descAgeDays !== null && descAgeDays > 30;
              const isStale = descAgeDays !== null && descAgeDays > 7 && descAgeDays <= 30;
              const bgColor = isOld ? 'bg-gray-100' : isStale ? 'bg-amber-50' : 'bg-blue-50';
              const borderColor = isOld ? 'border-gray-300' : isStale ? 'border-amber-200' : 'border-blue-200';
              const iconBg = isOld ? 'bg-gray-200' : isStale ? 'bg-amber-100' : 'bg-blue-100';
              const titleColor = isOld ? 'text-gray-700' : isStale ? 'text-amber-900' : 'text-blue-900';
              const textColor = isOld ? 'text-gray-600' : isStale ? 'text-amber-800' : 'text-blue-800';
              const dateColor = isOld ? 'text-gray-500' : isStale ? 'text-amber-600' : 'text-blue-600';
              return (
              <div className={`${bgColor} border ${borderColor} rounded-lg p-4 mb-6`} data-testid="agent-note">
                <div className="flex items-start space-x-2">
                  <div className={`w-6 h-6 ${iconBg} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    {isOld ? <AlertTriangle className="h-3.5 w-3.5 text-gray-500" /> : <span className={`${isStale ? 'text-amber-600' : 'text-blue-600'} text-sm`}>💡</span>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between flex-wrap gap-1 mb-2">
                      <h4 className={`font-medium ${titleColor}`}>
                        Notatka Agenta:
                      </h4>
                      {descFormattedDate && <span className={`text-xs ${dateColor}`}>{descFormattedDate}</span>}
                    </div>
                    {isOld && <p className="text-xs text-gray-500 font-medium mb-1">⚠ Stara notatka</p>}
                    {isStale && descAgeDays !== null && <p className={`text-xs ${dateColor} mb-1`}>{descAgeDays} dni temu</p>}
                    <p className={`${textColor} text-sm leading-relaxed whitespace-pre-wrap`}>
                      {nextTask.description}
                    </p>
                  </div>
                </div>
              </div>
              );
            })() : null}

            {/* Callback source info */}
            {nextTask.apiData?.callbackSource && nextTask.apiData.callbackSource === 'Interest' ? (
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-6" data-testid="interest-block">
                <div className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-pink-500" />
                  <span className="font-medium text-pink-800">Zainteresowanie zleceniem</span>
                </div>
                {interestJobOfferId && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <a
                        href={`https://portal.mamamia.app/caregiver-agency/job-market/${interestJobOfferId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-sm text-pink-600 hover:text-pink-800 hover:underline"
                        data-testid="interest-job-offer-link"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Zobacz zlecenie #{interestJobOfferId}</span>
                      </a>
                      {jobStatusLoading && (
                        <Loader2 className="h-4 w-4 text-pink-400 animate-spin" data-testid="job-status-loading" />
                      )}
                      {!jobStatusLoading && jobActive === true && (
                        <span className="inline-flex items-center space-x-1 text-sm text-green-700" data-testid="job-status-active">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Zlecenie aktywne</span>
                        </span>
                      )}
                      {!jobStatusLoading && jobActive === false && (
                        <span className="inline-flex items-center space-x-1 text-sm text-red-600" data-testid="job-status-inactive">
                          <XCircle className="h-4 w-4" />
                          <span>Zlecenie nieaktywne</span>
                        </span>
                      )}
                    </div>
                    {!jobStatusLoading && jobActive === false && similarJobs.length > 0 && (
                      <div className="mt-3" data-testid="similar-jobs">
                        <p className="text-sm font-medium text-pink-800 mb-2">Podobne aktywne zlecenia:</p>
                        <div className="space-y-2">
                          {similarJobs.map((job) => (
                            <div key={job.job_offer_id} className="flex items-center flex-wrap gap-2 bg-white border border-pink-100 rounded-md px-3 py-2">
                              <a
                                href={`https://portal.mamamia.app/caregiver-agency/job-market/${job.job_offer_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 text-sm text-pink-600 hover:text-pink-800 hover:underline"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Zlecenie #{job.job_offer_id}</span>
                              </a>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                                {job.matching_percentage}%
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${job.is_date_match ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                                📅 {job.is_date_match ? '✓' : '✗'}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${job.is_price_match ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                                💰 {job.is_price_match ? '✓' : '✗'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : nextTask.apiData?.callbackSource ? (
              <div className="mb-6">
                <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm">
                  Callback: {nextTask.apiData.callbackSource}
                </span>
              </div>
            ) : null}

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
                      onClick={() => {
                        taskActions.handleTakeTask(nextTask.id);
                        setRefreshDisabledAfterBoost(false);
                        console.log('✅ REFRESH ENABLED - user wziął zadanie, koniec disable po boost');
                      }}
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
                      <span>{t.assignedTo.replace('{name}', nextTask.assignedTo || nextTask.apiData?.recruiterName || '')}</span>
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
                  } ${!isTaskDueToday(task, 'Europe/Warsaw') && !taskOverdue ? 'task-inactive-subtle' : ''}`}
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
                          {taskOverdue && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          {task.dueDate && (
                            <div className={`flex items-center space-x-1 ${taskOverdue ? 'text-red-600' : ''}`}>
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(task.dueDate, t, 'Europe/Warsaw')}</span>
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
                      
                      {/* Boost buttons hidden for now */}
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
                onClick={() => {
                  const task = dialogState.showPhoneDialog;
                  if (task) {
                    onUpdateLocalTask(task.id, { status: 'pending' });
                  }
                  dialogState.closePhoneDialog();
                }}
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

      {/* Close Task Dialog (for "Zakończ" button) */}
      {dialogState.showCloseTaskDialog && (
        <CloseTaskDialog
          task={dialogState.showCloseTaskDialog}
          onConfirm={handleCloseTaskConfirm}
          onClose={dialogState.closeCloseTaskDialog}
        />
      )}

      {/* Completion Summary Dialog (for "Tak odebrała" flow) */}
      {dialogState.showCompletionDialog && (
        <CompletionDialog
          task={dialogState.showCompletionDialog}
          completionSummary={dialogState.completionSummary}
          setCompletionSummary={dialogState.setCompletionSummary}
          onConfirm={handleCompletionConfirm}
          onBack={handleCompletionBack}
        />
      )}

      {/* Logs History Dialog */}
      {showLogsDialog && (
        <LogsDialog
          logs={logsData}
          loading={logsLoading}
          onClose={() => setShowLogsDialog(false)}
          onLoadMore={handleLoadMoreLogs}
          hasMore={logsHasMore}
          loadingMore={logsLoadingMore}
        />
      )}
    </div>
  );
};