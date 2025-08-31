import { useEffect, useRef, useState } from 'react';
import { 
  PollingStrategy, 
  PollingState, 
  DEFAULT_POLLING_STRATEGY,
  calculateNextInterval,
  createPollingState
} from '../utils/pollingStrategies';

export const useSmartPolling = (
  callback: () => Promise<any> | any,
  strategy: PollingStrategy = DEFAULT_POLLING_STRATEGY,
  enabled: boolean = true
): PollingState => {
  const [pollingState, setPollingState] = useState<PollingState>(() => createPollingState(true));
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  const strategyRef = useRef(strategy);
  const pollingStateRef = useRef(pollingState);
  
  // Keep refs in sync
  callbackRef.current = callback;
  strategyRef.current = strategy;
  pollingStateRef.current = pollingState;

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Self-contained polling loop - SYNC for fake timers compatibility
    const poll = () => {
      if (!enabled) return;

      let newErrorCount = pollingStateRef.current.errorCount;
      
      try {
        callbackRef.current(); // Sync call
        newErrorCount = 0; // Success resets errors
        setPollingState(prev => ({ 
          ...prev, 
          errorCount: 0, 
          lastSuccessTime: Date.now() 
        }));
      } catch (error) {
        newErrorCount = pollingStateRef.current.errorCount + 1; // Increment errors
        setPollingState(prev => ({ 
          ...prev, 
          errorCount: prev.errorCount + 1 
        }));
      }

      // Schedule next poll using CURRENT error count
      if (enabled) {
        const currentState = { 
          ...pollingStateRef.current, 
          isActive: true,
          errorCount: newErrorCount // Use fresh error count
        };
        const interval = calculateNextInterval(strategyRef.current, currentState);
        
        setPollingState(prev => ({ ...prev, currentInterval: interval }));
        
        timeoutRef.current = setTimeout(() => {
          poll();
        }, interval);
      }
    };

    // Start immediately
    poll();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled]); // Only enabled dependency - stable!

  return pollingState;
};