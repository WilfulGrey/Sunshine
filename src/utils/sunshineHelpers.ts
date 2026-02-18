import { Task, TaskPriority } from '../types/Task';
import { SunshineCallback } from '../services/sunshineService';
import { generateId } from './helpers';

export const convertCallbackToTask = (callback: SunshineCallback): Task => {
  const fullName = `${callback.first_name} ${callback.last_name}`;

  // Parse callback_at: "2026-02-20 10:00:00"
  let dueDate: Date | undefined;
  if (callback.callback_at) {
    const parsed = new Date(callback.callback_at.replace(' ', 'T'));
    if (!isNaN(parsed.getTime())) {
      dueDate = parsed;
    } else {
      console.warn(`Failed to parse callback_at "${callback.callback_at}" for ${fullName}`);
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

  const title = callback.callback_source === 'Interest'
    ? `${fullName} - Zainteresowanie zleceniem`
    : `${fullName} - Kontakt telefoniczny`;

  return {
    id: String(callback.caregiver_id),
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
      employeeId: callback.employee_id,
      phoneNumber: callback.phone_number,
      callbackSource: callback.callback_source,
      latestContactContent: callback.latest_contact_content || undefined,
      recruiterName: callback.recruiter_name || undefined,
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
 * Format a Date object to the API expected format: "YYYY-MM-DD HH:mm:ss"
 */
export const formatDateForApi = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};
