import { useCallback, useMemo } from 'react';
import { useActivityRefresh } from './useActivityRefresh';
import { useVisibilityRefresh } from './useVisibilityRefresh';
import { useSmartPolling } from './useSmartPolling';
import { PollingStrategy, DEFAULT_POLLING_STRATEGY } from '../utils/pollingStrategies';

export interface SmartRefreshOptions {
  // Activity detection options
  activityThreshold?: number; // milliseconds of inactivity before refresh
  activityEnabled?: boolean;
  
  // Visibility refresh options
  visibilityMinInterval?: number; // minimum interval between visibility refreshes
  visibilityThreshold?: number; // minimum hidden time before refresh on return
  visibilityEnabled?: boolean;
  
  // Smart polling options
  pollingStrategy?: Partial<PollingStrategy>;
  pollingEnabled?: boolean;
  
  // Global options
  enabled?: boolean;
  onError?: (error: Error, source: 'activity' | 'visibility' | 'polling') => void;
}

export interface SmartRefreshState {
  // Activity state
  isUserActive: boolean;
  lastActivityTime: Date | null;
  
  // Visibility state  
  isVisible: boolean;
  lastVisibilityChange: Date | null;
  hiddenTime: number;
  
  // Polling state
  pollingActive: boolean;
  pollingErrorCount: number;
  lastPollingSuccess: Date | null;
  currentPollingInterval: number;
  
  // Combined state
  lastRefreshTime: Date | null;
  refreshSource: 'manual' | 'activity' | 'visibility' | 'polling' | null;
  totalRefreshCount: number;
}

const DEFAULT_OPTIONS: Required<SmartRefreshOptions> = {
  activityThreshold: 5 * 60 * 1000, // 5 minutes
  activityEnabled: true,
  visibilityMinInterval: 30000, // 30 seconds
  visibilityThreshold: 30000, // 30 seconds
  visibilityEnabled: true,
  pollingStrategy: DEFAULT_POLLING_STRATEGY,
  pollingEnabled: true,
  enabled: true,
  onError: () => {} // noop default
};

export const useSmartRefresh = (
  refreshCallback: () => Promise<any> | any,
  options: SmartRefreshOptions = {}
) => {
  const config = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  
  // Merge polling strategy
  const pollingStrategy: PollingStrategy = useMemo(() => ({
    ...DEFAULT_POLLING_STRATEGY,
    ...config.pollingStrategy
  }), [config.pollingStrategy]);

  // Unified error handling wrapper
  const createErrorHandledCallback = useCallback((source: 'activity' | 'visibility' | 'polling') => {
    return async () => {
      try {
        await refreshCallback();
      } catch (error) {
        config.onError(error as Error, source);
        throw error; // Re-throw to maintain error behavior in individual hooks
      }
    };
  }, [refreshCallback, config.onError]);

  // Activity refresh integration
  const activityCallback = useMemo(() => 
    createErrorHandledCallback('activity'), 
    [createErrorHandledCallback]
  );
  
  useActivityRefresh(
    activityCallback,
    config.activityThreshold,
    config.enabled && config.activityEnabled
  );

  // Visibility refresh integration
  const visibilityCallback = useMemo(() => 
    createErrorHandledCallback('visibility'), 
    [createErrorHandledCallback]
  );
  
  const visibilityState = useVisibilityRefresh(
    visibilityCallback,
    config.visibilityMinInterval,
    undefined, // lastDataUpdate - let component handle this
    config.visibilityThreshold
  );

  // Smart polling integration
  const pollingCallback = useMemo(() => 
    createErrorHandledCallback('polling'), 
    [createErrorHandledCallback]
  );
  
  const pollingState = useSmartPolling(
    pollingCallback,
    pollingStrategy,
    config.enabled && config.pollingEnabled
  );

  // Combined state for external monitoring
  const smartRefreshState: SmartRefreshState = useMemo(() => ({
    // Activity state (approximated from enabled state)
    isUserActive: config.enabled && config.activityEnabled,
    lastActivityTime: null, // Individual hook doesn't expose this
    
    // Visibility state
    isVisible: visibilityState?.isVisible ?? true,
    lastVisibilityChange: visibilityState?.lastVisibilityChange ?? null,
    hiddenTime: visibilityState?.hiddenTime ?? 0,
    
    // Polling state
    pollingActive: pollingState?.isActive ?? false,
    pollingErrorCount: pollingState?.errorCount ?? 0,
    lastPollingSuccess: pollingState?.lastSuccessTime ? new Date(pollingState.lastSuccessTime) : null,
    currentPollingInterval: pollingState?.currentInterval ?? 0,
    
    // Combined state - these would need to be tracked separately for full implementation
    lastRefreshTime: null, // Component should track this
    refreshSource: null, // Component should track this
    totalRefreshCount: 0 // Component should track this
  }), [
    config.enabled,
    config.activityEnabled,
    visibilityState,
    pollingState
  ]);

  // Manual refresh function with unified error handling
  const triggerRefresh = useCallback(async (source: 'manual' = 'manual') => {
    try {
      await refreshCallback();
      return { success: true, error: null };
    } catch (error) {
      config.onError(error as Error, source);
      return { success: false, error: error as Error };
    }
  }, [refreshCallback, config.onError]);

  // Utility functions
  const pauseRefresh = useCallback(() => {
    // Individual hooks don't support pausing, but we can track intent
    // This would require extending the individual hooks
    console.warn('pauseRefresh: Individual hooks do not support runtime pausing. Use enabled option on re-render.');
  }, []);

  const resumeRefresh = useCallback(() => {
    // Individual hooks don't support resuming, but we can track intent
    console.warn('resumeRefresh: Individual hooks do not support runtime resuming. Use enabled option on re-render.');
  }, []);

  return {
    // State monitoring
    state: smartRefreshState,
    
    // Manual controls
    triggerRefresh,
    pauseRefresh, // Limited functionality - see implementation
    resumeRefresh, // Limited functionality - see implementation
    
    // Configuration
    isEnabled: config.enabled,
    strategies: {
      activity: config.activityEnabled,
      visibility: config.visibilityEnabled,
      polling: config.pollingEnabled
    }
  };
};