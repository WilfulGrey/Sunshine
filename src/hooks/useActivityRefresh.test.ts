import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActivityRefresh } from './useActivityRefresh';

describe('useActivityRefresh', () => {
  let mockCallback: ReturnType<typeof vi.fn>;
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;
  
  beforeEach(() => {
    mockCallback = vi.fn();
    addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should initialize with default inactivity threshold', () => {
    renderHook(() => useActivityRefresh(mockCallback));

    expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
  });

  it('should detect user activity events properly', () => {
    renderHook(() => useActivityRefresh(mockCallback, 1000));

    // Simulate user activity
    act(() => {
      document.dispatchEvent(new Event('mousemove'));
    });

    // Should reset the timer, callback shouldn't be called immediately
    expect(mockCallback).not.toHaveBeenCalled();

    // Account for debounce delay (50ms) + threshold (1000ms)
    act(() => {
      vi.advanceTimersByTime(50); // debounce
    });
    act(() => {
      vi.advanceTimersByTime(1000); // threshold
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should trigger callback after inactivity period', () => {
    const threshold = 5000; // 5 seconds
    renderHook(() => useActivityRefresh(mockCallback, threshold));

    // No activity - callback should trigger after threshold
    act(() => {
      vi.advanceTimersByTime(threshold);
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should debounce rapid successive activity events', () => {
    const threshold = 1000;
    renderHook(() => useActivityRefresh(mockCallback, threshold));

    // Rapid successive events
    act(() => {
      document.dispatchEvent(new Event('mousemove'));
      document.dispatchEvent(new Event('keydown'));
      document.dispatchEvent(new Event('touchstart'));
    });

    // Should debounce - wait for debounce period then threshold
    act(() => {
      vi.advanceTimersByTime(50); // debounce
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(mockCallback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should cleanup all listeners on unmount', () => {
    const { unmount } = renderHook(() => useActivityRefresh(mockCallback));

    expect(addEventListenerSpy).toHaveBeenCalledTimes(5); // 5 event types

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
  });

  it('should not trigger callback when disabled', () => {
    renderHook(() => useActivityRefresh(mockCallback, 1000, false));

    // No event listeners should be added when disabled
    expect(addEventListenerSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should reset timer on new activity', () => {
    const threshold = 2000;
    renderHook(() => useActivityRefresh(mockCallback, threshold));

    // Wait halfway through threshold
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Trigger activity to reset timer
    act(() => {
      document.dispatchEvent(new Event('mousemove'));
    });

    // Account for debounce delay + wait time
    act(() => {
      vi.advanceTimersByTime(50); // debounce
    });
    
    // Wait another 1000ms (should not trigger yet as timer was reset)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(mockCallback).not.toHaveBeenCalled();

    // Wait remaining time from reset point
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should handle invalid threshold values gracefully', () => {
    // Test negative threshold - should use default (300000ms)
    renderHook(() => useActivityRefresh(mockCallback, -1000));

    act(() => {
      vi.advanceTimersByTime(300000); // 5 minutes default
    });
    expect(mockCallback).toHaveBeenCalledTimes(1);

    // Test zero threshold - should use default
    mockCallback.mockClear();
    renderHook(() => useActivityRefresh(mockCallback, 0));

    act(() => {
      vi.advanceTimersByTime(300000); // Should use default
    });
    expect(mockCallback).toHaveBeenCalledTimes(1);

    // Test undefined threshold - should use default
    mockCallback.mockClear();
    renderHook(() => useActivityRefresh(mockCallback));

    act(() => {
      vi.advanceTimersByTime(300000); // Should use default 5 minutes
    });
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});