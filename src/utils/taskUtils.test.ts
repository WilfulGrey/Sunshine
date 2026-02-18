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
    const MY_ID = 42;
    const OTHER_ID = 999;

    const makeTask = (id: string, overrides: Partial<Task> = {}): Task => ({
      id,
      title: `Task ${id}`,
      description: `Description ${id}`,
      status: 'pending',
      priority: 'medium',
      type: 'manual',
      createdAt: new Date(),
      history: [],
      apiData: { caregiverId: Number(id), employeeId: MY_ID },
      ...overrides,
    });

    it('should filter out completed tasks', () => {
      const tasks = [makeTask('1', { status: 'completed' })];
      const result = filterActiveTasks(tasks, new Set(), MY_ID);
      expect(result).toHaveLength(0);
    });

    it('should filter out cancelled tasks', () => {
      const tasks = [makeTask('1', { status: 'cancelled' })];
      const result = filterActiveTasks(tasks, new Set(), MY_ID);
      expect(result).toHaveLength(0);
    });

    it('should include tasks assigned to my employeeId', () => {
      const tasks = [makeTask('1')];
      const result = filterActiveTasks(tasks, new Set(), MY_ID);
      expect(result).toHaveLength(1);
    });

    it('should exclude tasks assigned to other employeeId', () => {
      const tasks = [makeTask('1', { apiData: { caregiverId: 1, employeeId: OTHER_ID } })];
      const result = filterActiveTasks(tasks, new Set(), MY_ID);
      expect(result).toHaveLength(0);
    });

    it('should include unassigned tasks (no employeeId)', () => {
      const tasks = [makeTask('1', { apiData: { caregiverId: 1, employeeId: null } })];
      const result = filterActiveTasks(tasks, new Set(), MY_ID);
      expect(result).toHaveLength(1);
    });

    it('should include taken tasks even if assigned to someone else', () => {
      const tasks = [makeTask('1', { apiData: { caregiverId: 1, employeeId: OTHER_ID } })];
      const result = filterActiveTasks(tasks, new Set(['1']), MY_ID);
      expect(result).toHaveLength(1);
    });

    it('should include tasks without apiData (no employeeId)', () => {
      const tasks = [makeTask('1', { apiData: undefined })];
      const result = filterActiveTasks(tasks, new Set(), MY_ID);
      expect(result).toHaveLength(1);
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
    const MY_ID = 42;

    const makeTask = (id: string, overrides: Partial<Task> = {}): Task => ({
      id,
      title: `Task ${id}`,
      description: `Description ${id}`,
      status: 'pending',
      priority: 'medium',
      type: 'manual',
      createdAt: new Date(),
      history: [],
      apiData: { caregiverId: Number(id), employeeId: MY_ID },
      ...overrides,
    });

    it('should return the next task and upcoming tasks', () => {
      const tasks = [
        makeTask('1', { dueDate: new Date('2024-01-15T10:00:00Z') }),
        makeTask('2', { status: 'completed' }),
        makeTask('3', { priority: 'urgent', dueDate: new Date('2024-01-14T10:00:00Z') }),
      ];
      const result = getProcessedTasks(tasks, new Set(), MY_ID);
      expect(result.nextTask).toBeDefined();
      expect(result.nextTask?.id).toBe('3');
      expect(result.upcomingTasks).toHaveLength(1);
      expect(result.upcomingTasks[0].id).toBe('1');
    });

    it('should return null for nextTask when no active tasks', () => {
      const tasks = [makeTask('1', { status: 'completed' }), makeTask('2', { status: 'completed' })];
      const result = getProcessedTasks(tasks, new Set(), MY_ID);
      expect(result.nextTask).toBeNull();
      expect(result.upcomingTasks).toHaveLength(0);
    });

    it('should return empty upcoming tasks when only one active task', () => {
      const tasks = [makeTask('1', { dueDate: new Date('2024-01-15T10:00:00Z') })];
      const result = getProcessedTasks(tasks, new Set(), MY_ID);
      expect(result.nextTask).toBeDefined();
      expect(result.upcomingTasks).toHaveLength(0);
    });

    it('should hide all far future tasks when showFutureTasks is false', () => {
      const farFutureDate = new Date();
      farFutureDate.setDate(farFutureDate.getDate() + 10);

      const tasks = [
        makeTask('1', { status: 'in_progress', dueDate: new Date() }),
        makeTask('2', { priority: 'high', dueDate: farFutureDate }),
        makeTask('3', { dueDate: farFutureDate }),
      ];

      const result = getProcessedTasks(tasks, new Set(), MY_ID, false);
      expect(result.nextTask?.id).toBe('1');
      expect(result.upcomingTasks).toHaveLength(0);
      expect(result.hiddenFutureTasksCount).toBe(2);
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
        assignedTo: undefined,
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
        assignedTo: undefined,
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
        assignedTo: undefined,
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
        assignedTo: undefined,
        createdAt: new Date(),
        history: [],
        dueDate: undefined
      };

      expect(isTaskDueToday(taskWithoutDueDate)).toBe(false);
    });
  });
});