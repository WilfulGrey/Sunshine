import { describe, it, expect } from 'vitest';
import { 
  getTypeIcon, 
  getTypeColor, 
  getPriorityColor, 
  filterActiveTasks, 
  sortTasksByPriority, 
  getProcessedTasks,
  isTaskDueToday
} from './taskUtils';
import { Task } from '../types/Task';
import { User, Bot, Zap } from 'lucide-react';

describe('taskUtils', () => {
  describe('getTypeIcon', () => {
    it('should return User icon for manual type', () => {
      expect(getTypeIcon('manual')).toBe(User);
    });

    it('should return Bot icon for voicebot type', () => {
      expect(getTypeIcon('voicebot')).toBe(Bot);
    });

    it('should return Zap icon for automatic type', () => {
      expect(getTypeIcon('automatic')).toBe(Zap);
    });

    it('should return User icon for unknown type', () => {
      expect(getTypeIcon('unknown')).toBe(User);
    });
  });

  describe('getTypeColor', () => {
    it('should return blue colors for manual type', () => {
      expect(getTypeColor('manual')).toBe('bg-blue-100 text-blue-700');
    });

    it('should return purple colors for voicebot type', () => {
      expect(getTypeColor('voicebot')).toBe('bg-purple-100 text-purple-700');
    });

    it('should return green colors for automatic type', () => {
      expect(getTypeColor('automatic')).toBe('bg-green-100 text-green-700');
    });

    it('should return blue colors for unknown type', () => {
      expect(getTypeColor('unknown')).toBe('bg-blue-100 text-blue-700');
    });
  });

  describe('getPriorityColor', () => {
    it('should return gray colors for low priority', () => {
      expect(getPriorityColor('low')).toBe('bg-gray-100 text-gray-700');
    });

    it('should return yellow colors for medium priority', () => {
      expect(getPriorityColor('medium')).toBe('bg-yellow-100 text-yellow-700');
    });

    it('should return orange colors for high priority', () => {
      expect(getPriorityColor('high')).toBe('bg-orange-100 text-orange-700');
    });

    it('should return red colors for urgent priority', () => {
      expect(getPriorityColor('urgent')).toBe('bg-red-100 text-red-700');
    });

    it('should return gray colors for unknown priority', () => {
      expect(getPriorityColor('unknown')).toBe('bg-gray-100 text-gray-700');
    });
  });

  describe('filterActiveTasks', () => {
    const mockTasks: Task[] = [
      {
        id: '1',
        title: 'Task 1',
        description: 'Description 1',
        status: 'pending',
        priority: 'medium',
        type: 'manual',
        assignedTo: 'John',
        createdAt: new Date(),
        history: []
      },
      {
        id: '2',
        title: 'Task 2',
        description: 'Description 2',
        status: 'completed',
        priority: 'high',
        type: 'manual',
        assignedTo: 'John',
        createdAt: new Date(),
        history: []
      },
      {
        id: '3',
        title: 'Task 3',
        description: 'Description 3',
        status: 'pending',
        priority: 'low',
        type: 'manual',
        assignedTo: 'Jane',
        createdAt: new Date(),
        history: []
      },
      {
        id: '4',
        title: 'Task 4',
        description: 'Description 4',
        status: 'cancelled',
        priority: 'urgent',
        type: 'manual',
        createdAt: new Date(),
        history: []
      }
    ];

    it('should filter out completed tasks', () => {
      const result = filterActiveTasks(mockTasks, 'John', new Set());
      expect(result.find(task => task.status === 'completed')).toBeUndefined();
    });

    it('should filter out cancelled tasks', () => {
      const result = filterActiveTasks(mockTasks, 'John', new Set());
      expect(result.find(task => task.status === 'cancelled')).toBeUndefined();
    });

    it('should include tasks assigned to current user', () => {
      const result = filterActiveTasks(mockTasks, 'John', new Set());
      expect(result.find(task => task.id === '1')).toBeDefined();
    });

    it('should exclude tasks assigned to other users', () => {
      const result = filterActiveTasks(mockTasks, 'John', new Set());
      expect(result.find(task => task.id === '3')).toBeUndefined();
    });

    it('should include taken tasks even if assigned to others', () => {
      const takenTasks = new Set(['3']);
      const result = filterActiveTasks(mockTasks, 'John', takenTasks);
      expect(result.find(task => task.id === '3')).toBeDefined();
    });

    it('should include unassigned tasks', () => {
      const unassignedTask = {
        ...mockTasks[0],
        id: '5',
        assignedTo: undefined
      };
      const tasksWithUnassigned = [...mockTasks, unassignedTask];
      const result = filterActiveTasks(tasksWithUnassigned, 'John', new Set());
      expect(result.find(task => task.id === '5')).toBeDefined();
    });

    it('should exclude tasks assigned to other users in airtableData (string)', () => {
      const taskWithAirtableUser = {
        ...mockTasks[0],
        id: '6',
        assignedTo: undefined,
        airtableData: {
          recordId: 'rec123',
          user: 'Małgorzata łuksin'
        }
      };
      const tasksWithAirtable = [...mockTasks, taskWithAirtableUser];
      const result = filterActiveTasks(tasksWithAirtable, 'John', new Set());
      expect(result.find(task => task.id === '6')).toBeUndefined();
    });

    it('should include tasks assigned to current user in airtableData (string)', () => {
      const taskWithAirtableUser = {
        ...mockTasks[0],
        id: '7',
        assignedTo: undefined,
        airtableData: {
          recordId: 'rec123',
          user: 'John'
        }
      };
      const tasksWithAirtable = [...mockTasks, taskWithAirtableUser];
      const result = filterActiveTasks(tasksWithAirtable, 'John', new Set());
      expect(result.find(task => task.id === '7')).toBeDefined();
    });

    it('should exclude tasks assigned to other users in airtableData (array)', () => {
      const taskWithAirtableUsers = {
        ...mockTasks[0],
        id: '8',
        assignedTo: undefined,
        airtableData: {
          recordId: 'rec123',
          user: ['Małgorzata łuksin', 'Alex Nowek']
        }
      };
      const tasksWithAirtable = [...mockTasks, taskWithAirtableUsers];
      const result = filterActiveTasks(tasksWithAirtable, 'John', new Set());
      expect(result.find(task => task.id === '8')).toBeUndefined();
    });

    it('should include tasks when current user is in airtableData array', () => {
      const taskWithAirtableUsers = {
        ...mockTasks[0],
        id: '9',
        assignedTo: undefined,
        airtableData: {
          recordId: 'rec123',
          user: ['John', 'Małgorzata łuksin']
        }
      };
      const tasksWithAirtable = [...mockTasks, taskWithAirtableUsers];
      const result = filterActiveTasks(tasksWithAirtable, 'John', new Set());
      expect(result.find(task => task.id === '9')).toBeDefined();
    });

    it('should include taken tasks even if assigned to others in airtableData', () => {
      const taskWithAirtableUser = {
        ...mockTasks[0],
        id: '10',
        assignedTo: undefined,
        airtableData: {
          recordId: 'rec123',
          user: 'Małgorzata łuksin'
        }
      };
      const tasksWithAirtable = [...mockTasks, taskWithAirtableUser];
      const takenTasks = new Set(['10']);
      const result = filterActiveTasks(tasksWithAirtable, 'John', takenTasks);
      expect(result.find(task => task.id === '10')).toBeDefined();
    });
  });

  describe('sortTasksByPriority', () => {
    const mockTasks: Task[] = [
      {
        id: '1',
        title: 'Task 1',
        description: 'Description 1',
        status: 'pending',
        priority: 'medium',
        type: 'manual',
        createdAt: new Date(),
        history: [],
        dueDate: new Date('2024-01-15T10:00:00Z')
      },
      {
        id: '2',
        title: 'Task 2',
        description: 'Description 2',
        status: 'in_progress',
        priority: 'low',
        type: 'manual',
        createdAt: new Date(),
        history: [],
        dueDate: new Date('2024-01-16T10:00:00Z')
      },
      {
        id: '3',
        title: 'Task 3',
        description: 'Description 3',
        status: 'pending',
        priority: 'urgent',
        type: 'manual',
        createdAt: new Date(),
        history: [],
        dueDate: new Date('2024-01-14T10:00:00Z')
      }
    ];

    it('should prioritize in_progress tasks', () => {
      const result = sortTasksByPriority(mockTasks);
      expect(result[0].status).toBe('in_progress');
    });

    it('should sort tasks by due date when both have dates', () => {
      const pendingTasks = mockTasks.filter(t => t.status === 'pending');
      const result = sortTasksByPriority(pendingTasks);
      expect(result[0].id).toBe('3'); // Earlier due date
      expect(result[1].id).toBe('1'); // Later due date
    });

    it('should prioritize tasks with due dates over those without', () => {
      const taskWithoutDate = {
        ...mockTasks[0],
        id: '4',
        dueDate: undefined
      };
      const mixedTasks = [taskWithoutDate, mockTasks[2]];
      const result = sortTasksByPriority(mixedTasks);
      expect(result[0].dueDate).toBeDefined();
    });

    it('should sort by priority when both tasks have no due date', () => {
      const tasksWithoutDates = [
        {
          ...mockTasks[0],
          id: '4',
          dueDate: undefined,
          priority: 'low' as const
        },
        {
          ...mockTasks[1],
          id: '5',
          dueDate: undefined,
          priority: 'urgent' as const,
          status: 'pending' as const
        }
      ];
      const result = sortTasksByPriority(tasksWithoutDates);
      expect(result[0].priority).toBe('urgent');
    });
  });

  describe('getProcessedTasks', () => {
    const mockTasks: Task[] = [
      {
        id: '1',
        title: 'Task 1',
        description: 'Description 1',
        status: 'pending',
        priority: 'medium',
        type: 'manual',
        assignedTo: 'John',
        createdAt: new Date(),
        history: [],
        dueDate: new Date('2024-01-15T10:00:00Z')
      },
      {
        id: '2',
        title: 'Task 2',
        description: 'Description 2',
        status: 'completed',
        priority: 'high',
        type: 'manual',
        assignedTo: 'John',
        createdAt: new Date(),
        history: []
      },
      {
        id: '3',
        title: 'Task 3',
        description: 'Description 3',
        status: 'pending',
        priority: 'urgent',
        type: 'manual',
        assignedTo: 'John',
        createdAt: new Date(),
        history: [],
        dueDate: new Date('2024-01-14T10:00:00Z')
      }
    ];

    it('should return the next task and upcoming tasks', () => {
      const result = getProcessedTasks(mockTasks, 'John', new Set());
      expect(result.nextTask).toBeDefined();
      expect(result.nextTask?.id).toBe('3'); // Earliest due date
      expect(result.upcomingTasks).toHaveLength(1);
      expect(result.upcomingTasks[0].id).toBe('1');
    });

    it('should return null for nextTask when no active tasks', () => {
      const completedTasks = mockTasks.map(task => ({ ...task, status: 'completed' as const }));
      const result = getProcessedTasks(completedTasks, 'John', new Set());
      expect(result.nextTask).toBeNull();
      expect(result.upcomingTasks).toHaveLength(0);
    });

    it('should return empty upcoming tasks when only one active task', () => {
      const singleTask = [mockTasks[0]];
      const result = getProcessedTasks(singleTask, 'John', new Set());
      expect(result.nextTask).toBeDefined();
      expect(result.upcomingTasks).toHaveLength(0);
    });

    it('should not hide urgent tasks even if they are far in future', () => {
      const farFutureDate = new Date();
      farFutureDate.setDate(farFutureDate.getDate() + 10); // 10 days in future

      const urgentFutureTasks: Task[] = [
        {
          id: '1',
          title: 'Current Task',
          description: 'Description 1',
          status: 'in_progress',
          priority: 'medium',
          type: 'manual',
          assignedTo: 'John',
          createdAt: new Date(),
          history: [],
          dueDate: new Date()
        },
        {
          id: '2',
          title: 'Urgent Future Task',
          description: 'Description 2',
          status: 'pending',
          priority: 'high',
          type: 'manual',
          assignedTo: 'John',
          createdAt: new Date(),
          history: [],
          dueDate: farFutureDate,
          airtableData: { urgent: true }
        },
        {
          id: '3',
          title: 'Normal Future Task',
          description: 'Description 3',
          status: 'pending',
          priority: 'medium',
          type: 'manual',
          assignedTo: 'John',
          createdAt: new Date(),
          history: [],
          dueDate: farFutureDate
        }
      ];

      const result = getProcessedTasks(urgentFutureTasks, 'John', new Set(), false);

      expect(result.nextTask?.id).toBe('1');
      expect(result.upcomingTasks).toHaveLength(1); // Only urgent task should be visible
      expect(result.upcomingTasks[0].id).toBe('2'); // Urgent task
      expect(result.hiddenFutureTasksCount).toBe(1); // Normal future task hidden
    });
  });

  describe('isTaskDueToday', () => {
    it('should return true for tasks due today', () => {
      const today = new Date();
      const taskDueToday: Task = {
        id: '1',
        title: 'Test Task',
        description: 'Description',
        status: 'pending',
        priority: 'medium',
        type: 'manual',
        assignedTo: null,
        createdAt: new Date(),
        history: [],
        dueDate: today
      };

      expect(isTaskDueToday(taskDueToday)).toBe(true);
    });

    it('should return false for tasks due tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const taskDueTomorrow: Task = {
        id: '1',
        title: 'Test Task',
        description: 'Description',
        status: 'pending',
        priority: 'medium',
        type: 'manual',
        assignedTo: null,
        createdAt: new Date(),
        history: [],
        dueDate: tomorrow
      };

      expect(isTaskDueToday(taskDueTomorrow)).toBe(false);
    });

    it('should return false for tasks due yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const taskDueYesterday: Task = {
        id: '1',
        title: 'Test Task',
        description: 'Description',
        status: 'pending',
        priority: 'medium',
        type: 'manual',
        assignedTo: null,
        createdAt: new Date(),
        history: [],
        dueDate: yesterday
      };

      expect(isTaskDueToday(taskDueYesterday)).toBe(false);
    });

    it('should return false for tasks with no due date', () => {
      const taskWithoutDueDate: Task = {
        id: '1',
        title: 'Test Task',
        description: 'Description',
        status: 'pending',
        priority: 'medium',
        type: 'manual',
        assignedTo: null,
        createdAt: new Date(),
        history: [],
        dueDate: undefined
      };

      expect(isTaskDueToday(taskWithoutDueDate)).toBe(false);
    });
  });
});