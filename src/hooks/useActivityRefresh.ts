import { useEffect, useCallback, useRef } from 'react';
import type { ActivityCallback, ActivityEvent } from '../types/ActivityTypes';

const DEFAULT_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
const DEFAULT_DEBOUNCE = 50; // 50ms debounce (reduced for better test compatibility)

export const useActivityRefresh = (
  callback: ActivityCallback,
  threshold: number = DEFAULT_THRESHOLD,
  enabled: boolean = true
): void => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Validate and normalize threshold
  const validThreshold = threshold > 0 ? threshold : DEFAULT_THRESHOLD;

  const resetTimer = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      callback();
    }, validThreshold);
  }, [callback, validThreshold]);

  const handleActivity = useCallback(() => {
    if (!enabled) return;

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the timer reset to avoid excessive resets
    debounceRef.current = setTimeout(() => {
      resetTimer();
    }, DEFAULT_DEBOUNCE);
  }, [enabled, resetTimer]);

  useEffect(() => {
    if (!enabled) return;

    const events: ActivityEvent[] = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Initialize timer on mount
    resetTimer();

    return () => {
      // Cleanup event listeners
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });

      // Clear all timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [enabled, handleActivity, resetTimer]);
};