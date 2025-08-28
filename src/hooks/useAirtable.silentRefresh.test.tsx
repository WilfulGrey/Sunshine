import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAirtable } from './useAirtable';
import { airtableService } from '../services/airtableService';

// Mock airtableService
vi.mock('../services/airtableService', () => ({
  airtableService: {
    getContacts: vi.fn(),
    getAvailableUsers: vi.fn(),
    updateContact: vi.fn()
  }
}));

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' }
    }
  })
}));

// Mock convertAirtableContactToTask
vi.mock('../utils/airtableHelpers', () => ({
  convertAirtableContactToTask: vi.fn((contact) => ({
    id: contact.id,
    title: contact.fields.Name || 'Test Task',
    description: contact.fields.Description || 'Test Description',
    type: 'manual',
    priority: 'high',
    status: 'pending',
    assignedTo: contact.fields.User?.[0] || '',
    category: 'Test',
    createdAt: new Date(),
    history: []
  }))
}));

const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('useAirtable - Silent Refresh', () => {
  const mockContacts = [
    {
      id: 'rec1',
      fields: {
        Name: 'Test Contact 1',
        User: ['Test User'],
        Description: 'Test Description 1'
      }
    },
    {
      id: 'rec2',
      fields: {
        Name: 'Test Contact 2',
        User: [],
        Description: 'Test Description 2'
      }
    }
  ];

  const mockUsers = ['Test User', 'Another User'];

  beforeEach(() => {
    vi.clearAllMocks();
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
    
    // Setup default mock responses
    (airtableService.getContacts as any).mockResolvedValue(mockContacts);
    (airtableService.getAvailableUsers as any).mockResolvedValue(mockUsers);
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  it('should provide silentRefresh function', () => {
    const { result } = renderHook(() => useAirtable());
    
    expect(result.current.silentRefresh).toBeDefined();
    expect(typeof result.current.silentRefresh).toBe('function');
  });

  it('should update tasks without changing loading state during silent refresh', async () => {
    const { result } = renderHook(() => useAirtable());

    // Wait for initial load to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialLoadingState = result.current.loading;
    const initialTaskCount = result.current.tasks.length;

    // Call silent refresh
    await act(async () => {
      await result.current.silentRefresh();
    });

    // Loading state should remain unchanged during silent refresh
    expect(result.current.loading).toBe(initialLoadingState);
    
    // Tasks should be updated
    expect(airtableService.getContacts).toHaveBeenCalledTimes(2); // Initial + silent refresh
    expect(airtableService.getAvailableUsers).toHaveBeenCalledTimes(2); // Initial + silent refresh
  });

  it('should complete silent refresh process without errors', async () => {
    const { result } = renderHook(() => useAirtable());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialLastRefresh = result.current.lastRefresh;

    // Call silent refresh
    await act(async () => {
      await result.current.silentRefresh();
    });

    // Should update data without affecting loading state
    expect(result.current.loading).toBe(false);
    expect(result.current.lastRefresh).not.toBe(initialLastRefresh);
    expect(result.current.tasks).toBeDefined();
  });

  it('should update lastRefresh timestamp during silent refresh', async () => {
    const { result } = renderHook(() => useAirtable());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialLastRefresh = result.current.lastRefresh;
    
    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Call silent refresh
    await act(async () => {
      await result.current.silentRefresh();
    });

    // lastRefresh should be updated
    expect(result.current.lastRefresh.getTime()).toBeGreaterThan(initialLastRefresh.getTime());
  });

  it('should handle errors gracefully during silent refresh', async () => {
    const { result } = renderHook(() => useAirtable());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear console mock to focus only on error logs
    mockConsoleLog.mockClear();

    // Mock error for silent refresh - reset all previous calls first
    (airtableService.getContacts as any).mockClear();
    (airtableService.getContacts as any).mockRejectedValueOnce(new Error('Network error'));

    const initialLoadingState = result.current.loading;
    const initialErrorState = result.current.error;

    // Call silent refresh - should not throw
    await act(async () => {
      await result.current.silentRefresh();
    });

    // Should not change loading or error states on silent refresh failure
    expect(result.current.loading).toBe(initialLoadingState);
    expect(result.current.error).toBe(initialErrorState);

    // Should log the error using console.error
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining('🔇 Silent refresh failed:'),
      expect.any(Error)
    );
  });

  it('should update both tasks and availableUsers during silent refresh', async () => {
    const { result } = renderHook(() => useAirtable());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialTasks = result.current.tasks;
    const initialUsers = result.current.availableUsers;

    // Update mock responses
    const newMockContacts = [
      ...mockContacts,
      {
        id: 'rec3',
        fields: {
          Name: 'New Contact',
          User: ['New User'],
          Description: 'New Description'
        }
      }
    ];
    const newMockUsers = [...mockUsers, 'New User'];

    (airtableService.getContacts as any).mockResolvedValueOnce(newMockContacts);
    (airtableService.getAvailableUsers as any).mockResolvedValueOnce(newMockUsers);

    // Call silent refresh
    await act(async () => {
      await result.current.silentRefresh();
    });

    // Both tasks and users should be updated
    expect(result.current.tasks.length).toBeGreaterThan(initialTasks.length);
    expect(result.current.availableUsers.length).toBeGreaterThan(initialUsers.length);
  });

  it('should handle task data correctly during silent refresh', async () => {
    const { result } = renderHook(() => useAirtable());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialTasksCount = result.current.tasks.length;

    // Call silent refresh
    await act(async () => {
      await result.current.silentRefresh();
    });

    // Should maintain task data integrity
    expect(result.current.tasks).toBeDefined();
    expect(Array.isArray(result.current.tasks)).toBe(true);
    expect(result.current.tasks.length).toBeGreaterThanOrEqual(0);
    
    // First task should have proper structure if exists
    if (result.current.tasks.length > 0) {
      const firstTask = result.current.tasks[0];
      expect(firstTask).toHaveProperty('title');
      expect(firstTask).toHaveProperty('id');
    }
  });

  it('should work when no tasks are available', async () => {
    // Mock empty contacts
    (airtableService.getContacts as any).mockResolvedValue([]);

    const { result } = renderHook(() => useAirtable());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialLastRefresh = result.current.lastRefresh;

    // Call silent refresh
    await act(async () => {
      await result.current.silentRefresh();
    });

    // Should complete successfully even with no tasks
    expect(result.current.tasks).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.lastRefresh).not.toBe(initialLastRefresh);
    expect(result.current.error).toBe(null);
  });
});