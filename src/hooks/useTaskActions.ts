import { useState } from 'react';
import { Task } from '../types/Task';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTimezone } from '../contexts/TimezoneContext';
import { addHistoryEntry } from '../utils/helpers';
import { AirtableService } from '../services/airtableService';
import { supabase } from '../lib/supabase';

// Using shared Supabase instance for consistent real-time channels
let globalChannel: any = null;

// Real-time event sender function will be defined INSIDE useTaskActions hook

export const useTaskActions = (
  tasks: Task[],
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void,
  onLoadContacts?: () => void,
  onSilentRefresh?: () => void
) => {
  const { t } = useLanguage();
  const { timezone } = useTimezone();
  const { user } = useAuth();
  const airtableService = new AirtableService();
  const [takenTasks, setTakenTasks] = useState<Set<string>>(new Set());
  const [takingTask, setTakingTask] = useState<string | null>(null);
  const [verifyingTasks, setVerifyingTasks] = useState<Set<string>>(new Set());
  const [failedTasks, setFailedTasks] = useState<Set<string>>(new Set());
  const [boostingTask, setBoostingTask] = useState<string | null>(null);

  const currentUserName = user?.user_metadata?.full_name || user?.email || 'Nieznany użytkownik';

  // Real-time event sender function - UNIFIED with sendEvent
  const sendRealTimeEvent = (eventData: any) => {
    if (!supabase || !user) {
      console.log('🔄 Supabase not available or user not logged in - skipping real-time event');
      return;
    }

    console.log('📤 Sending real-time event via Supabase broadcast:', eventData);
    
    // Use SAME format as sendEvent (unified implementation)
    const event = {
      type: eventData.type,
      payload: {
        taskId: eventData.taskId,
        userId: user.id,
        userName: user?.user_metadata?.full_name || user?.email || '',
        timestamp: eventData.timestamp || new Date().toISOString(),
        ...eventData
      }
    };

    console.log('📤 Sending HTTP broadcast directly...');
    const channel = supabase.channel('task-events-global');
    
    channel.send({
      type: 'broadcast',
      event: 'task-update',
      payload: event
    }).then((response) => {
      console.log('✅ HTTP broadcast sent successfully:', response);
    }).catch((error) => {
      console.error('❌ HTTP broadcast failed:', error);
    });
  };

  // Minimal real-time event sender
  const sendEvent = (eventType: string, taskId: string, additionalData: any = {}) => {
    if (!supabase || !user) {
      console.log('🔄 Supabase not available or user not logged in - skipping real-time event');
      return;
    }

    const event = {
      type: eventType,
      payload: {
        taskId,
        userId: user.id,
        userName: currentUserName,
        timestamp: new Date().toISOString(),
        ...additionalData
      }
    };

    console.log('📤 Sending minimal real-time event:', event);
    
    // SIMPLEST TEST: Direct HTTP send without subscription (from docs)
    console.log('📤 Testing simplest HTTP broadcast...');
    const channel = supabase.channel('task-events-global');
    
    console.log('📤 Sending HTTP broadcast directly...');
    channel.send({
      type: 'broadcast',
      event: 'task-update',
      payload: event  // Send entire event object with type + payload
    }).then((response) => {
      console.log('✅ HTTP broadcast sent successfully:', response);
    }).catch((error) => {
      console.error('❌ HTTP broadcast failed:', error);
    });
    
    // Clean up
    setTimeout(() => {
      console.log('🧹 Cleaning up channel...');
      supabase.removeChannel(channel);
    }, 1000);
  };

  const extractPhoneNumber = (task: Task): string => {
    if (task.airtableData?.phoneNumber) {
      return task.airtableData.phoneNumber;
    }
    return '+48 XXX XXX XXX';
  };

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

  const isTaskAssignedToSomeoneElse = (task: Task): boolean => {
    const assignedUser = task.assignedTo || task.airtableData?.user;
    
    if (!assignedUser) return false; // Nikt nie przypisany
    
    if (Array.isArray(assignedUser)) {
      return assignedUser.length > 0 && !assignedUser.includes(currentUserName);
    }
    
    return assignedUser !== currentUserName;
  };

  const canTakeTask = (task: Task): boolean => {
    return !isTaskAssignedToMe(task) && !isTaskAssignedToSomeoneElse(task) && !verifyingTasks.has(task.id) && !failedTasks.has(task.id);
  };

  const isTaskVerifying = (task: Task): boolean => {
    return verifyingTasks.has(task.id);
  };

  const isTaskFailed = (task: Task): boolean => {
    return failedTasks.has(task.id);
  };

  const handleTakeTask = async (taskId: string, skipAirtableCheck = false) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || takingTask === taskId) return;
    
    // Sprawdź czy możemy wziąć to zadanie (lokalna logika)
    if (!canTakeTask(task)) {
      if (isTaskAssignedToSomeoneElse(task)) {
        const assignedUser = task.assignedTo || task.airtableData?.user;
        alert(`To zadanie jest już przypisane do: ${Array.isArray(assignedUser) ? assignedUser.join(', ') : assignedUser}`);
      } else {
        alert('To zadanie jest już przypisane do Ciebie.');
      }
      return;
    }
    
    setTakingTask(taskId);
    const userName = user?.user_metadata?.full_name || user?.email || 'Nieznany użytkownik';
    
    try {
      // KROK 1: Sprawdź aktualny stan w Airtable przed przypisaniem (jeśli nie zostało wyłączone dla testów)
      if (!skipAirtableCheck) {
        console.log('🔍 Sprawdzam aktualny stan zadania w Airtable...', taskId);
        const freshTaskData = await airtableService.getContactById(task.id);
        
        if (!freshTaskData) {
          alert('Nie można pobrać aktualnych danych zadania. Spróbuj odświeżyć stronę.');
          return;
        }
        
        // Sprawdź czy ktoś już się przypisał w Airtable
        const currentAssignedUsers = freshTaskData.fields.User;
        console.log('🔍 Current assigned users:', currentAssignedUsers);
        
        // Sprawdź czy ktokolwiek jest przypisany (string, array z elementami, lub truthy value)
        const isAssigned = currentAssignedUsers && (
          (typeof currentAssignedUsers === 'string' && currentAssignedUsers.trim().length > 0) ||
          (Array.isArray(currentAssignedUsers) && currentAssignedUsers.length > 0)
        );
        
        if (isAssigned) {
          const assignedUsersText = Array.isArray(currentAssignedUsers) 
            ? currentAssignedUsers.join(', ') 
            : currentAssignedUsers;
            
          alert(`To zadanie zostało już przypisane do: ${assignedUsersText}\n\nStrona zostanie odświeżona aby pokazać aktualne dane.`);
          
          // Odśwież stronę
          window.location.reload();
          return;
        }
        
        console.log('✅ Zadanie wolne - można przypisać');
      }
      
      // KROK 2: Przypisz zadanie
      // Oznacz zadanie jako weryfikowane
      setVerifyingTasks(prev => new Set([...prev, taskId]));
      setTakenTasks(prev => new Set([...prev, taskId]));
      
      const updatedTask = addHistoryEntry(task, 'created', `Zadanie przypisane do: ${userName}`);
      
      await onUpdateTask(taskId, {
        status: 'pending',
        assignedTo: userName,
        history: updatedTask.history,
        airtableUpdates: {
          'User': [userName] // Mapowanie będzie wykonane w useAirtable
        }
      });

      console.log('✅ Zadanie pomyślnie przypisane i zweryfikowane');
      
      // 🚀 SEND REAL-TIME EVENT - Task assigned
      console.log('📤 About to send real-time event with:', { 
        eventType: 'task-assigned', 
        taskId, 
        additionalData: { status: 'pending', assignedTo: userName },
        currentUserName 
      });
      // Send real-time event with 0.5s delay to allow Airtable propagation
      setTimeout(() => {
        sendEvent('task-assigned', taskId, {
          status: 'pending',
          assignedTo: userName
        });
      }, 500);
      
      // Usuń z weryfikacji - sukces
      setVerifyingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
      
    } catch (error) {
      // Błąd - oznacz zadanie jako nieudane
      setVerifyingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
      
      setFailedTasks(prev => new Set([...prev, taskId]));
      
      setTakenTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
      
      if (error instanceof Error) {
        alert(`Nie udało się przypisać zadania: ${error.message}`);
      } else {
        alert('Nie udało się przypisać zadania. Spróbuj ponownie.');
      }
      
      // Wyczyść błąd po 10 sekundach
      setTimeout(() => {
        setFailedTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      }, 10000);
    } finally {
      setTakingTask(null);
    }
  };

  const handlePhoneCall = (task: Task, reachable: boolean) => {
    let updatedTask = task;
    
    if (reachable) {
      updatedTask = addHistoryEntry(updatedTask, 'reachable', t.callSuccessfulDetails);
      onUpdateTask(task.id, { 
        status: 'in_progress',
        history: updatedTask.history
      });
    } else {
      updatedTask = addHistoryEntry(updatedTask, 'not_reachable', t.callUnsuccessfulDetails);
      
      const now = new Date();
      const warsawTime = new Date(now.getTime() + (2 * 60 * 60 * 1000));
      const newCallTime = new Date(warsawTime.getTime() + (60 * 60 * 1000));
      
      // Clear boosted status when task is not reachable (end action)
      const updates: any = {
        status: 'pending',
        dueDate: newCallTime,
        description: (task.description || '') + '\n\n[Nicht erreicht - ' + now.toLocaleString('de-DE') + ' - Wiedervorlage: ' + newCallTime.toLocaleString('de-DE') + ']',
        history: updatedTask.history,
        airtableUpdates: {
          'User': user?.email || undefined
        }
      };

      // Remove boosted priority if present
      if (task.priority === 'boosted') {
        updates.priority = 'high';
      }
      
      onUpdateTask(task.id, updates);
    }
  };

  const handleCompleteTask = (task: Task, completionSummary: string) => {
    const updatedTask = addHistoryEntry(task, 'completed', `Zadanie zakończone: ${completionSummary || 'Brak dodatkowych uwag'}`);
    
    // Clear boosted status when completing task
    const updates: any = {
      status: 'completed',
      history: updatedTask.history,
      airtableUpdates: {
        'Status': 'kontakt udany',
        'Następne kroki': completionSummary
      }
    };

    // Remove boosted priority if present
    if (task.priority === 'boosted') {
      updates.priority = 'high';
    }
    
    onUpdateTask(task.id, updates);
  };

  const handleAbandonTask = (task: Task, abandonReason: string) => {
    const updatedTask = addHistoryEntry(task, 'cancelled', `Kontakt porzucony: ${abandonReason || 'Brak dodatkowych uwag'}`);
    
    // Clear boosted status when abandoning task
    const updates: any = {
      status: 'cancelled',
      history: updatedTask.history,
      airtableUpdates: {
        'Status': 'porzucony',
        'Następne kroki': abandonReason
      }
    };

    // Remove boosted priority if present
    if (task.priority === 'boosted') {
      updates.priority = 'high';
    }
    
    onUpdateTask(task.id, updates);
  };

  const handleTransferTask = (task: Task, transferToUser: string, transferReason: string) => {
    console.log('🔄 Transferring task:', {
      taskId: task.id,
      from: task.assignedTo || 'unassigned',
      to: transferToUser,
      reason: transferReason
    });
    
    const updatedTask = addHistoryEntry(task, 'created', `Zadanie przekazane do: ${transferToUser}. Powód: ${transferReason || 'Brak dodatkowych uwag'}`);
    
    // Clear boosted status when transferring task
    const updates: any = {
      assignedTo: transferToUser,
      status: 'pending',
      history: updatedTask.history,
      airtableUpdates: {
        'User': [transferToUser], // Mapowanie będzie wykonane w useAirtable
        'Następne kroki': transferReason
      }
    };

    // Remove boosted priority if present
    if (task.priority === 'boosted') {
      updates.priority = 'high';
    }
    
    onUpdateTask(task.id, updates);
    
    // Send real-time event to target user (transferred task appears as assigned to them)
    console.log('📤 About to send real-time event for task transfer');
    sendRealTimeEvent({
      type: 'task-transfer',
      taskId: task.id,
      fromUser: task.assignedTo,
      toUser: transferToUser,
      timestamp: new Date().toISOString()
    });
  };

  const handleUnassignTask = (task: Task) => {
    console.log('🔄 Unassigning task:', {
      taskId: task.id,
      from: task.assignedTo || 'unassigned'
    });
    
    const updatedTask = addHistoryEntry(task, 'created', 'Zadanie odpisane - wraca do puli dostępnych');
    
    // Clear boosted status when unassigning task
    const updates: any = {
      assignedTo: undefined,
      status: 'pending',
      history: updatedTask.history,
      airtableUpdates: {
        'User': null // Null oznacza brak przypisania
      }
    };

    // Remove boosted priority if present
    if (task.priority === 'boosted') {
      updates.priority = 'high';
    }
    
    onUpdateTask(task.id, updates);
    
    // Clear local state for this task (user no longer owns/is taking/verifying this task)
    console.log('🧹 Clearing local state for unassigned task');
    takenTasks.delete(task.id);
    setVerifyingTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(task.id);
      return newSet;
    });
    setFailedTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(task.id);
      return newSet;
    });
    
    // Send real-time event to ALL users (task becomes available) + self (refresh tasks)
    console.log('📤 About to send real-time event for task unassign');
    sendRealTimeEvent({
      type: 'task-unassign',
      taskId: task.id,
      fromUser: task.assignedTo,
      timestamp: new Date().toISOString()
    });
    
    // Trigger delayed silent refresh for the user who unassigned (no loading states)
    console.log('🔄 User who unassigned: triggering delayed silent refresh to allow Airtable propagation');
    setTimeout(() => {
      console.log('🔇 Delayed silent refresh executing - Airtable should have propagated changes');
      onSilentRefresh && onSilentRefresh();
    }, 500); // 0.5 second delay for Airtable propagation
  };

  const handlePostponeTask = (task: Task, postponeDate: string, postponeTime: string, postponeNotes: string) => {
    const [hours, minutes] = postponeTime.split(':').map(Number);
    const [year, month, day] = postponeDate.split('-').map(Number);
    
    const timezoneOffset = getTimezoneOffsetHours(timezone);
    const utcHours = hours - timezoneOffset;
    const utcDateTime = new Date(Date.UTC(year, month - 1, day, utcHours, minutes));
    
    const updatedTask = addHistoryEntry(task, 'postponed', t.postponeDetails.replace('{date}', utcDateTime.toLocaleString('de-DE', { timeZone: timezone })));
    
    // Clear boosted status when postponing task
    const updates: any = {
      status: 'pending',
      dueDate: utcDateTime,
      history: updatedTask.history,
      airtableUpdates: postponeNotes ? {
        'Następne kroki': postponeNotes
      } : undefined
    };

    // Remove boosted priority if present
    if (task.priority === 'boosted') {
      updates.priority = 'high';
    }
    
    onUpdateTask(task.id, updates);
  };

  const handleBoostPriority = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || boostingTask) return;
    
    setBoostingTask(taskId);
    
    try {
      const currentActiveTask = tasks.find(t => t.status === 'in_progress');
      if (currentActiveTask) {
        const resetTask = addHistoryEntry(currentActiveTask, 'started', 'Zadanie wstrzymane - priorytet przejęła inna osoba');
        
        await onUpdateTask(currentActiveTask.id, {
          status: 'pending',
          priority: currentActiveTask.priority === 'urgent' ? 'high' : currentActiveTask.priority,
          history: resetTask.history
        });
      }
      
      // Reset current boosted task if exists
      const currentBoostedTask = tasks.find(t => t.priority === 'boosted');
      if (currentBoostedTask && currentBoostedTask.id !== taskId) {
        const resetBoostedTask = addHistoryEntry(currentBoostedTask, 'started', 'Boost usunięty - nowe zadanie przejęło pozycję');
        
        await onUpdateTask(currentBoostedTask.id, {
          priority: 'high' as const, // Wróć do normalnego priority
          history: resetBoostedTask.history
        });
      }
      
      const now = new Date();
      const userName = user?.user_metadata?.full_name || user?.email || 'Nieznany użytkownik';
      const updatedTask = addHistoryEntry(task, 'started', `Zadanie przeniesione na pierwszą pozycję - przypisane do: ${userName}`);
      
      await onUpdateTask(taskId, {
        priority: 'boosted' as const, // Specjalny priority dla boost
        dueDate: now,
        status: 'in_progress' as const, // Phone boost - zadanie od razu w trakcie
        assignedTo: userName,
        history: updatedTask.history,
        airtableUpdates: {
          'kiedy dzwonić': now.toISOString(),
          'User': [userName] // Mapowanie będzie wykonane w useAirtable
        }
      });
    } finally {
      setBoostingTask(null);
    }
  };

  const handleBoostUrgent = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || boostingTask) return;
    
    setBoostingTask(taskId);
    
    try {
      // Reset current active task if exists
      const currentActiveTask = tasks.find(t => t.status === 'in_progress');
      if (currentActiveTask) {
        const resetTask = addHistoryEntry(currentActiveTask, 'started', 'Zadanie wstrzymane - priorytet przejęła inna osoba');
        
        await onUpdateTask(currentActiveTask.id, {
          status: 'pending',
          priority: currentActiveTask.priority === 'urgent' ? 'high' : currentActiveTask.priority,
          history: resetTask.history
        });
      }
      
      // Reset current boosted task if exists
      const currentBoostedTask = tasks.find(t => t.priority === 'boosted');
      if (currentBoostedTask && currentBoostedTask.id !== taskId) {
        const resetBoostedTask = addHistoryEntry(currentBoostedTask, 'started', 'Boost usunięty - nowe zadanie przejęło pozycję');
        
        await onUpdateTask(currentBoostedTask.id, {
          priority: 'high' as const, // Wróć do normalnego priority
          history: resetBoostedTask.history
        });
      }
      
      const now = new Date();
      const userName = user?.user_metadata?.full_name || user?.email || 'Nieznany użytkownik';
      const updatedTask = addHistoryEntry(task, 'started', `Zadanie przeniesione na pierwszą pozycję - przypisane do: ${userName}`);
      
      await onUpdateTask(taskId, {
        priority: 'boosted' as const, // Specjalny priority dla boost
        dueDate: now,
        status: 'pending' as const,
        assignedTo: userName,
        history: updatedTask.history,
        airtableUpdates: {
          'kiedy dzwonić': now.toISOString(),
          'User': [userName] // Mapowanie będzie wykonane w useAirtable
        }
      });
    } finally {
      setBoostingTask(null);
    }
  };

  const handleRemoveUrgent = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const updatedTask = addHistoryEntry(task, 'started', 'Usunięto status pilny');
    
    onUpdateTask(taskId, {
      airtableData: {
        ...task.airtableData,
        urgent: false
      },
      history: updatedTask.history,
      airtableUpdates: {
        'Urgent': false
      }
    });
  };


  const getTimezoneOffsetHours = (tz: string): number => {
    return getOffsetForTimezone(tz);
  };

  const getOffsetForTimezone = (tz: string): number => {
    const offsets: { [key: string]: number } = {
      'Europe/Warsaw': 2,
      'Europe/Berlin': 2,
      'Europe/London': 1,
      'America/New_York': -4,
      'America/Los_Angeles': -7,
      'Asia/Tokyo': 9,
      'Australia/Sydney': 10,
      'UTC': 0
    };
    
    const now = new Date();
    const isWinter = now.getMonth() < 2 || now.getMonth() > 9;
    
    if (tz.startsWith('Europe/') && isWinter && tz !== 'UTC') {
      return (offsets[tz] || 0) - 1;
    }
    
    return offsets[tz] || 0;
  };

  return {
    currentUserName,
    takenTasks,
    takingTask,
    verifyingTasks,
    failedTasks,
    boostingTask,
    extractPhoneNumber,
    isTaskAssignedToMe,
    isTaskAssignedToSomeoneElse,
    canTakeTask,
    isTaskVerifying,
    isTaskFailed,
    handleTakeTask,
    handlePhoneCall,
    handleCompleteTask,
    handleAbandonTask,
    handleTransferTask,
    handleUnassignTask,
    handlePostponeTask,
    handleBoostPriority,
    handleBoostUrgent,
    handleRemoveUrgent
  };
};