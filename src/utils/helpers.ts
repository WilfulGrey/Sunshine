import { useLanguage } from '../contexts/LanguageContext';

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Format a phone number for readable display.
 *
 * - With "+" prefix: extract country code (known: +48, +49, +44, +33, +1; or
 *   first 1-3 digits as fallback), then group the local part 3+3+3+rest.
 *   Examples:
 *     "+48884756414"     → "+48 884 756 414"    (PL, 9 local digits)
 *     "+491234567890"    → "+49 123 456 789 0"  (DE, 10 local digits)
 *     "+4912345678901"   → "+49 123 456 789 01" (DE, 11 local digits)
 *
 * - Without "+" prefix: treat last 9 digits as local Polish number,
 *   remaining leading digits as country prefix (auto-add "+").
 *   Examples:
 *     "48884756414"      → "+48 884 756 414"
 *     "884756414"        → "884 756 414"
 *
 * - Empty input → "".
 */
export const formatPhoneNumber = (raw: string | undefined | null): string => {
  if (!raw) return '';
  const trimmed = String(raw).replace(/\s+/g, '').trim();
  if (!trimmed) return '';

  const groupFromStart = (digits: string): string => {
    const groups: string[] = [];
    for (let i = 0; i < digits.length; i += 3) {
      groups.push(digits.slice(i, i + 3));
    }
    return groups.join(' ');
  };

  // Path A: explicit "+" country prefix
  if (trimmed.startsWith('+')) {
    const KNOWN_PREFIXES = ['+48', '+49', '+44', '+33', '+1'];
    let prefix = '';
    let rest = trimmed;
    for (const p of KNOWN_PREFIXES) {
      if (trimmed.startsWith(p)) {
        prefix = p;
        rest = trimmed.slice(p.length);
        break;
      }
    }
    if (!prefix) {
      // Fallback for unknown countries: take first 1-3 digits after "+"
      const m = trimmed.match(/^(\+\d{1,3})(.*)$/);
      if (m) {
        prefix = m[1];
        rest = m[2];
      }
    }
    const digits = rest.replace(/\D/g, '');
    return digits ? `${prefix} ${groupFromStart(digits)}` : prefix;
  }

  // Path B: no "+" prefix — use Polish convention (last 9 digits = local)
  const allDigits = trimmed.replace(/\D/g, '');
  if (!allDigits) return '';
  const LOCAL_LEN = 9;
  if (allDigits.length >= LOCAL_LEN) {
    const local = allDigits.slice(-LOCAL_LEN);
    const prefixDigits = allDigits.slice(0, -LOCAL_LEN);
    const localGroups = `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 9)}`;
    return prefixDigits ? `+${prefixDigits} ${localGroups}` : localGroups;
  }
  return groupFromStart(allDigits);
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