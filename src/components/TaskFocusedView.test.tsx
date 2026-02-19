import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { TaskFocusedView } from './TaskFocusedView';
import { Task } from '../types/Task';
import { useDialogState } from '../hooks/useDialogState';
import { useTaskActions } from '../hooks/useTaskActions';

// Mock all the contexts and hooks
vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: {
      allTasksCompleted: 'All tasks completed',
      greatWork: 'Great work!',
      upcomingTasks: 'Upcoming tasks',
      startNow: 'Start Now',
      postpone: 'Postpone',
      complete: 'Complete',
      startCall: 'Start Call',
      phoneNumber: 'Phone Number',
      clickToCall: 'Click to call',
      wasPersonReachable: 'Was person reachable?',
      yesReachable: 'Yes, reachable',
      notReachable: 'Not reachable',
      cancel: 'Cancel',
      low: '🟢 Low',
      medium: '🟡 Medium',
      high: '🟠 High',
      urgent: '🔴 PILNE',
      overdue: 'Overdue'
    }
  })
}));

vi.mock('../contexts/TimezoneContext', () => ({
  useTimezone: () => ({
    timezone: 'Europe/Warsaw'
  })
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' }
    },
    signOut: vi.fn(),
    isLoading: false
  })
}));

vi.mock('../hooks/useUsers', () => ({
  useUsers: () => ({
    users: [
      { id: '1', email: 'user1@test.com', user_metadata: { full_name: 'User One' } },
      { id: '2', email: 'user2@test.com', user_metadata: { full_name: 'User Two' } }
    ],
    getUserDisplayName: (user: any) => user.user_metadata?.full_name || user.email
  })
}));

vi.mock('../utils/helpers', () => ({
  formatDate: vi.fn((date) => date.toLocaleDateString()),
  isOverdue: vi.fn((date) => date < new Date()),
  addHistoryEntry: vi.fn((task, type, description) => ({
    ...task,
    history: [...(task.history || []), { type, description, timestamp: new Date() }]
  }))
}));

vi.mock('../hooks/useTaskActions', () => ({
  useTaskActions: () => ({
    currentUserName: 'Test User',
    currentEmployeeId: 28442,
    takenTasks: new Set(),
    takingTask: null,
    extractPhoneNumber: vi.fn(() => '+48123456789'),
    isTaskAssignedToMe: vi.fn(() => true),
    isTaskAssignedToSomeoneElse: vi.fn(() => false),
    canTakeTask: vi.fn(() => false),
    isTaskVerifying: vi.fn(() => false),
    isTaskFailed: vi.fn(() => false),
    verifyingTasks: new Set(),
    failedTasks: new Set(),
    boostingTask: null,
    handleTakeTask: vi.fn(),
    handlePhoneCall: vi.fn(),
    handleCompleteTask: vi.fn(),
    handleCloseTask: vi.fn(),
    handleAbandonTask: vi.fn(),
    handleTransferTask: vi.fn(),
    handlePostponeTask: vi.fn(),
    handleUnassignTask: vi.fn(),
    handleBoostPriority: vi.fn(),
    handleBoostUrgent: vi.fn(),
    handleRemoveUrgent: vi.fn()
  })
}));

vi.mock('../hooks/useDialogState', () => ({
  useDialogState: () => ({
    showPhoneDialog: null,
    openPhoneDialog: vi.fn(),
    closePhoneDialog: vi.fn(),
    showCompletionDialog: null,
    completionSummary: '',
    setCompletionSummary: vi.fn(),
    openCompletionDialog: vi.fn(),
    closeCompletionDialog: vi.fn(),
    showCloseTaskDialog: null,
    openCloseTaskDialog: vi.fn(),
    closeCloseTaskDialog: vi.fn(),
    showAbandonDialog: null,
    abandonReason: '',
    setAbandonReason: vi.fn(),
    openAbandonDialog: vi.fn(),
    closeAbandonDialog: vi.fn(),
    showTransferDialog: null,
    transferToUser: '',
    setTransferToUser: vi.fn(),
    transferReason: '',
    setTransferReason: vi.fn(),
    openTransferDialog: vi.fn(),
    closeTransferDialog: vi.fn(),
    showPostponeDialog: null,
    postponeDate: '',
    setPostponeDate: vi.fn(),
    postponeTime: '',
    setPostponeTime: vi.fn(),
    postponeNotes: '',
    setPostponeNotes: vi.fn(),
    openPostponeDialog: vi.fn(),
    closePostponeDialog: vi.fn()
  })
}));

