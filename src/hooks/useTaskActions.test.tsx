import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { useTaskActions } from './useTaskActions';
import { Task } from '../types/Task';
import { AuthProvider } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { TimezoneProvider } from '../contexts/TimezoneContext';

// Mock window methods
const mockAlert = vi.fn();
vi.stubGlobal('alert', mockAlert);

// Mock sunshineService
vi.mock('../services/sunshineService', () => ({
  sunshineService: {
    assignEmployee: vi.fn().mockResolvedValue({}),
    unassignEmployee: vi.fn().mockResolvedValue({}),
    recordContact: vi.fn().mockResolvedValue({}),
    setCallback: vi.fn().mockResolvedValue({}),
    setAvailability: vi.fn().mockResolvedValue({}),
    getLogs: vi.fn().mockResolvedValue({ data: [] }),
    getLatestLog: vi.fn().mockResolvedValue({ data: null }),
  }
}));

// Mock employee mapping
vi.mock('../config/employeeMapping', () => ({
  getEmployeeId: vi.fn((email: string) => email === 'test@example.com' ? 28442 : null),
  getEmployeeName: vi.fn((id: number) => id === 28442 ? 'Test User' : null),
  getAllEmployees: vi.fn(() => [
    { name: 'Test User', email: 'test@example.com', employeeId: 28442, role: 'Admin', team: 'Test' },
    { name: 'Another User', email: 'another@example.com', employeeId: 980, role: 'Recruiter', team: 'Test' }
  ]),
  findEmployeeByName: vi.fn((name: string) => {
    if (name === 'Another User') return { name: 'Another User', email: 'another@example.com', employeeId: 980, role: 'Recruiter', team: 'Test' };
    if (name === 'Test User') return { name: 'Test User', email: 'test@example.com', employeeId: 28442, role: 'Admin', team: 'Test' };
    return null;
  })
}));

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      send: vi.fn().mockResolvedValue({}),
    })),
    removeChannel: vi.fn(),
  }
}));

