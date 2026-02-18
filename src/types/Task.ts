export type TaskType = 'manual' | 'automatic' | 'voicebot';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | 'boosted';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: Date;
  createdAt: Date;
  completedAt?: Date;
  assignedTo?: string;
  category?: string;
  trigger?: string; // For automatic tasks
  voicebotConfig?: {
    script?: string;
    recipients?: string[];
    scheduledFor?: Date;
  };
  history?: TaskHistoryEntry[];
  apiData?: {
    caregiverId: number;
    employeeId?: number | null;
    phoneNumber?: string;
    callbackSource?: string;
    latestContactContent?: string;
    recruiterName?: string;
  };
}

export interface TaskHistoryEntry {
  id: string;
  timestamp: Date;
  action: 'created' | 'started' | 'completed' | 'postponed' | 'cancelled' | 'reachable' | 'not_reachable';
  previousStatus?: TaskStatus;
  newStatus?: TaskStatus;
  details?: string;
  canUndo?: boolean;
}