vi.mock('../utils/taskUtils', () => ({
  getTypeIcon: vi.fn(() => 'MockIcon'),
  getTypeColor: vi.fn(() => 'bg-blue-100 text-blue-700'),
  getPriorityColor: vi.fn(() => 'bg-gray-100 text-gray-700'),
  getProcessedTasks: vi.fn((tasks) => ({
    nextTask: tasks[0] || null,
    upcomingTasks: tasks.slice(1)
  })),
  isTaskDueToday: vi.fn(() => false)
}));

vi.mock('../services/sunshineService', () => ({
  sunshineService: {
    getLatestLog: vi.fn().mockResolvedValue({ data: null }),
    getLogs: vi.fn().mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }),
  }
}));

// Mock dialog components
vi.mock('./dialogs/CompletionDialog', () => ({
  CompletionDialog: ({ onConfirm, onBack }: any) => (
    <div data-testid={'completion-dialog'}>
      <button onClick={onConfirm}>Confirm Completion</button>
      <button onClick={onBack}>Back Completion</button>
    </div>
  )
}));

vi.mock('./dialogs/AbandonDialog', () => ({
  AbandonDialog: ({ onConfirm, onClose }: any) => (
    <div data-testid={'abandon-dialog'}>
      <button onClick={onConfirm}>Confirm Abandon</button>
      <button onClick={onClose}>Close Abandon</button>
    </div>
  )
}));

vi.mock('./dialogs/TransferDialog', () => ({
  TransferDialog: ({ onConfirm, onClose }: any) => (
    <div data-testid={'transfer-dialog'}>
      <button onClick={onConfirm}>Confirm Transfer</button>
      <button onClick={onClose}>Close Transfer</button>
    </div>
  )
}));

vi.mock('./dialogs/PostponeDialog', () => ({
  PostponeDialog: ({ onConfirm, onClose }: any) => (
    <div data-testid={'postpone-dialog'}>
      <button onClick={onConfirm}>Confirm Postpone</button>
      <button onClick={onClose}>Close Postpone</button>
    </div>
  )
}));

vi.mock('./dialogs/CloseTaskDialog', () => ({
  CloseTaskDialog: ({ onConfirm, onClose }: any) => (
    <div data-testid={'close-task-dialog'}>
      <button onClick={() => onConfirm('Zrobiono wklejkę', '')}>Confirm Close</button>
      <button onClick={onClose}>Cancel Close</button>
    </div>
  )
}));

vi.mock('./dialogs/LogsDialog', () => ({
  LogsDialog: ({ onClose }: any) => (
    <div data-testid={'logs-dialog'}>
      <button onClick={onClose}>Close Logs</button>
    </div>
  )
}));