// Mock the contexts
vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    user: {
      id: 'test-user-id',
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

vi.mock('../utils/sunshineHelpers', () => ({
  formatDateForApi: vi.fn((date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${mi}:${s}`;
  })
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
  const MY_EMPLOYEE_ID = 28442;
  const OTHER_EMPLOYEE_ID = 980;

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
      apiData: {
        caregiverId: 123,
        employeeId: MY_EMPLOYEE_ID,
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
      history: [],
      apiData: {
        caregiverId: 456,
        employeeId: null
      }
    }
  ];

  const mockOnUpdateLocalTask = vi.fn();
  const mockOnRemoveLocalTask = vi.fn();
  const mockOnLoadContacts = vi.fn();
  const mockOnSilentRefresh = vi.fn();

  beforeEach(async () => {
    mockOnUpdateLocalTask.mockClear();
    mockOnRemoveLocalTask.mockClear();
    mockOnLoadContacts.mockClear();
    mockOnSilentRefresh.mockClear();
    mockAlert.mockClear();

    // Clear all sunshineService mocks between tests
    const { sunshineService } = await import('../services/sunshineService');
    vi.mocked(sunshineService.assignEmployee).mockClear();
    vi.mocked(sunshineService.unassignEmployee).mockClear();
    vi.mocked(sunshineService.recordContact).mockClear();
    vi.mocked(sunshineService.setCallback).mockClear();
  });

  describe('initialization', () => {
    it('should initialize with correct current user name', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask, mockOnLoadContacts, mockOnSilentRefresh),
        { wrapper: Wrapper }
      );

      expect(result.current.currentUserName).toBe('Test User');
    });

    it('should initialize with correct employee ID', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      expect(result.current.currentEmployeeId).toBe(28442);
    });

    it('should initialize with empty taken tasks and no taking task', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      expect(result.current.takenTasks.size).toBe(0);
      expect(result.current.takingTask).toBeNull();
    });
  });

  describe('extractPhoneNumber', () => {
    it('should extract phone number from apiData', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      const phoneNumber = result.current.extractPhoneNumber(mockTasks[0]);
      expect(phoneNumber).toBe('+48123456789');
    });

    it('should return default number when no apiData phone number', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      const taskWithoutPhone: Task = { ...mockTasks[1], apiData: { caregiverId: 456 } };
      const phoneNumber = result.current.extractPhoneNumber(taskWithoutPhone);
      expect(phoneNumber).toBe('+48 XXX XXX XXX');
    });
  });

  describe('isTaskAssignedToMe', () => {
    it('should return true for task assigned to current user', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      expect(result.current.isTaskAssignedToMe(mockTasks[0])).toBe(true);
    });

    it('should return false for unassigned task', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      expect(result.current.isTaskAssignedToMe(mockTasks[1])).toBe(false);
    });

    it('should return true for taken task', async () => {
      const unassignedTask: Task = {
        ...mockTasks[1],
        assignedTo: undefined,
        apiData: { caregiverId: 456 }
      };

      const { result } = renderHook(
        () => useTaskActions([mockTasks[0], unassignedTask], mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleTakeTask('2');
      });

      expect(result.current.isTaskAssignedToMe(unassignedTask)).toBe(true);
    });
  });

  describe('handleTakeTask', () => {
    it('should take a task successfully via API', async () => {
      const unassignedTask: Task = {
        ...mockTasks[1],
        assignedTo: undefined,
        apiData: { caregiverId: 456 }
      };

      const { sunshineService } = await import('../services/sunshineService');

      const { result } = renderHook(
        () => useTaskActions([mockTasks[0], unassignedTask], mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleTakeTask('2');
      });

      expect(result.current.takenTasks.has('2')).toBe(true);
      expect(sunshineService.assignEmployee).toHaveBeenCalledWith(456, 28442);
      expect(mockOnUpdateLocalTask).toHaveBeenCalledWith('2', expect.objectContaining({
        status: 'pending',
        assignedTo: 'Test User',
      }));
    });

    it('should not take task if already taking it', async () => {
      const unassignedTask: Task = {
        ...mockTasks[1],
        assignedTo: undefined,
        apiData: { caregiverId: 456 }
      };

      const { result } = renderHook(
        () => useTaskActions([mockTasks[0], unassignedTask], mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleTakeTask('2');
      });

      expect(mockOnUpdateLocalTask).toHaveBeenCalledTimes(1);
    });

    it('should handle task not found', async () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleTakeTask('nonexistent');
      });

      expect(mockOnUpdateLocalTask).not.toHaveBeenCalled();
    });

    it('should prevent taking task assigned to someone else', async () => {
      const taskAssignedToOther: Task = {
        ...mockTasks[1],
        apiData: { caregiverId: 456, employeeId: OTHER_EMPLOYEE_ID }
      };

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const { result } = renderHook(
        () => useTaskActions([taskAssignedToOther], mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleTakeTask('2');
      });

      expect(alertSpy).toHaveBeenCalledWith('To zadanie jest już przypisane do: inny użytkownik');
      expect(mockOnUpdateLocalTask).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });

    it('should prevent taking task already assigned to current user', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleTakeTask('1');
      });

      expect(alertSpy).toHaveBeenCalledWith('To zadanie jest już przypisane do Ciebie.');
      expect(mockOnUpdateLocalTask).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  describe('handlePhoneCall', () => {
    it('should handle reachable call - update local status only, no API call', async () => {
      const { sunshineService } = await import('../services/sunshineService');

      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handlePhoneCall(mockTasks[0], true);
      });

      // Should NOT call recordContact - that happens later via handleCompleteTask
      expect(sunshineService.recordContact).not.toHaveBeenCalled();
      expect(mockOnUpdateLocalTask).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'in_progress'
      }));
    });

    it('should handle unreachable call with callback + note', async () => {
      const { sunshineService } = await import('../services/sunshineService');

      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handlePhoneCall(mockTasks[0], false);
      });

      expect(sunshineService.setCallback).toHaveBeenCalledWith(123, expect.any(String));
      expect(sunshineService.recordContact).toHaveBeenCalledWith(123, 'note_only', expect.stringContaining('Nicht erreicht'));

      expect(mockOnUpdateLocalTask).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'pending'
      }));

      const updateCall = mockOnUpdateLocalTask.mock.calls[0][1];
      expect(updateCall.dueDate).toBeInstanceOf(Date);
      expect(updateCall.description).toContain('Nicht erreicht');
    });

    it('should clear boosted priority when call is not reachable', async () => {
      const boostedTask: Task = { ...mockTasks[0], priority: 'boosted' };
      const { result } = renderHook(
        () => useTaskActions([boostedTask], mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handlePhoneCall(boostedTask, false);
      });

      expect(mockOnUpdateLocalTask).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'pending',
        priority: 'high',
      }));
    });
  });

  describe('handleCompleteTask', () => {
    it('should record successful contact via API without removing task', async () => {
      const { sunshineService } = await import('../services/sunshineService');

      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleCompleteTask(mockTasks[0], 'Task completed successfully');
      });

      expect(sunshineService.recordContact).toHaveBeenCalledWith(123, 'successfully', 'Test User: Task completed successfully');
      expect(mockOnRemoveLocalTask).not.toHaveBeenCalled();
    });

    it('should include user name even with empty summary', async () => {
      const { sunshineService } = await import('../services/sunshineService');

      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleCompleteTask(mockTasks[0], '');
      });

      expect(sunshineService.recordContact).toHaveBeenCalledWith(123, 'successfully', 'Test User: ');
      expect(mockOnRemoveLocalTask).not.toHaveBeenCalled();
    });
  });

  describe('handleCloseTask', () => {
    it('should close task with note_only contact type and remove from local list', async () => {
      const { sunshineService } = await import('../services/sunshineService');

      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleCloseTask(mockTasks[0], 'Zrobiono wklejkę', 'Wklejka do rodziny Müller');
      });

      expect(sunshineService.recordContact).toHaveBeenCalledWith(123, 'note_only', 'Test User zakończył task - Zrobiono wklejkę: Wklejka do rodziny Müller');
      expect(sunshineService.setCallback).toHaveBeenCalledWith(123, null);
      expect(sunshineService.unassignEmployee).toHaveBeenCalledWith(123);
      expect(mockOnRemoveLocalTask).toHaveBeenCalledWith('1');
    });

    it('should close task without notes', async () => {
      const { sunshineService } = await import('../services/sunshineService');

      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleCloseTask(mockTasks[0], 'Dostępna później', '');
      });

      expect(sunshineService.recordContact).toHaveBeenCalledWith(123, 'note_only', 'Test User zakończył task - Dostępna później');
      expect(mockOnRemoveLocalTask).toHaveBeenCalledWith('1');
    });
  });

  describe('handleAbandonTask', () => {
    it('should abandon task via API and remove from local list', async () => {
      const { sunshineService } = await import('../services/sunshineService');

      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleAbandonTask(mockTasks[0], 'Wrong contact');
      });

      expect(sunshineService.recordContact).toHaveBeenCalledWith(123, 'not_successfully', 'Test User: Wrong contact');
      expect(sunshineService.unassignEmployee).toHaveBeenCalledWith(123);
      expect(mockOnRemoveLocalTask).toHaveBeenCalledWith('1');
    });
  });

  describe('handleTransferTask', () => {
    it('should transfer task to another user via API and remove from local list', async () => {
      const { sunshineService } = await import('../services/sunshineService');

      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleTransferTask(mockTasks[0], 'Another User', 'Expertise needed');
      });

      expect(sunshineService.assignEmployee).toHaveBeenCalledWith(123, 980);
      expect(sunshineService.recordContact).toHaveBeenCalledWith(123, 'note_only', expect.stringContaining('Another User'));
      expect(mockOnRemoveLocalTask).toHaveBeenCalledWith('1');
    });

    it('should alert when target employee not found', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleTransferTask(mockTasks[0], 'Unknown User', 'reason');
      });

      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Nie znaleziono employee_id'));
      expect(mockOnRemoveLocalTask).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  describe('handlePostponeTask', () => {
    it('should postpone task via API with new callback date', async () => {
      const { sunshineService } = await import('../services/sunshineService');

      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handlePostponeTask(
          mockTasks[0],
          '2024-01-15',
          '14:30',
          'Need more time'
        );
      });

      expect(sunshineService.setCallback).toHaveBeenCalledWith(123, expect.any(String));
      expect(sunshineService.recordContact).toHaveBeenCalledWith(123, 'note_only', 'Need more time');
      expect(mockOnUpdateLocalTask).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'pending',
      }));

      const updateCall = mockOnUpdateLocalTask.mock.calls[0][1];
      expect(updateCall.dueDate).toBeInstanceOf(Date);
    });

    it('should not send note when postponeNotes is empty', async () => {
      const { sunshineService } = await import('../services/sunshineService');
      vi.mocked(sunshineService.recordContact).mockClear();

      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handlePostponeTask(
          mockTasks[0],
          '2024-01-15',
          '14:30',
          ''
        );
      });

      expect(sunshineService.setCallback).toHaveBeenCalledWith(123, expect.any(String));
      expect(sunshineService.recordContact).not.toHaveBeenCalled();
    });

    it('should clear boosted priority when postponing task', async () => {
      const boostedTask: Task = { ...mockTasks[0], priority: 'boosted' };
      const { result } = renderHook(
        () => useTaskActions([boostedTask], mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handlePostponeTask(
          boostedTask,
          '2024-01-15',
          '14:30',
          'Need more time'
        );
      });

      expect(mockOnUpdateLocalTask).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'pending',
        priority: 'high',
      }));
    });
  });

  describe('handleUnassignTask', () => {
    it('should unassign task via API', async () => {
      const { sunshineService } = await import('../services/sunshineService');

      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleUnassignTask(mockTasks[0]);
      });

      expect(sunshineService.unassignEmployee).toHaveBeenCalledWith(123);
      expect(mockOnUpdateLocalTask).toHaveBeenCalledWith('1', expect.objectContaining({
        assignedTo: undefined,
        status: 'pending',
      }));
    });
  });

  describe('boost functions', () => {
    it('should boost task priority and reset current active task', async () => {
      const { sunshineService } = await import('../services/sunshineService');

      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleBoostPriority('1');
      });

      // Should update the active task first, then boost the selected task
      expect(mockOnUpdateLocalTask).toHaveBeenCalledTimes(2);

      // First call resets the in_progress task
      expect(mockOnUpdateLocalTask).toHaveBeenNthCalledWith(1, '2', expect.objectContaining({
        status: 'pending'
      }));

      // Second call boosts the selected task
      expect(mockOnUpdateLocalTask).toHaveBeenNthCalledWith(2, '1', expect.objectContaining({
        priority: 'boosted',
        status: 'in_progress',
      }));

      // Task already assigned to me - should NOT call assignEmployee, only setCallback
      expect(sunshineService.assignEmployee).not.toHaveBeenCalledWith(123, 28442);
      expect(sunshineService.setCallback).toHaveBeenCalledWith(123, expect.any(String));
    });

    it('should boost urgent task and assign user', async () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      await act(async () => {
        await result.current.handleBoostUrgent('1');
      });

      expect(mockOnUpdateLocalTask).toHaveBeenCalledWith('1', expect.objectContaining({
        priority: 'boosted',
        status: 'pending',
      }));
    });

    it('should handle removeUrgent as no-op', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      act(() => {
        result.current.handleRemoveUrgent('1');
      });

      expect(mockOnUpdateLocalTask).not.toHaveBeenCalled();
    });
  });

  describe('isTaskAssignedToSomeoneElse', () => {
    it('should return false for unassigned task (no employeeId)', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      expect(result.current.isTaskAssignedToSomeoneElse(mockTasks[1])).toBe(false);
    });

    it('should return true for task with different employeeId', () => {
      const taskAssignedToOther: Task = {
        ...mockTasks[1],
        apiData: { caregiverId: 456, employeeId: OTHER_EMPLOYEE_ID }
      };

      const { result } = renderHook(
        () => useTaskActions([taskAssignedToOther], mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      expect(result.current.isTaskAssignedToSomeoneElse(taskAssignedToOther)).toBe(true);
    });

    it('should return false for task with my employeeId', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      expect(result.current.isTaskAssignedToSomeoneElse(mockTasks[0])).toBe(false);
    });
  });

  describe('canTakeTask', () => {
    it('should return true for unassigned task (no employeeId)', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      expect(result.current.canTakeTask(mockTasks[1])).toBe(true);
    });

    it('should return false for task with my employeeId', () => {
      const { result } = renderHook(
        () => useTaskActions(mockTasks, mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      expect(result.current.canTakeTask(mockTasks[0])).toBe(false);
    });

    it('should return false for task with other employeeId', () => {
      const taskAssignedToOther: Task = {
        ...mockTasks[1],
        apiData: { caregiverId: 456, employeeId: OTHER_EMPLOYEE_ID }
      };

      const { result } = renderHook(
        () => useTaskActions([taskAssignedToOther], mockOnUpdateLocalTask, mockOnRemoveLocalTask),
        { wrapper: Wrapper }
      );

      expect(result.current.canTakeTask(taskAssignedToOther)).toBe(false);
    });
  });
});
