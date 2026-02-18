import { Task } from '../types/Task';
import { User, Bot, Zap } from 'lucide-react';

export const getTypeIcon = (type: string) => {
  switch (type) {
    case 'manual': return User;
    case 'voicebot': return Bot;
    case 'automatic': return Zap;
    default: return User;
  }
};

export const getTypeColor = (type: string) => {
  switch (type) {
    case 'manual': return 'bg-blue-100 text-blue-700';
    case 'voicebot': return 'bg-purple-100 text-purple-700';
    case 'automatic': return 'bg-green-100 text-green-700';
    default: return 'bg-blue-100 text-blue-700';
  }
};

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'low': return 'bg-gray-100 text-gray-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    case 'high': return 'bg-orange-100 text-orange-700';
    case 'urgent': return 'bg-red-100 text-red-700';
    case 'boosted': return 'bg-purple-100 text-purple-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export const filterActiveTasks = (tasks: Task[], takenTasks: Set<string>, currentEmployeeId: number | null) => {
  return tasks.filter(task => {
    if (task.status === 'completed' || task.status === 'cancelled') return false;
    if (takenTasks.has(task.id)) return true;

    const taskEmployeeId = task.apiData?.employeeId;

    // Unassigned → visible to everyone
    if (!taskEmployeeId) return true;

    // Assigned to me → visible
    if (currentEmployeeId && taskEmployeeId === currentEmployeeId) return true;

    // Assigned to someone else → hidden
    return false;
  });
};

export const sortTasksByPriority = (tasks: Task[]) => {
  return [...tasks].sort((a, b) => {
    // Boosted tasks come FIRST - above everything
    if (a.priority === 'boosted' && b.priority !== 'boosted') return -1;
    if (a.priority !== 'boosted' && b.priority === 'boosted') return 1;
    
    // In_progress tasks come SECOND
    if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
    if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
    
    // Main sorting by due date
    if (a.dueDate && b.dueDate) {
      return a.dueDate.getTime() - b.dueDate.getTime();
    }
    
    // Tasks with date come before tasks without date
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    
    // If both have no date, sort by priority
    if (!a.dueDate && !b.dueDate) {
      const priorityOrder = { boosted: 5, urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    
    return 0;
  });
};

const isTaskFarInFuture = (task: Task, daysThreshold: number = 7): boolean => {
  if (!task.dueDate) return false;

  const now = new Date();
  const taskDate = new Date(task.dueDate);
  const diffInDays = (taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  return diffInDays > daysThreshold;
};

export const isTaskDueToday = (task: Task, timezone: string = 'Europe/Warsaw'): boolean => {
  if (!task.dueDate) return false;
  
  const now = new Date();
  
  // Convert both dates to the specified timezone for comparison
  // Same logic as formatDate() to ensure consistency
  const displayNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const displayTaskDate = new Date(task.dueDate.toLocaleString('en-US', { timeZone: timezone }));
  
  // Compare only dates without time
  const today = new Date(displayNow.getFullYear(), displayNow.getMonth(), displayNow.getDate());
  const taskDateOnly = new Date(displayTaskDate.getFullYear(), displayTaskDate.getMonth(), displayTaskDate.getDate());
  
  return taskDateOnly.getTime() === today.getTime();
};

export const getProcessedTasks = (tasks: Task[], takenTasks: Set<string>, currentEmployeeId: number | null, showFutureTasks: boolean = false) => {
  const activeTasks = filterActiveTasks(tasks, takenTasks, currentEmployeeId);
  const sortedTasks = sortTasksByPriority(activeTasks);
  
  const upcomingTasks = sortedTasks.slice(1);
  
  // Filter out far future tasks unless showFutureTasks is true
  const filteredUpcomingTasks = showFutureTasks 
    ? upcomingTasks 
    : upcomingTasks.filter(task => !isTaskFarInFuture(task));
  
  return {
    nextTask: sortedTasks[0] || null,
    upcomingTasks: filteredUpcomingTasks,
    hiddenFutureTasksCount: showFutureTasks ? 0 : upcomingTasks.filter(task => isTaskFarInFuture(task)).length
  };
};