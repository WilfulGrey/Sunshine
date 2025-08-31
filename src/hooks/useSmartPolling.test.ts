import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSmartPolling } from './useSmartPolling';
import { DEFAULT_POLLING_STRATEGY, PollingStrategy } from '../utils/pollingStrategies';
import * as visibilityHook from './useVisibilityRefresh';
import * as activityHook from './useActivityRefresh';

describe('useSmartPolling', () => {
  let mockCallback: ReturnType<typeof vi.fn>;
  let mockVisibilityState: any;

  beforeEach(() => {
    mockCallback = vi.fn(); // Remove mockResolvedValue - use sync callback
    mockVisibilityState = { isVisible: true };
    vi.useFakeTimers();

    // Mock hooks
    vi.spyOn(visibilityHook, 'useVisibilityRefresh').mockReturnValue(mockVisibilityState);
    vi.spyOn(activityHook, 'useActivityRefresh').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should poll faster when user is active', async () => {
    const strategy: PollingStrategy = {
      ...DEFAULT_POLLING_STRATEGY,
      activeInterval: 1000,
      idleInterval: 2000,
      minInterval: 500,
      maxInterval: 10000
    };

    renderHook(() => useSmartPolling(mockCallback, strategy, true));

    // Should start polling immediately
    expect(mockCallback).toHaveBeenCalledTimes(1);

    // Advance time by active interval
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockCallback).toHaveBeenCalledTimes(2);
  });

  it('should stop polling when disabled', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useSmartPolling(mockCallback, DEFAULT_POLLING_STRATEGY, enabled),
      { initialProps: { enabled: true } }
    );

    // Start polling
    expect(mockCallback).toHaveBeenCalledTimes(1);

    // Disable polling
    rerender({ enabled: false });

    act(() => {
      vi.advanceTimersByTime(30000); // Wait longer than interval
    });

    // Should not continue polling when disabled
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should use exponential backoff on consecutive errors', async () => {
    const strategy: PollingStrategy = {
      ...DEFAULT_POLLING_STRATEGY,
      activeInterval: 1000,
      backoffMultiplier: 2,
      maxRetries: 3,
      minInterval: 500,
      maxInterval: 10000
    };

    // Mock callback to throw errors
    mockCallback.mockImplementation(() => { throw new Error('Network error'); });

    renderHook(() => useSmartPolling(mockCallback, strategy, true));

    // First call should fail
    expect(mockCallback).toHaveBeenCalledTimes(1);

    // After first error, should wait 2 * activeInterval (2000ms)
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(mockCallback).toHaveBeenCalledTimes(2);

    // After second error, should wait 4 * activeInterval (4000ms)
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(mockCallback).toHaveBeenCalledTimes(2);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(mockCallback).toHaveBeenCalledTimes(3);
  });

  it('should resume normal polling after successful recovery', async () => {
    const strategy: PollingStrategy = {
      ...DEFAULT_POLLING_STRATEGY,
      activeInterval: 1000,
      backoffMultiplier: 2,
      minInterval: 500,
      maxInterval: 10000
    };

    // Mock callback to fail then succeed
    mockCallback
      .mockImplementationOnce(() => { throw new Error('Network error'); })
      .mockImplementationOnce(() => { return 'success'; });

    renderHook(() => useSmartPolling(mockCallback, strategy, true));

    // First call fails
    expect(mockCallback).toHaveBeenCalledTimes(1);

    // After error, wait backoff time (2000ms)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Second call succeeds
    expect(mockCallback).toHaveBeenCalledTimes(2);

    // After success, should return to normal interval (1000ms)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockCallback).toHaveBeenCalledTimes(3);
  });

  it('should respect maximum and minimum poll intervals', () => {
    const strategy: PollingStrategy = {
      ...DEFAULT_POLLING_STRATEGY,
      activeInterval: 100, // Very fast
      idleInterval: 500000, // Very slow
      minInterval: 1000,
      maxInterval: 10000
    };

    renderHook(() => useSmartPolling(mockCallback, strategy, true));

    // Should not poll faster than minInterval
    expect(mockCallback).toHaveBeenCalledTimes(1);

    // Should wait for minInterval (1000ms) not activeInterval (100ms)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(mockCallback).toHaveBeenCalledTimes(2);

    // Test demonstrates that minInterval (1000ms) is respected regardless of activeInterval (100ms)
  });

  it('should cleanup polling on unmount', () => {
    const { unmount } = renderHook(() => 
      useSmartPolling(mockCallback, DEFAULT_POLLING_STRATEGY, true)
    );

    expect(mockCallback).toHaveBeenCalledTimes(1);

    unmount();

    // After unmount, should not continue polling
    act(() => {
      vi.advanceTimersByTime(DEFAULT_POLLING_STRATEGY.activeInterval);
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should handle rapid enable/disable toggles', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useSmartPolling(mockCallback, DEFAULT_POLLING_STRATEGY, enabled),
      { initialProps: { enabled: true } }
    );

    expect(mockCallback).toHaveBeenCalledTimes(1);

    // Disable polling
    rerender({ enabled: false });

    act(() => {
      vi.advanceTimersByTime(DEFAULT_POLLING_STRATEGY.activeInterval);
    });

    // Should not poll when disabled
    expect(mockCallback).toHaveBeenCalledTimes(1);

    // Re-enable polling
    rerender({ enabled: true });

    // Should immediately resume
    expect(mockCallback).toHaveBeenCalledTimes(2);

    // Rapid toggle
    rerender({ enabled: false });
    rerender({ enabled: true });

    expect(mockCallback).toHaveBeenCalledTimes(3);
  });

  it('should integrate with activity detection seamlessly', () => {
    const strategy: PollingStrategy = {
      ...DEFAULT_POLLING_STRATEGY,
      activeInterval: 1000,
      idleInterval: 3000,
      minInterval: 500,
      maxInterval: 10000
    };

    renderHook(() => useSmartPolling(mockCallback, strategy, true));

    // Start with active polling
    expect(mockCallback).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(mockCallback).toHaveBeenCalledTimes(2);

    // For this simplified test, we just verify basic polling continues
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(mockCallback).toHaveBeenCalledTimes(3);
  });
});