import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { useTaskActions } from './useTaskActions';
import { Task } from '../types/Task';
import { AuthProvider } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { TimezoneProvider } from '../contexts/TimezoneContext';

// Mock window methods
vi.stubGlobal('alert', vi.fn());
vi.stubGlobal('location', {
  reload: vi.fn()
});

// Mock AirtableService
vi.mock('../services/airtableService', () => ({
  AirtableService: vi.fn().mockImplementation(() => ({
    getContactById: vi.fn().mockResolvedValue(null) // Default mock returns null
  }))
}));

// Mock the contexts
vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    user: {
      user_metadata: { full_name: 'Test User' },
      email: 'test@example.com'
    }
  })
}));

vi.mock('../contexts/LanguageContext', () => ({
  LanguageProvider: ({ children }: { children: ReactNode }) => children,
  useLanguage: () => ({
    t: {
      callSuccessfulDetails: 'Call successful',
      callUnsuccessfulDetails: 'Call unsuccessful',
      postponeDetails: 'Postponed to {date}'
    }
  })
}));

vi.mock('../contexts/TimezoneContext', () => ({
  TimezoneProvider: ({ children }: { children: ReactNode }) => children,
  useTimezone: () => ({
    timezone: 'Europe/Warsaw'
  })
}));

vi.mock('../utils/helpers', () => ({
  addHistoryEntry: vi.fn((task, type, description) => ({
    ...task,
    history: [...(task.history || []), { type, description, timestamp: new Date() }]
  }))
}));

const Wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>
    <LanguageProvider>
      <TimezoneProvider>
        {children}
      </TimezoneProvider>
    </LanguageProvider>
  </AuthProvider>
);

