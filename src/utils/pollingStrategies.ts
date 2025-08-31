export interface PollingStrategy {
  activeInterval: number; // milliseconds - when user is active
  idleInterval: number; // milliseconds - when user is idle
  minInterval: number; // minimum polling interval
  maxInterval: number; // maximum polling interval
  backoffMultiplier: number; // exponential backoff multiplier
  maxRetries: number; // maximum consecutive error retries
}

export interface PollingState {
  isActive: boolean;
  errorCount: number;
  lastSuccessTime: number;
  currentInterval: number;
}

export const DEFAULT_POLLING_STRATEGY: PollingStrategy = {
  activeInterval: 30000, // 30 seconds when active
  idleInterval: 120000, // 2 minutes when idle
  minInterval: 10000, // 10 seconds minimum
  maxInterval: 300000, // 5 minutes maximum
  backoffMultiplier: 2, // double on each error
  maxRetries: 5
};

export const calculateNextInterval = (
  strategy: PollingStrategy,
  state: PollingState
): number => {
  const baseInterval = state.isActive ? strategy.activeInterval : strategy.idleInterval;
  
  if (state.errorCount === 0) {
    return Math.max(strategy.minInterval, Math.min(strategy.maxInterval, baseInterval));
  }
  
  // Apply exponential backoff for errors
  const backoffInterval = baseInterval * Math.pow(strategy.backoffMultiplier, state.errorCount);
  return Math.max(strategy.minInterval, Math.min(strategy.maxInterval, backoffInterval));
};

export const shouldStopPolling = (strategy: PollingStrategy, state: PollingState): boolean => {
  return state.errorCount >= strategy.maxRetries;
};

export const createPollingState = (isActive: boolean = true): PollingState => ({
  isActive,
  errorCount: 0,
  lastSuccessTime: Date.now(),
  currentInterval: 0
});