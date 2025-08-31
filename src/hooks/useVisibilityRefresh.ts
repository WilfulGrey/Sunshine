import { useEffect, useCallback, useRef, useState } from 'react';
import { getVisibilityAPI, isVisibilityAPISupported } from '../utils/visibilityHelpers';

const DEFAULT_MIN_INTERVAL = 30000; // 30 seconds
const DEFAULT_THRESHOLD = 1000; // 1 second

export interface VisibilityState {
  isVisible: boolean;
  lastVisibilityChange: Date;
  hiddenDuration: number;
}

export const useVisibilityRefresh = (
  callback: () => void,
  minInterval: number = DEFAULT_MIN_INTERVAL,
  lastDataUpdate?: number,
  threshold: number = DEFAULT_THRESHOLD
): VisibilityState | null => {
  const [visibilityState, setVisibilityState] = useState<VisibilityState | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const hiddenStartTimeRef = useRef<number | null>(null);

  const handleVisibilityChange = useCallback(() => {
    const api = getVisibilityAPI();
    if (!api) return;

    const now = Date.now();
    const isCurrentlyHidden = api.isHidden();

    if (isCurrentlyHidden) {
      // Tab became hidden
      hiddenStartTimeRef.current = now;
      const newState: VisibilityState = {
        isVisible: false,
        lastVisibilityChange: new Date(now),
        hiddenDuration: 0
      };
      setVisibilityState(newState);
    } else {
      // Tab became visible
      const hiddenDuration = hiddenStartTimeRef.current 
        ? now - hiddenStartTimeRef.current 
        : 0;
      
      const newState: VisibilityState = {
        isVisible: true,
        lastVisibilityChange: new Date(now),
        hiddenDuration
      };
      setVisibilityState(newState);

      // Check if we should trigger refresh
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      const timeSinceLastData = lastDataUpdate ? now - lastDataUpdate : Infinity;
      
      const shouldRefresh = 
        hiddenDuration >= threshold && // Hidden long enough
        timeSinceLastRefresh >= minInterval && // Respect minimum interval
        timeSinceLastData >= minInterval; // Don't refresh if data is fresh

      if (shouldRefresh) {
        lastRefreshRef.current = now;
        callback();
      }
      
      hiddenStartTimeRef.current = null;
    }
  }, [callback, minInterval, lastDataUpdate, threshold]);

  useEffect(() => {
    if (!isVisibilityAPISupported()) {
      return;
    }

    const api = getVisibilityAPI();
    if (!api) return;

    // Initialize state
    const initialState: VisibilityState = {
      isVisible: !api.isHidden(),
      lastVisibilityChange: new Date(),
      hiddenDuration: 0
    };
    setVisibilityState(initialState);

    // Add event listener
    document.addEventListener(api.visibilityChangeEvent, handleVisibilityChange);

    return () => {
      // Cleanup
      document.removeEventListener(api.visibilityChangeEvent, handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  return visibilityState;
};