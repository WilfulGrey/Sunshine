export interface ActivityRefreshOptions {
  threshold?: number; // milliseconds
  enabled?: boolean;
  debounceMs?: number;
}

export type ActivityEvent = 'mousemove' | 'keydown' | 'touchstart' | 'scroll' | 'click';

export interface ActivityState {
  isActive: boolean;
  lastActivityTime: Date;
  inactivityDuration: number;
}

export type ActivityCallback = () => void;