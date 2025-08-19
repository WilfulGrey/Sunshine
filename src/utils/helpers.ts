import { useLanguage } from '../contexts/LanguageContext';

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const formatDate = (date: Date, t?: any, timezone: string = 'Europe/Warsaw'): string => {
  const now = new Date();
  
  // Convert UTC date from database to selected timezone for display
  const displayDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  const displayNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  
  // Compare only dates without time
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = new Date(displayDate);
  taskDate.setHours(0, 0, 0, 0);
  
  const diffInMs = taskDate.getTime() - today.getTime();
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

  // If translations are not available, use German as fallback
  const todayText = t?.today || 'Heute';
  const tomorrowText = t?.tomorrow || 'Morgen';
  const yesterdayText = t?.yesterday || 'Gestern';
  const inDaysText = t?.inDays || 'In {days} Tagen';
  const daysAgoText = t?.daysAgo || 'Vor {days} Tagen';

  if (diffInDays === 0) {
    return `${todayText} ${date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: timezone
    })}`;
  } else if (diffInDays === 1) {
    return `${tomorrowText} ${date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: timezone
    })}`;
  } else if (diffInDays === -1) {
    return `${yesterdayText} ${date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: timezone
    })}`;
  } else if (diffInDays > 1 && diffInDays <= 7) {
    return inDaysText.replace('{days}', diffInDays.toString());
  } else if (diffInDays < -1 && diffInDays >= -7) {
    return daysAgoText.replace('{days}', Math.abs(diffInDays).toString());
  } else {
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone
    });
  }
};

export const isOverdue = (date: Date): boolean => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  return taskDate < today;
};

export const formatPriority = (priority: string): string => {
  const priorities: { [key: string]: string } = {
    'low': 'Niedrig',
    'medium': 'Mittel',
    'high': 'Hoch',
    'urgent': 'Dringend'
  };
  return priorities[priority] || priority;
};

export const formatStatus = (status: string): string => {
  const statuses: { [key: string]: string } = {
    'pending': 'Ausstehend',
    'in_progress': 'In Bearbeitung',
    'completed': 'Abgeschlossen',
    'cancelled': 'Abgebrochen'
  };
  return statuses[status] || status;
};

export const formatTaskType = (type: string): string => {
  const types: { [key: string]: string } = {
    'manual': 'Manuell',
    'automatic': 'Automatisch',
    'voicebot': 'Voicebot'
  };
  return types[type] || type;
};
export const addHistoryEntry = (
  task: Task,
  action: 'created' | 'started' | 'completed' | 'postponed' | 'cancelled' | 'reachable' | 'not_reachable',
  details?: string,
  canUndo: boolean = true
): Task => {
  const historyEntry = {
    id: generateId(),
    timestamp: new Date(),
    action,
    previousStatus: task.status,
    newStatus: action === 'started' ? 'in_progress' as const : 
               action === 'completed' || action === 'not_reachable' ? 'completed' as const :
               action === 'cancelled' ? 'cancelled' as const : task.status,
    details,
    canUndo
  };

  return {
    ...task,
    history: [...(task.history || []), historyEntry]
  };
};