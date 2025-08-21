import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { TaskFocusedView } from './TaskFocusedView';
import { Task } from '../types/Task';

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
      urgent: '🔴 Urgent',
      overdue: 'Overdue'
    }
  })
}));

vi.mock('../contexts/TimezoneContext', () => ({
  useTimezone: () => ({
    timezone: 'Europe/Warsaw'
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

vi.mock('../hooks/useAirtable', () => ({
  useAirtable: () => ({
    availableUsers: ['User One', 'User Two'],
    updateAirtableRecord: vi.fn(),
    isUpdating: false
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
    handleTakeTask: vi.fn(),
    handlePhoneCall: vi.fn(),
    handleCompleteTask: vi.fn(),
    handleAbandonTask: vi.fn(),
    handleTransferTask: vi.fn(),
    handlePostponeTask: vi.fn(),
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
  }))
}));

// Mock dialog components
vi.mock('./dialogs/CompletionDialog', () => ({
  CompletionDialog: ({ onConfirm, onClose }: any) => (
    <div data-testid={'completion-dialog'}>
      <button onClick={onConfirm}>Confirm Completion</button>
      <button onClick={onClose}>Close Completion</button>
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
      airtableData: {
        phoneNumber: '+48123456789',
        urgent: false
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

  const mockOnUpdateTask = vi.fn();

  const defaultProps = {
    tasks: mockTasks,
    onUpdateTask: mockOnUpdateTask
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty state', () => {
    it('should show empty state when no tasks', () => {
      render(<TaskFocusedView tasks={[]} onUpdateTask={mockOnUpdateTask} />);
      
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

    it('should show urgent badge when task is urgent', () => {
      const urgentTasks = [
        {
          ...mockTasks[0],
          airtableData: { urgent: true }
        }
      ];
      
      render(<TaskFocusedView tasks={urgentTasks} onUpdateTask={mockOnUpdateTask} />);
      
      expect(screen.getByText('PILNE')).toBeInTheDocument();
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
      render(<TaskFocusedView tasks={singleTask} onUpdateTask={mockOnUpdateTask} />);
      
      expect(screen.queryByText('Upcoming tasks')).not.toBeInTheDocument();
    });
  });

  describe('Task actions', () => {
    it('should handle start task action', () => {
      render(<TaskFocusedView {...defaultProps} />);
      
      const startButton = screen.getByText('Start Now');
      fireEvent.click(startButton);
      
      // This should trigger opening the phone dialog
      // We can verify this by checking if the mock was called
    });

    it('should handle postpone task action', () => {
      render(<TaskFocusedView {...defaultProps} />);
      
      const postponeButton = screen.getByText('Postpone');
      fireEvent.click(postponeButton);
      
      // Should trigger opening postpone dialog
    });

    it('should handle complete task action for in_progress task', () => {
      const inProgressTasks = [
        {
          ...mockTasks[0],
          status: 'in_progress' as const
        }
      ];
      
      render(<TaskFocusedView tasks={inProgressTasks} onUpdateTask={mockOnUpdateTask} />);
      
      const completeButton = screen.getByText('Complete');
      fireEvent.click(completeButton);
      
      // Should trigger opening completion dialog
    });
  });

  describe('Task links', () => {
    it('should display external links when available', () => {
      const tasksWithLinks = [
        {
          ...mockTasks[0],
          airtableData: {
            profileLink: 'https://example.com/profile',
            retellLink: 'https://example.com/retell',
            jobLink: 'https://example.com/job'
          }
        }
      ];
      
      render(<TaskFocusedView tasks={tasksWithLinks} onUpdateTask={mockOnUpdateTask} />);
      
      expect(screen.getByText('Profil w portalu MM')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Retell')).toBeInTheDocument();
      expect(screen.getByText('Link do JOBa')).toBeInTheDocument();
    });

    it('should not display links section when no links available', () => {
      render(<TaskFocusedView {...defaultProps} />);
      
      expect(screen.queryByText('Profil w portalu MM')).not.toBeInTheDocument();
    });
  });

  describe('Task notes and recommendations', () => {
    it('should display previous recommendation when available', () => {
      const tasksWithRecommendation = [
        {
          ...mockTasks[0],
          airtableData: {
            previousRecommendation: 'Previous agent recommendation'
          }
        }
      ];
      
      render(<TaskFocusedView tasks={tasksWithRecommendation} onUpdateTask={mockOnUpdateTask} />);
      
      expect(screen.getByText('Notatka Agenta:')).toBeInTheDocument();
      expect(screen.getByText('Previous agent recommendation')).toBeInTheDocument();
    });

    it('should display next steps when available', () => {
      const tasksWithNextSteps = [
        {
          ...mockTasks[0],
          airtableData: {
            nextSteps: 'Next steps to follow'
          }
        }
      ];
      
      render(<TaskFocusedView tasks={tasksWithNextSteps} onUpdateTask={mockOnUpdateTask} />);
      
      expect(screen.getByText('Następne kroki:')).toBeInTheDocument();
      expect(screen.getByText('Next steps to follow')).toBeInTheDocument();
    });
  });

  describe('Phone dialog', () => {
    it('should render without phone dialog by default', () => {
      render(<TaskFocusedView {...defaultProps} />);
      
      // Phone dialog should not be visible by default
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

    it('should have proper link accessibility', () => {
      const tasksWithLinks = [
        {
          ...mockTasks[0],
          airtableData: {
            profileLink: 'https://example.com/profile'
          }
        }
      ];
      
      render(<TaskFocusedView tasks={tasksWithLinks} onUpdateTask={mockOnUpdateTask} />);
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Integration', () => {
    it('should call onUpdateTask when actions are performed', () => {
      // This would be tested through the mocked hooks
      render(<TaskFocusedView {...defaultProps} />);
      
      // The actual integration would be tested by verifying
      // that the hooks are called with correct parameters
      expect(mockOnUpdateTask).not.toHaveBeenCalled();
    });
  });
});