import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVisibilityRefresh } from './useVisibilityRefresh';
import * as visibilityHelpers from '../utils/visibilityHelpers';

describe('useVisibilityRefresh', () => {
  let mockCallback: ReturnType<typeof vi.fn>;
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let hiddenValue = false;

  beforeEach(() => {
    mockCallback = vi.fn();
    addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    
    // Mock Page Visibility API
    hiddenValue = false;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => hiddenValue
    });
    
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should refresh when tab becomes visible after threshold', () => {
    const minInterval = 1000;
    renderHook(() => useVisibilityRefresh(mockCallback, minInterval));

    // Simulate tab becoming hidden
    hiddenValue = true;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Wait for threshold period while hidden
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Simulate tab becoming visible
    hiddenValue = false;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should respect minimum refresh interval limits', () => {
    const minInterval = 5000; // 5 seconds
    renderHook(() => useVisibilityRefresh(mockCallback, minInterval));

    // First visibility change -> should trigger refresh
    hiddenValue = true;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    act(() => {
      vi.advanceTimersByTime(1000); // Hidden for 1 second (threshold)
    });
    
    hiddenValue = false;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(mockCallback).toHaveBeenCalledTimes(1);

    // Second visibility change within interval -> should not trigger refresh
    hiddenValue = true;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    act(() => {
      vi.advanceTimersByTime(2000); // Less than minInterval since last refresh
    });
    
    hiddenValue = false;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(mockCallback).toHaveBeenCalledTimes(1); // Still 1

    // After minInterval passes -> should allow refresh
    act(() => {
      vi.advanceTimersByTime(3000); // Total 5000ms since last refresh
    });
    
    hiddenValue = true;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    act(() => {
      vi.advanceTimersByTime(1000); // Hidden for threshold
    });
    
    hiddenValue = false;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });

  it('should skip refresh if data recently updated', () => {
    const minInterval = 1000;
    const lastDataUpdate = Date.now();
    
    renderHook(() => useVisibilityRefresh(mockCallback, minInterval, lastDataUpdate));

    // Simulate visibility change
    hiddenValue = true;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    hiddenValue = false;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Should not refresh because data was recently updated
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should handle Page Visibility API unavailability', () => {
    // Mock the visibility helpers to return unsupported
    const isVisibilityAPISupportedSpy = vi.spyOn(visibilityHelpers, 'isVisibilityAPISupported');
    isVisibilityAPISupportedSpy.mockReturnValue(false);
    
    renderHook(() => useVisibilityRefresh(mockCallback, 1000));

    // Should not add any event listeners when API is unavailable
    expect(addEventListenerSpy).not.toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    
    // Restore the mock
    isVisibilityAPISupportedSpy.mockRestore();
  });

  it('should not refresh immediately on quick tab switches', () => {
    const minInterval = 1000;
    const threshold = 2000; // 2 seconds minimum hidden time
    
    renderHook(() => useVisibilityRefresh(mockCallback, minInterval, undefined, threshold));

    // Quick tab switch (hidden for less than threshold)
    hiddenValue = true;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Hidden for only 500ms (less than threshold)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    hiddenValue = false;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockCallback).not.toHaveBeenCalled();

    // Longer hidden period (more than threshold)
    hiddenValue = true;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    act(() => {
      vi.advanceTimersByTime(3000); // More than threshold
    });

    hiddenValue = false;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should track visibility state changes accurately', () => {
    const minInterval = 1000;
    const { result } = renderHook(() => useVisibilityRefresh(mockCallback, minInterval));

    // Initial state should be visible
    expect(result.current?.isVisible).toBe(true);

    // Change to hidden
    hiddenValue = true;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Should track state change
    expect(result.current?.isVisible).toBe(false);
    expect(result.current?.lastVisibilityChange).toBeInstanceOf(Date);

    // Change back to visible
    hiddenValue = false;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current?.isVisible).toBe(true);
  });

  it('should cleanup visibility listeners properly', () => {
    const { unmount } = renderHook(() => useVisibilityRefresh(mockCallback, 1000));

    expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});