import { useEffect, useRef, useState } from 'react';
import { Task } from '../types/Task';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { addHistoryEntry } from '../utils/helpers';
import { sunshineService } from '../services/sunshineService';
import { formatDateForApi } from '../utils/sunshineHelpers';
import { getEmployeeId, findEmployeeByName } from '../config/employeeMapping';
import { supabase } from '../lib/supabase';
import { recordUserAction } from '../utils/userActivity';

/**
 * Convert a Warsaw-local date/time to a UTC Date object.
 * Uses Intl.DateTimeFormat to dynamically resolve the Warsaw offset (handles CET/CEST automatically).
 */
function warsawToUTC(year: number, month: number, day: number, hours: number, minutes: number): Date {
  // Start with a rough UTC guess (assume the target hours are UTC)
  const guess = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  // Ask Intl what Warsaw hour/minute it shows for that UTC moment
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(guess);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');
  const warsawHour = get('hour') === 24 ? 0 : get('hour');
  const warsawMinute = get('minute');
  // Difference between desired Warsaw time and what Warsaw shows at our guess
  const diffMs = ((hours - warsawHour) * 60 + (minutes - warsawMinute)) * 60000;
  return new Date(guess.getTime() + diffMs);
}

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
  // Tracks when each task was added to takenTasks — used to keep optimistic
  // entries alive briefly after handleTakeTask while the API propagates.
  const takenAtRef = useRef<Map<string, number>>(new Map());
  const [takingTask, setTakingTask] = useState<string | null>(null);
  const [verifyingTasks, setVerifyingTasks] = useState<Set<string>>(new Set());
  const [failedTasks, setFailedTasks] = useState<Set<string>>(new Set());
  const [boostingTask, setBoostingTask] = useState<string | null>(null);

  const currentUserName = user?.user_metadata?.full_name || user?.email || 'Nieznany użytkownik';
  const currentEmployeeId = user?.email ? getEmployeeId(user.email) : null;

  // TODO(refactor): the 5s timestamp window is a pragmatic hack — replace with
  // optimistic local employeeId update in handleTakeTask (set emp=mine before
  // the API call, revert on error) + add employeeId to the list of fields that
  // useCallbacks.silentRefresh preserves for tasks with a pending write. Then
  // this cleanup hook can simply check `emp === currentEmployeeId` with no
  // timer math. Tracked separately so this hotfix is shippable on its own.
  //
  // Auto-cleanup stale takenTasks IDs after each tasks update (e.g. silentRefresh).
  // Drop the id when API no longer confirms it's mine — covers:
  //   - task gone from list
  //   - task transferred to another recruiter (emp !== mine)
  //   - task unassigned by anyone AND stale (emp === null, age > optimistic window).
  //     This was the CG 34205 bug: Magdalena had a takenTasks entry from 20.05,
  //     Cron unassigned her 23.05, and our local marker kept her seeing
  //     'Odebrała/Nie odebrała' on 27.05.
  // Keep the id transiently when emp === null AND it was added <5s ago — that's
  // the optimistic window right after handleTakeTask, before silentRefresh
  // brings the new employee_id back from the API.
  useEffect(() => {
    if (!currentEmployeeId) return;
    const OPTIMISTIC_WINDOW_MS = 5_000;
    const now = Date.now();
    setTakenTasks(prev => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      let changed = false;
      prev.forEach(id => {
        const task = tasks.find(t => t.id === id);
        if (!task) { changed = true; takenAtRef.current.delete(id); return; }
        const emp = task.apiData?.employeeId;
        if (emp === currentEmployeeId) {
          next.add(id);                    // API confirms it's mine
        } else if (emp == null) {
          // Unassigned — keep only if still within optimistic window
          const takenAt = takenAtRef.current.get(id) ?? 0;
          if (now - takenAt < OPTIMISTIC_WINDOW_MS) {
            next.add(id);
          } else {
            changed = true;
            takenAtRef.current.delete(id);
          }
        } else {
          // emp is some other recruiter — drop
          changed = true;
          takenAtRef.current.delete(id);
        }
      });
      return changed ? next : prev;
    });
  }, [tasks, currentEmployeeId]);

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
    recordUserAction(user?.id);
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
    takenAtRef.current.set(taskId, Date.now());

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
      takenAtRef.current.delete(taskId);

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
    recordUserAction(user?.id);
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
        const message = `${currentUserName}: Nie odebrano - ${now.toLocaleString('pl-PL')} - Oddzwonienie: ${newCallTime.toLocaleString('pl-PL')}`;

        // Record contact FIRST (critical for CG profile), then set callback
        await sunshineService.recordContact(caregiverId, 'not_successfully', message);
        await sunshineService.setCallback(
          caregiverId,
          formatDateForApi(newCallTime),
          task.apiData?.callbackSource,
          task.apiData?.callbackId,
          currentEmployeeId,
        );

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
    recordUserAction(user?.id);
    const caregiverId = getCaregiverId(task);
    if (!caregiverId) return;

    try {
      const message = `${currentUserName}: ${completionSummary}`;
      // Resolve the callback at the same time as recording the contact, then
      // remove from the local list so the next task surfaces immediately
      // (without waiting for the next silent refresh).
      await Promise.all([
        sunshineService.recordContact(caregiverId, 'successfully', message),
        sunshineService.setCallback(
          caregiverId,
          null,
          task.apiData?.callbackSource,
          task.apiData?.callbackId,
          currentEmployeeId,
        ),
      ]);
      onRemoveLocalTask(task.id);
    } catch (error) {
      console.error('Complete task failed:', error);
      alert(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleSaveNote = async (task: Task, note: string) => {
    recordUserAction(user?.id);
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
    recordUserAction(user?.id);
    const caregiverId = getCaregiverId(task);
    if (!caregiverId) return;

    try {
      const message = notes
        ? `${currentUserName} zakończył task - ${reason}: ${notes}`
        : `${currentUserName} zakończył task - ${reason}`;

      // Closing a task means the recruiter completed it successfully and is still
      // taking care of the caregiver — do NOT unassign. Only handleAbandonTask and
      // handleUnassignTask explicitly unassign.
      await Promise.all([
        sunshineService.recordContact(caregiverId, 'note_only', message),
        sunshineService.setCallback(
          caregiverId,
          null,
          task.apiData?.callbackSource,
          task.apiData?.callbackId,
          currentEmployeeId,
        ),
      ]);

      onRemoveLocalTask(task.id);
    } catch (error) {
      console.error('Close task failed:', error);
      alert(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleAbandonTask = async (task: Task, abandonReason: string) => {
    recordUserAction(user?.id);
    const caregiverId = getCaregiverId(task);
    if (!caregiverId) return;

    try {
      const message = `${currentUserName} - porzucono kontakt, powód: ${abandonReason}`;
      await sunshineService.recordContact(caregiverId, 'not_successfully', message);
      await sunshineService.unassignEmployee(caregiverId);
      await sunshineService.setCallback(
        caregiverId,
        null,
        task.apiData?.callbackSource,
        task.apiData?.callbackId,
        currentEmployeeId,
      );

      onRemoveLocalTask(task.id);
    } catch (error) {
      console.error('Abandon task failed:', error);
      alert(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleTransferTask = async (task: Task, transferToUser: string, transferReason: string) => {
    recordUserAction(user?.id);
    const caregiverId = getCaregiverId(task);
    if (!caregiverId) return;

    // Find the target employee ID by name
    const targetEmployee = findEmployeeByName(transferToUser);
    if (!targetEmployee?.employeeId) {
      alert(`Nie znaleziono employee_id dla: ${transferToUser}`);
      return;
    }

    try {
      const transferMessage = transferReason
        ? `${currentUserName} - przekazano do ${transferToUser}, powód: ${transferReason}`
        : `${currentUserName} - przekazano do ${transferToUser}`;

      // Atomic reassign — eliminates the race window where the CG was
      // briefly unassigned and could be grabbed by another recruiter.
      // The backend ignores `note` for the activity log, so we still
      // recordContact() separately for the sunshine audit trail.
      await sunshineService.reassignEmployee(caregiverId, targetEmployee.employeeId, transferMessage);
      await sunshineService.recordContact(caregiverId, 'note_only', transferMessage);

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
    recordUserAction(user?.id);
    const caregiverId = getCaregiverId(task);
    if (!caregiverId) return;

    try {
      const message = `${currentUserName} - odpięto się od opiekunki`;
      await sunshineService.recordContact(caregiverId, 'note_only', message);
      await sunshineService.unassignEmployee(caregiverId);

      // Remove from the local list immediately so the recruiter sees the
      // next task right away. Silent refresh will bring it back if it
      // re-appears in the API (now without an employee_id).
      onRemoveLocalTask(task.id);

      setTakenTasks(prev => {
        if (!prev.has(task.id)) return prev;
        const s = new Set(prev);
        s.delete(task.id);
        return s;
      });
      takenAtRef.current.delete(task.id);
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

      // Delay refresh to give the backend time to propagate the unassign.
      // Too short (500ms) was returning the still-assigned-to-me record,
      // bouncing the recruiter back to the Odebrała/Nie odebrała view.
      setTimeout(() => {
        onSilentRefresh?.();
      }, 1500);
    } catch (error) {
      console.error('Unassign task failed:', error);
      alert(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handlePostponeTask = async (task: Task, postponeDate: string, postponeTime: string, postponeNotes: string) => {
    recordUserAction(user?.id);
    const caregiverId = getCaregiverId(task);
    if (!caregiverId) return;

    const [hours, minutes] = postponeTime.split(':').map(Number);
    const [year, month, day] = postponeDate.split('-').map(Number);

    // Times in the app are always Warsaw time — convert to UTC using actual Warsaw offset
    const warsawDateTime = warsawToUTC(year, month, day, hours, minutes);

    try {
      // Bonus fix: preserve callback_source on postpone (was being lost)
      await sunshineService.setCallback(
        caregiverId,
        formatDateForApi(warsawDateTime),
        task.apiData?.callbackSource,
        task.apiData?.callbackId,
        currentEmployeeId,
      );

      // Always log postpone — without this an empty-note postpone changes the
      // callback date silently, leaving no trail in sunshine logs (made CG 7011
      // case impossible to diagnose for an hour).
      const formattedDate = warsawDateTime.toLocaleString('pl-PL', {
        timeZone: 'Europe/Warsaw',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      const auditMessage = postponeNotes
        ? `${currentUserName} - przesunął callback na ${formattedDate}. ${postponeNotes}`
        : `${currentUserName} - przesunął callback na ${formattedDate}`;
      await sunshineService.recordContact(caregiverId, 'note_only', auditMessage);

      const updatedTask = addHistoryEntry(task, 'postponed', t.postponeDetails.replace('{date}', warsawDateTime.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })));
      const updates: Partial<Task> = {
        status: 'pending',
        dueDate: warsawDateTime,
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
    recordUserAction(user?.id);
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
      // Bonus fix: preserve callback_source on boost (was being lost)
      await sunshineService.setCallback(
        caregiverId,
        formatDateForApi(now),
        task.apiData?.callbackSource,
        task.apiData?.callbackId,
        currentEmployeeId,
      );

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
    recordUserAction(user?.id);
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
      // Bonus fix: preserve callback_source on boost (was being lost)
      await sunshineService.setCallback(
        caregiverId,
        formatDateForApi(now),
        task.apiData?.callbackSource,
        task.apiData?.callbackId,
        currentEmployeeId,
      );

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
