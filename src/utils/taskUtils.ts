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

export const filterActiveTasks = (tasks: Task[], currentUserName: string, takenTasks: Set<string>) => {
  // EMERGENCY DEBUG: Log user name for each call
  console.log(`🔍 FILTERING DEBUG: currentUserName="${currentUserName}"`);
  
  return tasks.filter(task => {
    // Debug first task only to avoid spam
    if (task === tasks[0]) {
      console.log(`🔍 FIRST TASK DEBUG: "${task.title}"`, {
        assignedTo: task.assignedTo,
        airtableUser: task.airtableData?.user,
        currentUser: currentUserName
      });
    }
    if (task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }
    
    // Check regular assignedTo field
    const isAssignedToSomeoneElse = task.assignedTo && 
      task.assignedTo !== currentUserName && 
      !takenTasks.has(task.id);
    
    if (isAssignedToSomeoneElse) {
      return false;
    }
    
    // Check Airtable user field (can be string or array)
    if (task.airtableData?.user) {
      const airtableUser = task.airtableData.user;
      
      // If it's an array, check if current user is in it
      if (Array.isArray(airtableUser)) {
        const hasCurrentUser = airtableUser.includes(currentUserName);
        const hasOtherUsers = airtableUser.some(user => user !== currentUserName);
        
        // If there are other users and current user is not assigned, hide task
        if (hasOtherUsers && !hasCurrentUser && !takenTasks.has(task.id)) {
          return false;
        }
      } 
      // If it's a string, check if it's assigned to someone else
      else if (typeof airtableUser === 'string') {
        if (airtableUser !== currentUserName && !takenTasks.has(task.id)) {
          return false;
        }
      }
    }
    
    return true;
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
  
  // Never hide urgent tasks from Airtable
  if (task.airtableData?.urgent) return false;
  
  const now = new Date();
  const taskDate = new Date(task.dueDate);
  const diffInDays = (taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  return diffInDays > daysThreshold;
};

export const getProcessedTasks = (tasks: Task[], currentUserName: string, takenTasks: Set<string>, showFutureTasks: boolean = false) => {
  const activeTasks = filterActiveTasks(tasks, currentUserName, takenTasks);
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