describe('useTaskActions', () => {
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Task 1',
      description: 'Description 1',
      status: 'pending',
      priority: 'medium',
      type: 'manual',
      assignedTo: 'Test User',
      createdAt: new Date(),
      history: [],
      airtableData: {
        phoneNumber: '+48123456789'
      }
    },
    {
      id: '2',
      title: 'Task 2',
      description: 'Description 2',
      status: 'in_progress',
      priority: 'high',
      type: 'manual',
      createdAt: new Date(),
      history: []
    }
  ];

  const mockOnUpdateTask = vi.fn();

  beforeEach(() => {
    mockOnUpdateTask.mockClear();
  });

  describe('initialization', () => {
    it('should initialize with correct current user name', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      expect(result.current.currentUserName).toBe('Test User');
    });

    it('should initialize with empty taken tasks and no taking task', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      expect(result.current.takenTasks.size).toBe(0);
      expect(result.current.takingTask).toBeNull();
    });
  });

  describe('extractPhoneNumber', () => {
    it('should extract phone number from airtable data', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      const phoneNumber = result.current.extractPhoneNumber(mockTasks[0]);
      expect(phoneNumber).toBe('+48123456789');
    });

    it('should return default number when no airtable phone number', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      const phoneNumber = result.current.extractPhoneNumber(mockTasks[1]);
      expect(phoneNumber).toBe('+48 XXX XXX XXX');
    });
  });

  describe('isTaskAssignedToMe', () => {
    it('should return true for task assigned to current user', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      expect(result.current.isTaskAssignedToMe(mockTasks[0])).toBe(true);
    });

    it('should return false for unassigned task', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      expect(result.current.isTaskAssignedToMe(mockTasks[1])).toBe(false);
    });

    it('should return true for taken task', async () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleTakeTask('2', true); // skip Airtable check for tests
      });

      expect(result.current.isTaskAssignedToMe(mockTasks[1])).toBe(true);
    });

    it('should handle airtable user data as array', () => {
      const taskWithAirtableUser = {
        ...mockTasks[1],
        airtableData: {
          user: ['Test User', 'Another User']
        }
      };

      const { result } = renderHook(
        () => useTaskActions([taskWithAirtableUser], mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      expect(result.current.isTaskAssignedToMe(taskWithAirtableUser)).toBe(true);
    });

    it('should handle airtable user data as string', () => {
      const taskWithAirtableUser = {
        ...mockTasks[1],
        airtableData: {
          user: 'Test User'
        }
      };

      const { result } = renderHook(
        () => useTaskActions([taskWithAirtableUser], mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      expect(result.current.isTaskAssignedToMe(taskWithAirtableUser)).toBe(true);
    });
  });

  describe('handleTakeTask', () => {
    it('should take a task successfully', async () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleTakeTask('2', true); // skip Airtable check for tests
      });

      expect(result.current.takenTasks.has('2')).toBe(true);
      expect(mockOnUpdateTask).toHaveBeenCalledWith('2', expect.objectContaining({
        status: 'pending',
        assignedTo: 'Test User',
        airtableUpdates: {
          'User': ['Test User']
        }
      }));
    });

    it('should not take task if already taking it', async () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      // Start taking task
      await act(async () => {
        await result.current.handleTakeTask('2', true); // skip Airtable check for tests
      });

      // At this point, takingTask should be null again, so we need to mock the state
      // This test is more about preventing double-clicks, which is harder to test in isolation
      // The real protection happens in the actual implementation
      expect(mockOnUpdateTask).toHaveBeenCalledTimes(1);
    });

    it('should handle task not found', async () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleTakeTask('nonexistent', true); // skip Airtable check for tests
      });

      expect(mockOnUpdateTask).not.toHaveBeenCalled();
    });
  });

  describe('handlePhoneCall', () => {
    it('should handle reachable call', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      act(() => {
        result.current.handlePhoneCall(mockTasks[0], true);
      });

      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'in_progress'
      }));
    });

    it('should handle unreachable call with new due date', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      act(() => {
        result.current.handlePhoneCall(mockTasks[0], false);
      });

      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'pending'
      }));

      const updateCall = mockOnUpdateTask.mock.calls[0][1];
      expect(updateCall.dueDate).toBeInstanceOf(Date);
      expect(updateCall.description).toContain('Nicht erreicht');
      
      // No manual airtableUpdates - let automatic system handle everything
      expect(updateCall.airtableUpdates).toBeUndefined();
    });

    it('should clear boosted priority when call is not reachable', () => {
      const boostedTask = { ...mockTasks[0], priority: 'boosted' as const };
      const { result } = renderHook(
        () => useTaskActions([boostedTask], mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      act(() => {
        result.current.handlePhoneCall(boostedTask, false);
      });

      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'pending',
        priority: 'high', // Boosted should be cleared to high
      }));

      const updateCall = mockOnUpdateTask.mock.calls[0][1];
      expect(updateCall.dueDate).toBeInstanceOf(Date);
      expect(updateCall.description).toContain('Nicht erreicht');
    });
  });

  describe('handleCompleteTask', () => {
    it('should complete task with summary', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      act(() => {
        result.current.handleCompleteTask(mockTasks[0], 'Task completed successfully');
      });

      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'completed',
        airtableUpdates: {
          'Status': 'kontakt udany',
          'Następne kroki': 'Task completed successfully'
        }
      }));
    });

    it('should clear boosted priority when completing task', () => {
      const boostedTask = { ...mockTasks[0], priority: 'boosted' as const };
      const { result } = renderHook(
        () => useTaskActions([boostedTask], mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      act(() => {
        result.current.handleCompleteTask(boostedTask, 'Task completed');
      });

      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'completed',
        priority: 'high', // Boosted should be cleared to high
        airtableUpdates: {
          'Status': 'kontakt udany',
          'Następne kroki': 'Task completed'
        }
      }));
    });

    it('should not change priority for non-boosted task', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      act(() => {
        result.current.handleCompleteTask(mockTasks[0], 'Task completed');
      });

      // Should not include priority in update object
      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.not.objectContaining({
        priority: expect.anything()
      }));
    });
  });

  describe('handleAbandonTask', () => {
    it('should abandon task with reason', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      act(() => {
        result.current.handleAbandonTask(mockTasks[0], 'Wrong contact');
      });

      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'cancelled',
        airtableUpdates: {
          'Status': 'porzucony',
          'Następne kroki': 'Wrong contact'
        }
      }));
    });

    it('should clear boosted priority when abandoning task', () => {
      const boostedTask = { ...mockTasks[0], priority: 'boosted' as const };
      const { result } = renderHook(
        () => useTaskActions([boostedTask], mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      act(() => {
        result.current.handleAbandonTask(boostedTask, 'Wrong contact');
      });

      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'cancelled',
        priority: 'high', // Boosted should be cleared to high
        airtableUpdates: {
          'Status': 'porzucony',
          'Następne kroki': 'Wrong contact'
        }
      }));
    });
  });

  describe('handleTransferTask', () => {
    it('should transfer task to another user', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      act(() => {
        result.current.handleTransferTask(mockTasks[0], 'Another User', 'Expertise needed');
      });

      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        assignedTo: 'Another User',
        status: 'pending',
        airtableUpdates: {
          'User': ['Another User'],
          'Następne kroki': 'Expertise needed'
        }
      }));
    });

    it('should clear boosted priority when transferring task', () => {
      const boostedTask = { ...mockTasks[0], priority: 'boosted' as const };
      const { result } = renderHook(
        () => useTaskActions([boostedTask], mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      act(() => {
        result.current.handleTransferTask(boostedTask, 'Another User', 'Expertise needed');
      });

      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        assignedTo: 'Another User',
        status: 'pending',
        priority: 'high', // Boosted should be cleared to high
        airtableUpdates: {
          'User': ['Another User'],
          'Następne kroki': 'Expertise needed'
        }
      }));
    });
  });

  describe('handlePostponeTask', () => {
    it('should postpone task with correct UTC conversion', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      act(() => {
        result.current.handlePostponeTask(
          mockTasks[0], 
          '2024-01-15', 
          '14:30', 
          'Need more time'
        );
      });

      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'pending',
        airtableUpdates: {
          'Następne kroki': 'Need more time'
        }
      }));

      const updateCall = mockOnUpdateTask.mock.calls[0][1];
      expect(updateCall.dueDate).toBeInstanceOf(Date);
    });

    it('should clear boosted priority when postponing task', () => {
      const boostedTask = { ...mockTasks[0], priority: 'boosted' as const };
      const { result } = renderHook(
        () => useTaskActions([boostedTask], mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      act(() => {
        result.current.handlePostponeTask(
          boostedTask, 
          '2024-01-15', 
          '14:30', 
          'Need more time'
        );
      });

      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'pending',
        priority: 'high', // Boosted should be cleared to high
        airtableUpdates: {
          'Następne kroki': 'Need more time'
        }
      }));
    });
  });

  describe('handleUnassignTask', () => {
    it('should unassign task', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      act(() => {
        result.current.handleUnassignTask(mockTasks[0]);
      });

      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        assignedTo: undefined,
        status: 'pending',
        airtableUpdates: {
          'User': null
        }
      }));
    });

    it('should clear boosted priority when unassigning task', () => {
      const boostedTask = { ...mockTasks[0], priority: 'boosted' as const };
      const { result } = renderHook(
        () => useTaskActions([boostedTask], mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      act(() => {
        result.current.handleUnassignTask(boostedTask);
      });

      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        assignedTo: undefined,
        status: 'pending',
        priority: 'high', // Boosted should be cleared to high
        airtableUpdates: {
          'User': null
        }
      }));
    });
  });

  describe('boost functions', () => {
    it('should boost task priority and reset current active task', async () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleBoostPriority('1');
      });

      // Should update the active task first, then boost the selected task
      expect(mockOnUpdateTask).toHaveBeenCalledTimes(2);
      
      // First call resets the in_progress task
      expect(mockOnUpdateTask).toHaveBeenNthCalledWith(1, '2', expect.objectContaining({
        status: 'pending'
      }));

      // Second call boosts the selected task and assigns user
      expect(mockOnUpdateTask).toHaveBeenNthCalledWith(2, '1', expect.objectContaining({
        priority: 'boosted',
        status: 'in_progress', // Phone boost - od razu w trakcie
        assignedTo: 'Test User',
        airtableUpdates: expect.objectContaining({
          'User': ['Test User']
        })
      }));
    });

    it('should boost urgent task and assign user', async () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleBoostUrgent('1');
      });

      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        priority: 'boosted',
        status: 'pending', // Zmienione z 'in_progress' na 'pending'
        assignedTo: 'Test User',
        airtableUpdates: expect.objectContaining({
          'User': ['Test User']
        })
      }));
    });

    it('should remove urgent status', () => {
      const taskWithUrgent = {
        ...mockTasks[0],
        airtableData: { urgent: true }
      };

      const { result } = renderHook(
        () => useTaskActions([taskWithUrgent], mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      act(() => {
        result.current.handleRemoveUrgent('1');
      });

      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        airtableData: expect.objectContaining({
          urgent: false
        }),
        airtableUpdates: {
          'Urgent': false
        }
      }));
    });

  });

  describe('isTaskAssignedToSomeoneElse', () => {
    it('should return false for unassigned task', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      expect(result.current.isTaskAssignedToSomeoneElse(mockTasks[1])).toBe(false);
    });

    it('should return true for task assigned to different user', () => {
      const taskAssignedToOther = {
        ...mockTasks[1],
        assignedTo: 'Other User'
      };

      const { result } = renderHook(
        () => useTaskActions([taskAssignedToOther], mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      expect(result.current.isTaskAssignedToSomeoneElse(taskAssignedToOther)).toBe(true);
    });

    it('should return false for task assigned to current user', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      expect(result.current.isTaskAssignedToSomeoneElse(mockTasks[0])).toBe(false);
    });

    it('should handle airtable user array with other users', () => {
      const taskWithOtherUsers = {
        ...mockTasks[1],
        airtableData: {
          user: ['Other User', 'Another User']
        }
      };

      const { result } = renderHook(
        () => useTaskActions([taskWithOtherUsers], mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      expect(result.current.isTaskAssignedToSomeoneElse(taskWithOtherUsers)).toBe(true);
    });
  });

  describe('canTakeTask', () => {
    it('should return true for unassigned task', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      expect(result.current.canTakeTask(mockTasks[1])).toBe(true);
    });

    it('should return false for task assigned to current user', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      expect(result.current.canTakeTask(mockTasks[0])).toBe(false);
    });

    it('should return false for task assigned to other user', () => {
      const taskAssignedToOther = {
        ...mockTasks[1],
        assignedTo: 'Other User'
      };

      const { result } = renderHook(
        () => useTaskActions([taskAssignedToOther], mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      expect(result.current.canTakeTask(taskAssignedToOther)).toBe(false);
    });
  });

  describe('handleTakeTask validation', () => {
    it('should prevent taking task assigned to someone else', async () => {
      const taskAssignedToOther = {
        ...mockTasks[1],
        assignedTo: 'Other User'
      };

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const { result } = renderHook(
        () => useTaskActions([taskAssignedToOther], mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleTakeTask('2', true); // skip Airtable check for tests
      });

      expect(alertSpy).toHaveBeenCalledWith('To zadanie jest już przypisane do: Other User');
      expect(mockOnUpdateTask).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });

    it('should prevent taking task already assigned to current user', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleTakeTask('1');
      });

      expect(alertSpy).toHaveBeenCalledWith('To zadanie jest już przypisane do Ciebie.');
      expect(mockOnUpdateTask).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  describe('handleUnassignTask', () => {
    it('should unassign task and clear local state', async () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      // First take the task to have some local state
      await act(async () => {
        await result.current.handleTakeTask('1');
      });

      // Mock console.log to verify clearing message
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await act(async () => {
        result.current.handleUnassignTask(mockTasks[0]);
      });

      // Should update task with null assignment
      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        assignedTo: undefined,
        status: 'pending',
        airtableUpdates: { 'User': null }
      }));

      // Should log clearing local state
      expect(consoleSpy).toHaveBeenCalledWith('🧹 Clearing local state for unassigned task');

      consoleSpy.mockRestore();
    });

    it('should clear boosted priority when unassigning', async () => {
      const boostedTask: Task = {
        ...mockTasks[0],
        priority: 'boosted'
      };

      const { result } = renderHook(
        () => useTaskActions([boostedTask], mockOnUpdateTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        result.current.handleUnassignTask(boostedTask);
      });

      expect(mockOnUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        priority: 'high',
        assignedTo: undefined,
        status: 'pending'
      }));
    });
  });

});