import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSmartRefresh } from './useSmartRefresh';
import * as activityHook from './useActivityRefresh';
import * as visibilityHook from './useVisibilityRefresh';
import * as pollingHook from './useSmartPolling';

describe('useSmartRefresh - Integration Tests', () => {
  let mockRefreshCallback: ReturnType<typeof vi.fn>;
  let mockOnError: ReturnType<typeof vi.fn>;
  let mockActivityRefresh: ReturnType<typeof vi.spyOn>;
  let mockVisibilityRefresh: ReturnType<typeof vi.spyOn>;
  let mockSmartPolling: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockRefreshCallback = vi.fn().mockResolvedValue('success');
    mockOnError = vi.fn();
    vi.useFakeTimers();

    // Mock all individual refresh hooks
    mockActivityRefresh = vi.spyOn(activityHook, 'useActivityRefresh');
    mockVisibilityRefresh = vi.spyOn(visibilityHook, 'useVisibilityRefresh').mockReturnValue({
      isVisible: true,
      lastVisibilityChange: new Date(),
      hiddenTime: 0
    });
    mockSmartPolling = vi.spyOn(pollingHook, 'useSmartPolling').mockReturnValue({
      isActive: true,
      errorCount: 0,
      lastSuccessTime: Date.now(),
      currentInterval: 30000
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should coordinate all refresh strategies harmoniously', () => {
    const { result } = renderHook(() => 
      useSmartRefresh(mockRefreshCallback, {
        activityEnabled: true,
        visibilityEnabled: true,
        pollingEnabled: true,
        enabled: true
      })
    );

    // Should initialize all three strategies
    expect(mockActivityRefresh).toHaveBeenCalledWith(
      expect.any(Function),
      5 * 60 * 1000, // 5 minutes default
      true // enabled
    );

    expect(mockVisibilityRefresh).toHaveBeenCalledWith(
      expect.any(Function),
      30000, // 30 seconds default
      undefined,
      30000 // threshold
    );

    expect(mockSmartPolling).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        activeInterval: 30000,
        idleInterval: 120000,
        minInterval: 10000,
        maxInterval: 300000
      }),
      true // enabled
    );

    // Should provide unified state
    expect(result.current.state).toMatchObject({
      isVisible: true,
      pollingActive: true,
      pollingErrorCount: 0,
      currentPollingInterval: 30000
    });

    // Should provide control functions
    expect(typeof result.current.triggerRefresh).toBe('function');
    expect(result.current.isEnabled).toBe(true);
    expect(result.current.strategies).toEqual({
      activity: true,
      visibility: true,
      polling: true
    });
  });

  it('should handle concurrent refresh triggers intelligently', async () => {
    const slowCallback = vi.fn().mockResolvedValue('success');
    
    const { result } = renderHook(() => 
      useSmartRefresh(slowCallback, { onError: mockOnError })
    );

    // Trigger multiple concurrent refreshes
    const refresh1 = result.current.triggerRefresh();
    const refresh2 = result.current.triggerRefresh();
    const refresh3 = result.current.triggerRefresh();

    // Wait for all to complete
    const results = await Promise.all([refresh1, refresh2, refresh3]);

    // All should succeed (though callback may be called multiple times)
    results.forEach(result => {
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    expect(slowCallback).toHaveBeenCalledTimes(3); // Each trigger should call the callback
    expect(mockOnError).not.toHaveBeenCalled();
  });

  it('should maintain performance under heavy usage patterns', async () => {
    const performanceCallback = vi.fn().mockResolvedValue('fast');
    let callTimes: number[] = [];

    // Track execution times
    performanceCallback.mockImplementation(async () => {
      const start = performance.now();
      await new Promise(resolve => setTimeout(resolve, 1)); // Minimal delay
      const end = performance.now();
      callTimes.push(end - start);
      return 'success';
    });

    const { result } = renderHook(() => 
      useSmartRefresh(performanceCallback, {
        pollingStrategy: {
          activeInterval: 100, // Very frequent polling for stress test
          minInterval: 50
        }
      })
    );

    // Simulate heavy usage - rapid manual refreshes
    const promises: Promise<any>[] = [];
    for (let i = 0; i < 20; i++) {
      promises.push(result.current.triggerRefresh());
      await act(async () => {
        vi.advanceTimersByTime(10); // Small delays between calls
      });
    }

    await Promise.all(promises);

    // Performance should remain consistent (no significant degradation)
    expect(performanceCallback).toHaveBeenCalledTimes(20);
    
    // Check that average execution time is reasonable (less than 50ms for test environment)
    const avgTime = callTimes.reduce((a, b) => a + b, 0) / callTimes.length;
    expect(avgTime).toBeLessThan(50); // More lenient for CI/test environment

    // Memory usage should be stable (no memory leaks)
    // This is hard to test directly, but we can verify hooks were called correctly
    expect(mockActivityRefresh).toHaveBeenCalledTimes(1);
    expect(mockVisibilityRefresh).toHaveBeenCalledTimes(1);
    expect(mockSmartPolling).toHaveBeenCalledTimes(1);
  });

  it('should preserve user data during refresh operations', async () => {
    let userData = { count: 0, items: ['initial'] };
    
    const dataPreservingCallback = vi.fn().mockImplementation(async () => {
      // Simulate data update that should preserve existing user data
      userData.count += 1;
      userData.items.push(`item-${userData.count}`);
      return userData;
    });

    const { result } = renderHook(() => 
      useSmartRefresh(dataPreservingCallback)
    );

    // Initial state
    expect(userData).toEqual({ count: 0, items: ['initial'] });

    // Trigger refresh
    const refreshResult = await result.current.triggerRefresh();
    
    expect(refreshResult.success).toBe(true);
    expect(userData).toEqual({ count: 1, items: ['initial', 'item-1'] });

    // Trigger multiple refreshes to ensure data accumulates correctly
    await result.current.triggerRefresh();
    await result.current.triggerRefresh();

    expect(userData).toEqual({ 
      count: 3, 
      items: ['initial', 'item-1', 'item-2', 'item-3'] 
    });

    expect(dataPreservingCallback).toHaveBeenCalledTimes(3);
  });

  it('should work correctly across different device types', async () => {
    // Simulate mobile device with limited resources
    const mobileCallback = vi.fn().mockResolvedValue('mobile-success');
    
    const { result: mobileResult } = renderHook(() => 
      useSmartRefresh(mobileCallback, {
        // Mobile-optimized settings
        pollingStrategy: {
          activeInterval: 60000, // Less frequent on mobile
          idleInterval: 300000, // Much less frequent when idle
          maxInterval: 600000 // Higher max for battery savings
        },
        activityThreshold: 10 * 60 * 1000, // 10 minutes on mobile
        visibilityMinInterval: 60000 // 1 minute minimum
      })
    );

    // Should configure polling for mobile-optimized intervals
    expect(mockSmartPolling).toHaveBeenLastCalledWith(
      expect.any(Function),
      expect.objectContaining({
        activeInterval: 60000,
        idleInterval: 300000,
        maxInterval: 600000
      }),
      true
    );

    // Should configure activity for longer threshold
    expect(mockActivityRefresh).toHaveBeenLastCalledWith(
      expect.any(Function),
      10 * 60 * 1000,
      true
    );

    // Should work on mobile
    const mobileRefresh = await mobileResult.current.triggerRefresh();
    expect(mobileRefresh.success).toBe(true);

    vi.clearAllMocks();

    // Simulate desktop device with more resources
    const desktopCallback = vi.fn().mockResolvedValue('desktop-success');
    
    const { result: desktopResult } = renderHook(() => 
      useSmartRefresh(desktopCallback, {
        // Desktop-optimized settings
        pollingStrategy: {
          activeInterval: 15000, // More frequent on desktop
          idleInterval: 60000, // Moderate when idle
          minInterval: 5000 // Faster minimum
        },
        activityThreshold: 2 * 60 * 1000, // 2 minutes on desktop
        visibilityMinInterval: 15000 // 15 seconds minimum
      })
    );

    // Should configure for desktop optimization
    expect(mockSmartPolling).toHaveBeenLastCalledWith(
      expect.any(Function),
      expect.objectContaining({
        activeInterval: 15000,
        idleInterval: 60000,
        minInterval: 5000
      }),
      true
    );

    const desktopRefresh = await desktopResult.current.triggerRefresh();
    expect(desktopRefresh.success).toBe(true);
  });

  it('should handle network connectivity changes gracefully', async () => {
    let isOnline = true;
    const networkCallback = vi.fn().mockImplementation(async () => {
      if (!isOnline) {
        throw new Error('Network unavailable');
      }
      return 'network-success';
    });

    const { result } = renderHook(() => 
      useSmartRefresh(networkCallback, { 
        onError: mockOnError,
        pollingStrategy: {
          maxRetries: 3,
          backoffMultiplier: 2
        }
      })
    );

    // Should work when online
    let refreshResult = await result.current.triggerRefresh();
    expect(refreshResult.success).toBe(true);
    expect(mockOnError).not.toHaveBeenCalled();

    // Simulate network disconnection
    isOnline = false;
    
    refreshResult = await result.current.triggerRefresh();
    expect(refreshResult.success).toBe(false);
    expect(refreshResult.error).toBeInstanceOf(Error);
    expect(refreshResult.error?.message).toBe('Network unavailable');
    expect(mockOnError).toHaveBeenCalledWith(
      expect.any(Error),
      'manual'
    );

    vi.clearAllMocks();

    // Test error handling in different strategies (if hooks were called)
    if (mockActivityRefresh.mock.calls.length > 0) {
      const activityCallback = mockActivityRefresh.mock.calls[0][0];
      await expect(activityCallback()).rejects.toThrow('Network unavailable');
      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        'activity'
      );
    }

    vi.clearAllMocks();

    if (mockVisibilityRefresh.mock.calls.length > 0) {
      const visibilityCallback = mockVisibilityRefresh.mock.calls[0][0];
      await expect(visibilityCallback()).rejects.toThrow('Network unavailable');
      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        'visibility'
      );
    }

    vi.clearAllMocks();

    if (mockSmartPolling.mock.calls.length > 0) {
      const pollingCallback = mockSmartPolling.mock.calls[0][0];
      await expect(pollingCallback()).rejects.toThrow('Network unavailable');
      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        'polling'
      );
    }

    // Simulate network reconnection
    isOnline = true;
    
    refreshResult = await result.current.triggerRefresh();
    expect(refreshResult.success).toBe(true);
    expect(refreshResult.error).toBeNull();
  });

  it('should handle disabled strategies correctly', () => {
    const { result } = renderHook(() => 
      useSmartRefresh(mockRefreshCallback, {
        activityEnabled: false,
        visibilityEnabled: false,
        pollingEnabled: true,
        enabled: true
      })
    );

    // Should only enable polling
    expect(mockActivityRefresh).toHaveBeenCalledWith(
      expect.any(Function),
      5 * 60 * 1000,
      false // disabled
    );

    expect(mockVisibilityRefresh).toHaveBeenCalledWith(
      expect.any(Function),
      30000,
      undefined,
      30000
    ); // called but would be disabled internally

    expect(mockSmartPolling).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Object),
      true // enabled
    );

    expect(result.current.strategies).toEqual({
      activity: false,
      visibility: false,
      polling: true
    });
  });

  it('should provide accurate state information', () => {
    // Mock more detailed state from individual hooks
    mockVisibilityRefresh.mockReturnValue({
      isVisible: false,
      lastVisibilityChange: new Date('2023-01-01T10:00:00Z'),
      hiddenTime: 5000
    });

    mockSmartPolling.mockReturnValue({
      isActive: false,
      errorCount: 2,
      lastSuccessTime: Date.now() - 60000,
      currentInterval: 120000
    });

    const { result } = renderHook(() => 
      useSmartRefresh(mockRefreshCallback)
    );

    expect(result.current.state).toMatchObject({
      isVisible: false,
      lastVisibilityChange: new Date('2023-01-01T10:00:00Z'),
      hiddenTime: 5000,
      pollingActive: false,
      pollingErrorCount: 2,
      currentPollingInterval: 120000
    });
  });
});