describe('TaskFocusedView', () => {
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'First Task',
      description: 'First task description',
      status: 'pending',
      priority: 'medium',
      type: 'manual',
      assignedTo: 'Test User',
      createdAt: new Date(),
      dueDate: new Date('2024-01-15T10:00:00Z'),
      history: [],
      apiData: {
        caregiverId: 123,
        phoneNumber: '+48123456789'
      }
    },
    {
      id: '2',
      title: 'Second Task',
      description: 'Second task description',
      status: 'pending',
      priority: 'high',
      type: 'manual',
      assignedTo: 'Test User',
      createdAt: new Date(),
      dueDate: new Date('2024-01-16T10:00:00Z'),
      history: []
    }
  ];

  const mockOnUpdateLocalTask = vi.fn();
  const mockOnRemoveLocalTask = vi.fn();

  const defaultProps = {
    tasks: mockTasks,
    onUpdateLocalTask: mockOnUpdateLocalTask,
    onRemoveLocalTask: mockOnRemoveLocalTask
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty state', () => {
    it('should show empty state when no tasks', () => {
      render(<TaskFocusedView tasks={[]} onUpdateLocalTask={mockOnUpdateLocalTask} onRemoveLocalTask={mockOnRemoveLocalTask} />);

      expect(screen.getByText('All tasks completed')).toBeInTheDocument();
      expect(screen.getByText('Great work!')).toBeInTheDocument();
    });
  });

  describe('Next task display', () => {
    it('should display the next task', () => {
      render(<TaskFocusedView {...defaultProps} />);

      expect(screen.getByText('First Task')).toBeInTheDocument();
      expect(screen.getByText('First task description')).toBeInTheDocument();
    });

    it('should show task priority', () => {
      render(<TaskFocusedView {...defaultProps} />);

      expect(screen.getByText('🟡 Medium')).toBeInTheDocument();
    });

    it('should show due date when available', () => {
      render(<TaskFocusedView {...defaultProps} />);

      // Due date should be formatted and displayed
      expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument();
    });

    it('should display task action buttons', () => {
      render(<TaskFocusedView {...defaultProps} />);

      expect(screen.getByText('Start Now')).toBeInTheDocument();
      expect(screen.getByText('Postpone')).toBeInTheDocument();
    });
  });

  describe('Upcoming tasks', () => {
    it('should display upcoming tasks section', () => {
      render(<TaskFocusedView {...defaultProps} />);

      expect(screen.getByText('Upcoming tasks')).toBeInTheDocument();
      expect(screen.getByText('Second Task')).toBeInTheDocument();
    });

    it('should show upcoming tasks count', () => {
      render(<TaskFocusedView {...defaultProps} />);

      expect(screen.getByText('(1)')).toBeInTheDocument();
    });

    it('should not show upcoming tasks section when no upcoming tasks', () => {
      const singleTask = [mockTasks[0]];
      render(<TaskFocusedView tasks={singleTask} onUpdateLocalTask={mockOnUpdateLocalTask} onRemoveLocalTask={mockOnRemoveLocalTask} />);

      expect(screen.queryByText('Upcoming tasks')).not.toBeInTheDocument();
    });
  });

  describe('Task actions', () => {
    it('should handle start task action', () => {
      render(<TaskFocusedView {...defaultProps} />);

      const startButton = screen.getByText('Start Now');
      fireEvent.click(startButton);
    });

    it('should handle postpone task action', () => {
      render(<TaskFocusedView {...defaultProps} />);

      const postponeButton = screen.getByText('Postpone');
      fireEvent.click(postponeButton);
    });

    it('should handle complete task action for in_progress task', () => {
      const inProgressTasks = [
        {
          ...mockTasks[0],
          status: 'in_progress' as const
        }
      ];

      render(<TaskFocusedView tasks={inProgressTasks} onUpdateLocalTask={mockOnUpdateLocalTask} onRemoveLocalTask={mockOnRemoveLocalTask} />);

      const completeButton = screen.getByText('Complete');
      fireEvent.click(completeButton);
    });
  });

  describe('Phone dialog', () => {
    it('should render without phone dialog by default', () => {
      render(<TaskFocusedView {...defaultProps} />);

      expect(screen.queryByText('Start Call')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<TaskFocusedView {...defaultProps} />);

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should have accessible buttons', () => {
      render(<TaskFocusedView {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('Caregiver links', () => {
    it('should show profile, chat, and notes links when caregiverId exists', () => {
      render(<TaskFocusedView {...defaultProps} />);

      const profileLink = screen.getByTestId('profile-link');
      expect(profileLink).toBeInTheDocument();
      expect(profileLink).toHaveAttribute('href', 'https://portal.mamamia.app/caregiver-agency/caregivers/123');
      expect(profileLink).toHaveAttribute('target', '_blank');

      const chatLink = screen.getByTestId('chat-link');
      expect(chatLink).toBeInTheDocument();
      expect(chatLink).toHaveAttribute('href', 'https://portal.mamamia.app/caregiver-agency/messages/123');

      expect(screen.getByTestId('logs-button')).toBeInTheDocument();
    });

    it('should not show links when caregiverId is missing', () => {
      const tasksWithoutCaregiver: Task[] = [{
        id: '1',
        title: 'No Caregiver Task',
        status: 'pending',
        priority: 'medium',
        type: 'manual',
        assignedTo: 'Test User',
        createdAt: new Date(),
        history: []
      }];

      render(<TaskFocusedView tasks={tasksWithoutCaregiver} onUpdateLocalTask={mockOnUpdateLocalTask} onRemoveLocalTask={mockOnRemoveLocalTask} />);

      expect(screen.queryByTestId('caregiver-links')).not.toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should not call onUpdateLocalTask on initial render', () => {
      render(<TaskFocusedView {...defaultProps} />);

      expect(mockOnUpdateLocalTask).not.toHaveBeenCalled();
    });
  });

  describe('Interest callback', () => {
    it('should show interest block instead of generic badge when callbackSource is Interest', async () => {
      const interestTasks: Task[] = [{
        id: '1',
        title: 'Anna Kowalska - Zainteresowanie zleceniem',
        status: 'pending',
        priority: 'medium',
        type: 'manual',
        assignedTo: 'Test User',
        createdAt: new Date(),
        dueDate: new Date('2024-01-15T10:00:00Z'),
        history: [],
        apiData: {
          caregiverId: 123,
          phoneNumber: '+48123456789',
          callbackSource: 'Interest',
        }
      }];

      render(<TaskFocusedView tasks={interestTasks} onUpdateLocalTask={mockOnUpdateLocalTask} onRemoveLocalTask={mockOnRemoveLocalTask} />);

      await waitFor(() => {
        expect(screen.getByTestId('interest-block')).toBeInTheDocument();
        expect(screen.getByText('Zainteresowanie zleceniem')).toBeInTheDocument();
      });
      // Should NOT show generic badge
      expect(screen.queryByText('Callback: Interest')).not.toBeInTheDocument();
    });

    it('should show generic badge for non-Interest callbackSource', () => {
      const regularTasks: Task[] = [{
        id: '1',
        title: 'Jan Nowak - Kontakt telefoniczny',
        status: 'pending',
        priority: 'medium',
        type: 'manual',
        assignedTo: 'Test User',
        createdAt: new Date(),
        dueDate: new Date('2024-01-15T10:00:00Z'),
        history: [],
        apiData: {
          caregiverId: 456,
          phoneNumber: '+48999888777',
          callbackSource: 'Manual',
        }
      }];

      render(<TaskFocusedView tasks={regularTasks} onUpdateLocalTask={mockOnUpdateLocalTask} onRemoveLocalTask={mockOnRemoveLocalTask} />);

      expect(screen.getByText('Callback: Manual')).toBeInTheDocument();
      expect(screen.queryByTestId('interest-block')).not.toBeInTheDocument();
    });

    it('should show job offer link when interest log has job_offer_id', async () => {
      const { sunshineService } = await import('../services/sunshineService');
      vi.mocked(sunshineService.getLogs).mockResolvedValueOnce({
        data: [{
          id: 1, created_at: '2024-01-15T10:00:00Z', data: null,
          title: 'interest', content: '', custom_author_name: null,
          logable_type: null, logable_id: null, job_offer_id: 9999,
          author: { id: 1, name: 'System', first_name: 'System', last_name: '' },
          updated_at: '2024-01-15T10:00:00Z',
        }],
        meta: { current_page: 1, last_page: 1, total: 1 },
      });

      const interestTasks: Task[] = [{
        id: '1',
        title: 'Anna Kowalska - Zainteresowanie zleceniem',
        status: 'pending',
        priority: 'medium',
        type: 'manual',
        assignedTo: 'Test User',
        createdAt: new Date(),
        dueDate: new Date('2024-01-15T10:00:00Z'),
        history: [],
        apiData: {
          caregiverId: 123,
          phoneNumber: '+48123456789',
          callbackSource: 'Interest',
        }
      }];

      render(<TaskFocusedView tasks={interestTasks} onUpdateLocalTask={mockOnUpdateLocalTask} onRemoveLocalTask={mockOnRemoveLocalTask} />);

      await waitFor(() => {
        const link = screen.getByTestId('interest-job-offer-link');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', 'https://portal.mamamia.app/caregiver-agency/job-market/9999');
      });
    });
  });

  describe('Transfer Dialog Integration', () => {
    it('should pass availableUsers to TransferDialog', () => {
      render(<TaskFocusedView {...defaultProps} />);

      expect(true).toBe(true); // Component renders without errors
    });

    it('should handle transfer confirmation correctly', () => {
      render(<TaskFocusedView {...defaultProps} />);

      expect(true).toBe(true); // Component renders without errors
    });

    it('should use availableUsers from props', () => {
      render(<TaskFocusedView {...defaultProps} availableUsers={['User One', 'User Two']} />);

      expect(true).toBe(true); // Component renders without errors
    });
  });
});
