import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCallbacks } from './useCallbacks';

// Zachowania pod testem: gate na auth (zero API przed loginem), twardy błąd
// ładowania employees (bez cichego fallbacku) i reset stanu przy zmianie usera
// (merge zachowuje in_progress/boosted — nie może przeciekać między kontami).

const mockGetAllCallbacks = vi.fn();
vi.mock('../services/sunshineService', () => ({
  sunshineService: {
    getAllCallbacks: (...args: unknown[]) => mockGetAllCallbacks(...args),
    setCallback: vi.fn().mockResolvedValue({}),
  },
}));

const mockLoadEmployees = vi.fn();
vi.mock('../config/employeeMapping', () => ({
  loadEmployees: (...args: unknown[]) => mockLoadEmployees(...args),
  getAllEmployees: vi.fn(() => []),
}));

vi.mock('../utils/sunshineHelpers', () => ({
  convertCallbackToTask: (cb: { id: number }) => ({
    id: String(cb.id),
    status: 'pending',
    priority: 'normal',
    history: [],
  }),
  isBlockedStatus: () => false,
}));

let mockUser: { id: string; email: string } | null = null;
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

describe('useCallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockLoadEmployees.mockResolvedValue(undefined);
    mockGetAllCallbacks.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }] });
  });

  it('bez zalogowanego usera nie woła ani employees, ani API callbacków', async () => {
    renderHook(() => useCallbacks());
    await act(async () => {});
    expect(mockLoadEmployees).not.toHaveBeenCalled();
    expect(mockGetAllCallbacks).not.toHaveBeenCalled();
  });

  it('po zalogowaniu ładuje employees PRZED callbackami i wystawia taski', async () => {
    mockUser = { id: 'user-a', email: 'a@vitanas.pl' };
    const { result } = renderHook(() => useCallbacks());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockLoadEmployees).toHaveBeenCalledWith('user-a');
    expect(mockLoadEmployees.mock.invocationCallOrder[0])
      .toBeLessThan(mockGetAllCallbacks.mock.invocationCallOrder[0]);
    expect(result.current.tasks.map(t => t.id)).toEqual(['1', '2']);
    expect(result.current.error).toBeNull();
  });

  it('błąd ładowania employees = widoczny error state, bez wołania API callbacków', async () => {
    mockUser = { id: 'user-a', email: 'a@vitanas.pl' };
    mockLoadEmployees.mockRejectedValue(new Error('Lista pracowników jest pusta'));
    const { result } = renderHook(() => useCallbacks());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain('Lista pracowników jest pusta');
    expect(mockGetAllCallbacks).not.toHaveBeenCalled();
    expect(result.current.tasks).toEqual([]);
  });

  it('zmiana usera resetuje lokalny stan (in_progress nie przecieka do nowego konta)', async () => {
    mockUser = { id: 'user-a', email: 'a@vitanas.pl' };
    const { result, rerender } = renderHook(() => useCallbacks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.updateLocalTask('1', { status: 'in_progress' });
    });
    expect(result.current.tasks.find(t => t.id === '1')?.status).toBe('in_progress');

    mockUser = { id: 'user-b', email: 'b@vitanas.pl' };
    rerender();

    await waitFor(() => expect(mockLoadEmployees).toHaveBeenCalledWith('user-b'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Świeży load: merge nie miał prawa zachować in_progress usera A
    expect(result.current.tasks.find(t => t.id === '1')?.status).toBe('pending');
  });
});
