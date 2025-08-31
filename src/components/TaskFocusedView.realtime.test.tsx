import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { TaskFocusedView } from './TaskFocusedView';
import { Task } from '../types/Task';
import { supabase } from '../lib/supabase';

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
      overdue: 'Overdue',
      take: 'Take',
      profilePortalLink: 'Profile in Portal'
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

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' }
    }
  })
}));

vi.mock('../hooks/useDialogState', () => ({
  useDialogState: () => ({
    dialogState: { isOpen: false, type: null, task: null },
    openDialog: vi.fn(),
    closeDialog: vi.fn(),
    updateDialogData: vi.fn()
  })
}));

vi.mock('../hooks/useTaskActions', () => ({
  useTaskActions: () => ({
    currentUserName: 'Test User',
    takenTasks: new Set(),
    takingTask: null,
    verifyingTasks: new Set(),
    failedTasks: new Set(),
    handleTakeTask: vi.fn(),
    handleCompleteTask: vi.fn(),
    handleAbandonTask: vi.fn(),
    handlePostponeTask: vi.fn(),
    handleTransferTask: vi.fn(),
    handleBoostTask: vi.fn(),
    handlePhoneCall: vi.fn(),
    isTaskAssignedToMe: vi.fn(() => false),
    isTaskAssignedToSomeoneElse: vi.fn(() => false),
    canTakeTask: vi.fn(() => true),
    isTaskVerifying: vi.fn(() => false),
    isTaskFailed: vi.fn(() => false),
    boostingTask: null,
    verificationStates: {},
    extractPhoneNumber: vi.fn(() => '+48123456789')
  })
}));

// Mock Supabase
vi.mock('../lib/supabase', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(() => Promise.resolve({ status: 'SUBSCRIBED' })),
    unsubscribe: vi.fn(() => Promise.resolve({ status: 'CLOSED' }))
  };
  
  const mockSupabase = {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn()
  };
  
  return {
    supabase: mockSupabase
  };
});

// Mock console.log to capture real-time logs
const mockConsoleLog = vi.fn();
const originalConsoleLog = console.log;

