import { Task, TaskPriority } from '../types/Task';
import { SunshineCallback, CallbackType } from '../services/sunshineService';
import { generateId } from './helpers';

const titleForType = (fullName: string, type: CallbackType): string => {
  switch (type) {
    case 'interest':
      return `${fullName} - Aplikacja na zlecenie`;
    case 'reapply':
      return `${fullName} - Reapply`;
    case 'pre_arrival':
      // 3 days before departure (to family) — secure the arrival
      return `${fullName} - Anreise absichern (potwierdzenie wyjazdu)`;
    case 'post_arrival':
      // 1 day after arrival — confirm she got there OK
      return `${fullName} - Anreise bestätigen (potwierdzenie dojazdu)`;
    case 'pre_departure':
      // 7 days before leaving the family — confirm departure
      return `${fullName} - Abreise bestätigen (potwierdzenie odjazdu)`;
    case 'general':
    default:
      return `${fullName} - Kontakt telefoniczny`;
  }
};

const BLOCKED_STATUSES = ['Black List', 'Niewłaściwy'];

export const isBlockedStatus = (status: string): boolean =>
  BLOCKED_STATUSES.includes(status);

export const convertCallbackToTask = (callback: SunshineCallback): Task => {
  const fullName = `${callback.first_name} ${callback.last_name}`;

  // Parse callback_at. Backend returns two formats:
  //   Legacy: "2026-02-20 10:00:00"               (Warsaw local time, space separator)
  //   New:    "2026-05-21T08:33:57.000000Z"       (ISO 8601 UTC)
  let dueDate: Date | undefined;
  if (callback.callback_at) {
    const raw = callback.callback_at;
    const isIso = raw.includes('T') && (raw.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(raw));
    if (isIso) {
      // ISO 8601 with explicit timezone — parse directly
      const parsed = new Date(raw);
      if (!isNaN(parsed.getTime())) {
        dueDate = parsed;
      } else {
        console.warn(`Failed to parse ISO callback_at "${raw}" for ${fullName}`);
      }
    } else {
      // Legacy "YYYY-MM-DD HH:mm:ss" — interpret as Warsaw time, convert to UTC
      const asUtc = new Date(raw.replace(' ', 'T') + 'Z');
      if (!isNaN(asUtc.getTime())) {
        const utcStr = asUtc.toLocaleString('en-US', { timeZone: 'UTC' });
        const warsawStr = asUtc.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' });
        const offset = new Date(warsawStr).getTime() - new Date(utcStr).getTime();
        dueDate = new Date(asUtc.getTime() - offset);
      } else {
        console.warn(`Failed to parse legacy callback_at "${raw}" for ${fullName}`);
      }
    }
  }

  // Priority based on date proximity
  let priority: TaskPriority = 'medium';
  if (dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dueDate);
    taskDate.setHours(0, 0, 0, 0);
    const diffInDays = Math.ceil((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays < 0) {
      priority = 'urgent';
    } else if (diffInDays === 0) {
      priority = 'urgent';
    } else if (diffInDays === 1) {
      priority = 'high';
    } else if (diffInDays <= 3) {
      priority = 'medium';
    } else {
      priority = 'low';
    }
  }

  // Defensive default: missing type means legacy/general callback.
  // Special case: backend currently returns type='general' for Reapply Agent
  // callbacks (the 'reapply' type value isn't set yet). Treat them as reapply
  // based on callback_source so sorting/title/badge work properly today.
  let callbackType: CallbackType = callback.type ?? 'general';
  if (callback.callback_source === 'Reapply Agent' && callbackType === 'general') {
    callbackType = 'reapply';
  }
  const title = titleForType(fullName, callbackType);

  // Task ID prefers callback_id (unique per callback) over caregiver_id
  // (a single caregiver may have multiple callbacks in different process stages)
  const taskId = callback.callback_id != null
    ? String(callback.callback_id)
    : String(callback.caregiver_id);

  return {
    id: taskId,
    title,
    description: callback.latest_contact_content || undefined,
    type: 'manual',
    priority,
    status: 'pending',
    dueDate,
    assignedTo: callback.recruiter_name || undefined,
    category: 'Matching & Kontakt',
    createdAt: dueDate || new Date(),
    history: [],
    apiData: {
      caregiverId: callback.caregiver_id,
      callbackId: callback.callback_id,
      callbackType,
      dlv: callback.dlv,
      employeeId: callback.employee_id,
      phoneNumber: callback.phone_number,
      callbackSource: callback.callback_source,
      latestContactContent: callback.latest_contact_content || undefined,
      recruiterName: callback.recruiter_name || undefined,
      caregiverStatus: callback.status,
    },
  };
};

export const formatCallbackDate = (dateStr: string): string => {
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr.replace(' ', 'T'));
    const now = new Date();
    const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Dzisiaj';
    } else if (diffInDays === 1) {
      return 'Jutro';
    } else if (diffInDays === -1) {
      return 'Wczoraj';
    } else if (diffInDays > 1 && diffInDays <= 7) {
      return `Za ${diffInDays} dni`;
    } else if (diffInDays < -1 && diffInDays >= -7) {
      return `${Math.abs(diffInDays)} dni temu`;
    } else {
      return date.toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
  } catch {
    return dateStr;
  }
};

/**
 * Format a Date object for sending to the Sunshine API.
 *
 * Backend stores callback_at in UTC and returns it as ISO 8601 with 'Z'
 * (e.g. "2026-05-26T12:00:00.000000Z"). When we sent a Warsaw-local string
 * like "2026-05-26 14:00:00" without a timezone marker, the backend treated
 * it as UTC 14:00, which then displayed back as 16:00 Warsaw (+2h CEST).
 *
 * Sending ISO 8601 UTC with explicit 'Z' makes the timezone unambiguous on
 * both sides — Date.toISOString() does exactly that.
 */
export const formatDateForApi = (date: Date): string => {
  return date.toISOString();
};
