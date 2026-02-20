import { useState } from 'react';
import { Task } from '../types/Task';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { addHistoryEntry } from '../utils/helpers';
import { sunshineService } from '../services/sunshineService';
import { formatDateForApi } from '../utils/sunshineHelpers';
import { getEmployeeId, findEmployeeByName } from '../config/employeeMapping';
import { supabase } from '../lib/supabase';

export const useTaskActions = (
  tasks: Task[],
  onUpdateLocalTask: (taskId: string, updates: Partial<Task>) => void,
  onRemoveLocalTask: (taskId: string) => void,
  onLoadContacts?: () => void,
  onSilentRefresh?: () => void
) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [takenTasks, setTakenTasks] = useState<Set<string>>(new Set());
  const [takingTask, setTakingTask] = useState<string | null>(null);
  const [verifyingTasks, setVerifyingTasks] = useState<Set<string>>(new Set());
  const [failedTasks, setFailedTasks] = useState<Set<string>>(new Set());
  const [boostingTask, setBoostingTask] = useState<string | null>(null);

  const currentUserName = user?.user_metadata?.full_name || user?.email || 'Nieznany użytkownik';
  const currentEmployeeId = user?.email ? getEmployeeId(user.email) : null;

  // Real-time event sender
  const sendRealTimeEvent = (eventData: Record<string, unknown>) => {
    if (!supabase || !user) return;

    const event = {
      type: eventData.type,
      payload: {
        taskId: eventData.taskId,
        userId: user.id,
        userName: currentUserName,
        timestamp: eventData.timestamp || new Date().toISOString(),
        ...eventData,
      },
    };

    const channel = supabase.channel('task-events-global');
    channel.send({
      type: 'broadcast',
      event: 'task-update',
      payload: event,
    }).catch((error) => {
      console.error('Broadcast failed:', error);
    });

    setTimeout(() => {
      supabase.removeChannel(channel);
    }, 1000);
  };

  const extractPhoneNumber = (task: Task): string => {
    return task.apiData?.phoneNumber || '+48 XXX XXX XXX';
  };

  const isTaskAssignedToMe = (task: Task): boolean => {
    if (takenTasks.has(task.id)) return true;
    if (!currentEmployeeId || !task.apiData?.employeeId) return false;
    return task.apiData.employeeId === currentEmployeeId;
  };

  const isTaskAssignedToSomeoneElse = (task: Task): boolean => {
    if (takenTasks.has(task.id)) return false;
    if (!task.apiData?.employeeId) return false;
    return !currentEmployeeId || task.apiData.employeeId !== currentEmployeeId;
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

  const getCaregiverId = (task: Task): number | null => {
    return task.apiData?.caregiverId ?? null;
  };

  const handleTakeTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || takingTask === taskId) return;

    if (!canTakeTask(task)) {
      if (isTaskAssignedToSomeoneElse(task)) {
        alert(`To zadanie jest już przypisane do: ${task.apiData?.recruiterName || 'inny użytkownik'}`);
      } else {
        alert('To zadanie jest już przypisane do Ciebie.');
      }
      return;
    }

    const caregiverId = getCaregiverId(task);
    if (!caregiverId) {
      alert('Brak ID opiekunki. Nie można przypisać zadania.');
      return;
    }

    if (!currentEmployeeId) {
      alert('Twoje konto nie ma przypisanego employee_id. Skontaktuj się z administratorem.');
      return;
    }

    setTakingTask(taskId);
    setVerifyingTasks(prev => new Set([...prev, taskId]));
    setTakenTasks(prev => new Set([...prev, taskId]));

    try {
      await sunshineService.assignEmployee(caregiverId, currentEmployeeId);

      const updatedTask = addHistoryEntry(task, 'created', `Zadanie przypisane do: ${currentUserName}`);
      onUpdateLocalTask(taskId, {
        status: 'pending',
        assignedTo: currentUserName,
        apiData: { ...task.apiData!, employeeId: currentEmployeeId },
        history: updatedTask.history,
      });

      // Send real-time event
      setTimeout(() => {
        sendRealTimeEvent({
          type: 'task-assigned',
          taskId,
          status: 'pending',
          assignedTo: currentUserName,
        });
      }, 500);

      setVerifyingTasks(prev => {
        const s = new Set(prev);
        s.delete(taskId);
        return s;
      });
    } catch (error) {
      setVerifyingTasks(prev => {
        const s = new Set(prev);
        s.delete(taskId);
        return s;
      });
      setFailedTasks(prev => new Set([...prev, taskId]));
      setTakenTasks(prev => {
        const s = new Set(prev);
        s.delete(taskId);
        return s;
      });

      if (error instanceof Error) {
        alert(`Nie udało się przypisać zadania: ${error.message}`);
      } else {
        alert('Nie udało się przypisać zadania. Spróbuj ponownie.');
      }

      setTimeout(() => {
        setFailedTasks(prev => {
          const s = new Set(prev);
          s.delete(taskId);
          return s;
        });
      }, 10000);
    } finally {
      setTakingTask(null);
    }
  };

  const handlePhoneCall = async (task: Task, reachable: boolean) => {
    const caregiverId = getCaregiverId(task);
    if (!caregiverId) return;

    try {
      if (reachable) {
        // Task is already in_progress from handleStartTask.
        // Record history entry. The actual recordContact will be sent when user
        // submits the conversation summary via CompletionDialog (handleCompleteTask).
        const updatedTask = addHistoryEntry(task, 'reachable', t.callSuccessfulDetails);
        onUpdateLocalTask(task.id, {
          history: updatedTask.history,
        });
      } else {
        const now = new Date();
        const newCallTime = new Date(now.getTime() + 60 * 60 * 1000);
        const message = `Nie odebrano - ${now.toLocaleString('pl-PL')} - Oddzwonienie: ${newCallTime.toLocaleString('pl-PL')}`;

        await Promise.all([
          sunshineService.setCallback(caregiverId, formatDateForApi(newCallTime)),
          sunshineService.recordContact(caregiverId, 'note_only', message),
        ]);

        const updatedTask = addHistoryEntry(task, 'not_reachable', t.callUnsuccessfulDetails);
        const updates: Partial<Task> = {
          status: 'pending',
          dueDate: newCallTime,
          description: (task.description || '') + `\n\n[${message}]`,
          history: updatedTask.history,
        };

        if (task.priority === 'boosted') {
          updates.priority = 'high';
        }

        onUpdateLocalTask(task.id, updates);
      }
    } catch (error) {
      console.error('Phone call action failed:', error);
      alert(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleCompleteTask = async (task: Task, completionSummary: string) => {
    const caregiverId = getCaregiverId(task);
    if (!caregiverId) return;

    try {
      const message = `${currentUserName}: ${completionSummary}`;
      await sunshineService.recordContact(caregiverId, 'successfully', message);
    } catch (error) {
      console.error('Complete task failed:', error);
      alert(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleSaveNote = async (task: Task, note: string) => {
    const caregiverId = getCaregiverId(task);
    if (!caregiverId) return;

    try {
      const message = `${currentUserName}: ${note}`;
      await sunshineService.recordContact(caregiverId, 'note_only', message);
    } catch (error) {
      console.error('Save note failed:', error);
      alert(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleCloseTask = async (task: Task, reason: string, notes: string) => {
    const caregiverId = getCaregiverId(task);
    if (!caregiverId) return;

    try {
      const message = notes
        ? `${currentUserName} zakończył task - ${reason}: ${notes}`
        : `${currentUserName} zakończył task - ${reason}`;

      const isWklejka = reason === 'Zrobiono wklejkę';

      await Promise.all([
        sunshineService.recordContact(caregiverId, 'note_only', message),
        sunshineService.setCallback(caregiverId, null),
        ...(!isWklejka ? [sunshineService.unassignEmployee(caregiverId)] : []),
      ]);

      onRemoveLocalTask(task.id);
    } catch (error) {
      console.error('Close task failed:', error);
      alert(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleAbandonTask = async (task: Task, abandonReason: string) => {
    const caregiverId = getCaregiverId(task);
    if (!caregiverId) return;

    try {
      const message = `${currentUserName}: ${abandonReason}`;
      await sunshineService.recordContact(caregiverId, 'not_successfully', message);
      await sunshineService.unassignEmployee(caregiverId);
      await sunshineService.setCallback(caregiverId, null);

      onRemoveLocalTask(task.id);
    } catch (error) {
      console.error('Abandon task failed:', error);
      alert(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleTransferTask = async (task: Task, transferToUser: string, transferReason: string) => {
    const caregiverId = getCaregiverId(task);
    if (!caregiverId) return;

    // Find the target employee ID by name
    const targetEmployee = findEmployeeByName(transferToUser);
    if (!targetEmployee?.employeeId) {
      alert(`Nie znaleziono employee_id dla: ${transferToUser}`);
      return;
    }

    try {
      await sunshineService.assignEmployee(caregiverId, targetEmployee.employeeId);

      if (transferReason) {
        await sunshineService.recordContact(caregiverId, 'note_only', `Transfer do ${transferToUser}: ${transferReason}`);
      }

      onRemoveLocalTask(task.id);

      sendRealTimeEvent({
        type: 'task-transfer',
        taskId: task.id,
        fromUser: task.assignedTo,
        toUser: transferToUser,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Transfer task failed:', error);
      alert(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleUnassignTask = async (task: Task) => {
    const caregiverId = getCaregiverId(task);
    if (!caregiverId) return;

    try {
      await sunshineService.unassignEmployee(caregiverId);

      onUpdateLocalTask(task.id, {
        assignedTo: undefined,
        status: 'pending',
        apiData: { ...task.apiData!, employeeId: null },
      });

      takenTasks.delete(task.id);
      setVerifyingTasks(prev => {
        const s = new Set(prev);
        s.delete(task.id);
        return s;
      });
      setFailedTasks(prev => {
        const s = new Set(prev);
        s.delete(task.id);
        return s;
      });

      sendRealTimeEvent({
        type: 'task-unassign',
        taskId: task.id,
        fromUser: task.assignedTo,
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        onSilentRefresh?.();
      }, 500);
    } catch (error) {
      console.error('Unassign task failed:', error);
      alert(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handlePostponeTask = async (task: Task, postponeDate: string, postponeTime: string, postponeNotes: string) => {
    const caregiverId = getCaregiverId(task);
    if (!caregiverId) return;

    const [hours, minutes] = postponeTime.split(':').map(Number);
    const [year, month, day] = postponeDate.split('-').map(Number);

    const timezoneOffset = getTimezoneOffsetHours('Europe/Warsaw');
    const utcHours = hours - timezoneOffset;
    const utcDateTime = new Date(Date.UTC(year, month - 1, day, utcHours, minutes));

    try {
      await sunshineService.setCallback(caregiverId, formatDateForApi(utcDateTime));

      if (postponeNotes) {
        await sunshineService.recordContact(caregiverId, 'note_only', postponeNotes);
      }

      const updatedTask = addHistoryEntry(task, 'postponed', t.postponeDetails.replace('{date}', utcDateTime.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })));
      const updates: Partial<Task> = {
        status: 'pending',
        dueDate: utcDateTime,
        history: updatedTask.history,
      };

      if (task.priority === 'boosted') {
        updates.priority = 'high';
      }

      onUpdateLocalTask(task.id, updates);
    } catch (error) {
      console.error('Postpone task failed:', error);
      alert(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleBoostPriority = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || boostingTask) return;

    const caregiverId = getCaregiverId(task);
    if (!caregiverId || !currentEmployeeId) return;

    setBoostingTask(taskId);

    try {
      // Reset current active task
      const currentActiveTask = tasks.find(t => t.status === 'in_progress');
      if (currentActiveTask) {
        const resetTask = addHistoryEntry(currentActiveTask, 'started', 'Zadanie wstrzymane - priorytet przejęła inna osoba');
        onUpdateLocalTask(currentActiveTask.id, {
          status: 'pending',
          priority: currentActiveTask.priority === 'urgent' ? 'high' : currentActiveTask.priority,
          history: resetTask.history,
        });
      }

      // Reset current boosted task
      const currentBoostedTask = tasks.find(t => t.priority === 'boosted');
      if (currentBoostedTask && currentBoostedTask.id !== taskId) {
        const resetBoosted = addHistoryEntry(currentBoostedTask, 'started', 'Boost usunięty - nowe zadanie przejęło pozycję');
        onUpdateLocalTask(currentBoostedTask.id, {
          priority: 'high' as const,
          history: resetBoosted.history,
        });
      }

      const now = new Date();
      const alreadyMine = task.apiData?.employeeId === currentEmployeeId;
      if (!alreadyMine) {
        await sunshineService.assignEmployee(caregiverId, currentEmployeeId);
      }
      await sunshineService.setCallback(caregiverId, formatDateForApi(now));

      const updatedTask = addHistoryEntry(task, 'started', `Zadanie przeniesione na pierwszą pozycję`);
      onUpdateLocalTask(taskId, {
        priority: 'boosted' as const,
        dueDate: now,
        status: 'in_progress' as const,
        apiData: { ...task.apiData!, employeeId: currentEmployeeId },
        history: updatedTask.history,
      });
    } catch (error) {
      console.error('Boost priority failed:', error);
      alert(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    } finally {
      setBoostingTask(null);
    }
  };

  const handleBoostUrgent = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || boostingTask) return;

    const caregiverId = getCaregiverId(task);
    if (!caregiverId || !currentEmployeeId) return;

    setBoostingTask(taskId);

    try {
      const currentActiveTask = tasks.find(t => t.status === 'in_progress');
      if (currentActiveTask) {
        const resetTask = addHistoryEntry(currentActiveTask, 'started', 'Zadanie wstrzymane - priorytet przejęła inna osoba');
        onUpdateLocalTask(currentActiveTask.id, {
          status: 'pending',
          priority: currentActiveTask.priority === 'urgent' ? 'high' : currentActiveTask.priority,
          history: resetTask.history,
        });
      }

      const currentBoostedTask = tasks.find(t => t.priority === 'boosted');
      if (currentBoostedTask && currentBoostedTask.id !== taskId) {
        const resetBoosted = addHistoryEntry(currentBoostedTask, 'started', 'Boost usunięty - nowe zadanie przejęło pozycję');
        onUpdateLocalTask(currentBoostedTask.id, {
          priority: 'high' as const,
          history: resetBoosted.history,
        });
      }

      const now = new Date();
      const alreadyMine = task.apiData?.employeeId === currentEmployeeId;
      if (!alreadyMine) {
        await sunshineService.assignEmployee(caregiverId, currentEmployeeId);
      }
      await sunshineService.setCallback(caregiverId, formatDateForApi(now));

      const updatedTask = addHistoryEntry(task, 'started', `Zadanie przeniesione na pierwszą pozycję`);
      onUpdateLocalTask(taskId, {
        priority: 'boosted' as const,
        dueDate: now,
        status: 'pending' as const,
        apiData: { ...task.apiData!, employeeId: currentEmployeeId },
        history: updatedTask.history,
      });
    } catch (error) {
      console.error('Boost urgent failed:', error);
      alert(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    } finally {
      setBoostingTask(null);
    }
  };

  const handleRemoveUrgent = (_taskId: string) => {
    // Urgent flag is no longer in the API model - no-op
  };

  const getTimezoneOffsetHours = (tz: string): number => {
    const offsets: Record<string, number> = {
      'Europe/Warsaw': 2,
      'Europe/Berlin': 2,
      'Europe/London': 1,
      'America/New_York': -4,
      'America/Los_Angeles': -7,
      'Asia/Tokyo': 9,
      'Australia/Sydney': 10,
      'UTC': 0,
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
    currentEmployeeId,
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
    handleSaveNote,
    handleCloseTask,
    handleAbandonTask,
    handleTransferTask,
    handleUnassignTask,
    handlePostponeTask,
    handleBoostPriority,
    handleBoostUrgent,
    handleRemoveUrgent,
  };
};