describe('TaskFocusedView - Smart Real-time Refresh', () => {
  const mockOnUpdateTask = vi.fn();
  const mockOnLoadContacts = vi.fn();
  const mockOnSilentRefresh = vi.fn();
  
  const unassignedTask: Task = {
    id: '1',
    title: 'Unassigned Task',
    description: 'Test task',
    type: 'manual',
    priority: 'high',
    status: 'pending',
    assignedTo: '', // Unassigned
    category: 'Test',
    createdAt: new Date(),
    history: []
  };

  const assignedTask: Task = {
    id: '2',
    title: 'Assigned Task',
    description: 'Test task assigned',
    type: 'manual',
    priority: 'high',
    status: 'pending',
    assignedTo: 'Test User', // Assigned
    category: 'Test',
    createdAt: new Date(),
    history: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
    console.log = mockConsoleLog;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  it('should set up real-time listener on mount', async () => {
    render(
      <TaskFocusedView
        tasks={[unassignedTask]}
        onUpdateTask={mockOnUpdateTask}
        onLoadContacts={mockOnLoadContacts}
        onSilentRefresh={mockOnSilentRefresh}
        availableUsers={[]}
      />
    );

    await waitFor(() => {
      expect(vi.mocked(supabase.channel)).toHaveBeenCalledWith('task-events-global');
    });
  });

  it('should trigger full refresh for unassigned task', async () => {
    const { unmount } = render(
      <TaskFocusedView
        tasks={[unassignedTask]}
        onUpdateTask={mockOnUpdateTask}
        onLoadContacts={mockOnLoadContacts}
        onSilentRefresh={mockOnSilentRefresh}
        availableUsers={[]}
      />
    );

    // Get the channel mock and simulate receiving a real-time event
    const channelMock = vi.mocked(supabase.channel).mock.results[0]?.value;
    expect(channelMock).toBeDefined();
    const broadcastCall = channelMock.on.mock.calls.find(call => call[0] === 'broadcast');
    expect(broadcastCall).toBeDefined();
    const onCallback = broadcastCall[2]; // Third parameter is the callback function
    
    // Simulate real-time event for unassigned task
    await act(async () => {
      onCallback({ event: 'task-update' }, { test: 'data' });
      
      // Wait for the timeout to complete
      await new Promise(resolve => setTimeout(resolve, 600));
    });

    // Should call full refresh (onLoadContacts) for unassigned task
    await waitFor(() => {
      expect(mockOnLoadContacts).toHaveBeenCalled();
      // Smart refresh hooks trigger onSilentRefresh, which is expected behavior
      expect(mockOnSilentRefresh).toHaveBeenCalled();
    });

    // Should log the decision
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('⚠️ Task was unassigned - full refresh needed (potential conflict)')
    );

    unmount();
  });

  it('should trigger silent refresh for assigned task', async () => {
    const { unmount } = render(
      <TaskFocusedView
        tasks={[assignedTask]}
        onUpdateTask={mockOnUpdateTask}
        onLoadContacts={mockOnLoadContacts}
        onSilentRefresh={mockOnSilentRefresh}
        availableUsers={[]}
      />
    );

    // Get the channel mock and simulate receiving a real-time event
    const channelMock = vi.mocked(supabase.channel).mock.results[0]?.value;
    expect(channelMock).toBeDefined();
    const broadcastCall = channelMock.on.mock.calls.find(call => call[0] === 'broadcast');
    expect(broadcastCall).toBeDefined();
    const onCallback = broadcastCall[2]; // Third parameter is the callback function
    
    // Simulate real-time event for assigned task
    await act(async () => {
      onCallback({ event: 'task-update' }, { test: 'data' });
      
      // Wait for the timeout to complete
      await new Promise(resolve => setTimeout(resolve, 600));
    });

    // Should call silent refresh for assigned task
    await waitFor(() => {
      expect(mockOnSilentRefresh).toHaveBeenCalled();
      expect(mockOnLoadContacts).not.toHaveBeenCalled();
    });

    // Should log the decision
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('✅ Task was assigned - silent background refresh only')
    );

    unmount();
  });

  it('should handle edge case when no tasks available', async () => {
    const { unmount } = render(
      <TaskFocusedView
        tasks={[]} // No tasks
        onUpdateTask={mockOnUpdateTask}
        onLoadContacts={mockOnLoadContacts}
        onSilentRefresh={mockOnSilentRefresh}
        availableUsers={[]}
      />
    );

    // Get the channel mock and simulate receiving a real-time event
    const channelMock = vi.mocked(supabase.channel).mock.results[0]?.value;
    expect(channelMock).toBeDefined();
    const broadcastCall = channelMock.on.mock.calls.find(call => call[0] === 'broadcast');
    expect(broadcastCall).toBeDefined();
    const onCallback = broadcastCall[2]; // Third parameter is the callback function
    
    // Simulate real-time event when no tasks
    await act(async () => {
      onCallback({ event: 'task-update' }, { test: 'data' });
      
      // Wait for the timeout to complete
      await new Promise(resolve => setTimeout(resolve, 600));
    });

    // Should treat no tasks as unassigned scenario (full refresh)
    await waitFor(() => {
      expect(mockOnLoadContacts).toHaveBeenCalled();
      // Smart refresh hooks trigger onSilentRefresh, which is expected behavior
      expect(mockOnSilentRefresh).toHaveBeenCalled();
    });

    unmount();
  });

  it('should handle task with whitespace-only assignedTo as unassigned', async () => {
    const taskWithWhitespace: Task = {
      ...unassignedTask,
      assignedTo: '   ', // Only whitespace
    };

    const { unmount } = render(
      <TaskFocusedView
        tasks={[taskWithWhitespace]}
        onUpdateTask={mockOnUpdateTask}
        onLoadContacts={mockOnLoadContacts}
        onSilentRefresh={mockOnSilentRefresh}
        availableUsers={[]}
      />
    );

    // Get the channel mock and simulate receiving a real-time event
    const channelMock = vi.mocked(supabase.channel).mock.results[0]?.value;
    expect(channelMock).toBeDefined();
    const broadcastCall = channelMock.on.mock.calls.find(call => call[0] === 'broadcast');
    expect(broadcastCall).toBeDefined();
    const onCallback = broadcastCall[2]; // Third parameter is the callback function
    
    // Simulate real-time event
    await act(async () => {
      onCallback({ event: 'task-update' }, { test: 'data' });
      
      // Wait for the timeout to complete
      await new Promise(resolve => setTimeout(resolve, 600));
    });

    // Should treat whitespace as unassigned (full refresh)
    await waitFor(() => {
      expect(mockOnLoadContacts).toHaveBeenCalled();
      // Smart refresh hooks trigger onSilentRefresh, which is expected behavior
      expect(mockOnSilentRefresh).toHaveBeenCalled();
    });

    unmount();
  });

  it('should log smart solution decision making', async () => {
    const { unmount } = render(
      <TaskFocusedView
        tasks={[unassignedTask]}
        onUpdateTask={mockOnUpdateTask}
        onLoadContacts={mockOnLoadContacts}
        onSilentRefresh={mockOnSilentRefresh}
        availableUsers={[]}
      />
    );

    // Get the channel mock and simulate receiving a real-time event
    const channelMock = vi.mocked(supabase.channel).mock.results[0]?.value;
    expect(channelMock).toBeDefined();
    const broadcastCall = channelMock.on.mock.calls.find(call => call[0] === 'broadcast');
    expect(broadcastCall).toBeDefined();
    const onCallback = broadcastCall[2]; // Third parameter is the callback function
    
    // Simulate real-time event
    await act(async () => {
      onCallback({ event: 'task-update' }, { test: 'data' });
      
      // Wait for the timeout to complete
      await new Promise(resolve => setTimeout(resolve, 600));
    });

    // Should log the smart solution approach
    expect(mockConsoleLog).toHaveBeenCalledWith(
      '🔄 Smart solution: Intelligent refresh based on task assignment status'
    );

    unmount();
  });

  it('should handle missing onLoadContacts prop gracefully', async () => {
    const { unmount } = render(
      <TaskFocusedView
        tasks={[unassignedTask]}
        onUpdateTask={mockOnUpdateTask}
        // onLoadContacts not provided
        onSilentRefresh={mockOnSilentRefresh}
        availableUsers={[]}
      />
    );

    // Get the channel mock and simulate receiving a real-time event
    const channelMock = vi.mocked(supabase.channel).mock.results[0]?.value;
    expect(channelMock).toBeDefined();
    const broadcastCall = channelMock.on.mock.calls.find(call => call[0] === 'broadcast');
    expect(broadcastCall).toBeDefined();
    const onCallback = broadcastCall[2]; // Third parameter is the callback function
    
    // Simulate real-time event
    await act(async () => {
      onCallback({ event: 'task-update' }, { test: 'data' });
      
      // Wait for the timeout to complete
      await new Promise(resolve => setTimeout(resolve, 600));
    });

    // Should not crash when onLoadContacts is undefined
    // No assertions needed - test passes if no error is thrown

    unmount();
  });

  it('should handle missing onSilentRefresh prop gracefully', async () => {
    const { unmount } = render(
      <TaskFocusedView
        tasks={[assignedTask]}
        onUpdateTask={mockOnUpdateTask}
        onLoadContacts={mockOnLoadContacts}
        // onSilentRefresh not provided
        availableUsers={[]}
      />
    );

    // Get the channel mock and simulate receiving a real-time event
    const channelMock = vi.mocked(supabase.channel).mock.results[0]?.value;
    expect(channelMock).toBeDefined();
    const broadcastCall = channelMock.on.mock.calls.find(call => call[0] === 'broadcast');
    expect(broadcastCall).toBeDefined();
    const onCallback = broadcastCall[2]; // Third parameter is the callback function
    
    // Simulate real-time event
    await act(async () => {
      onCallback({ event: 'task-update' }, { test: 'data' });
      
      // Wait for the timeout to complete
      await new Promise(resolve => setTimeout(resolve, 600));
    });

    // Should not crash when onSilentRefresh is undefined
    // No assertions needed - test passes if no error is thrown

    unmount();
  });

  it('should cleanup real-time listener on unmount', async () => {
    const { unmount } = render(
      <TaskFocusedView
        tasks={[unassignedTask]}
        onUpdateTask={mockOnUpdateTask}
        onLoadContacts={mockOnLoadContacts}
        onSilentRefresh={mockOnSilentRefresh}
        availableUsers={[]}
      />
    );

    const channelMock = vi.mocked(supabase.channel).mock.results[0].value;

    // Unmount component
    unmount();

    // Should call removeChannel
    await waitFor(() => {
      expect(vi.mocked(supabase.removeChannel)).toHaveBeenCalledWith(channelMock);
    });
  });
});