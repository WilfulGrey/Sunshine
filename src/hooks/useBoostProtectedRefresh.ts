import { useState, useCallback, useRef } from 'react';

/**
 * BOOST-PROTECTED REFRESH SYSTEM
 * 
 * Elegant solution for boost/refresh conflicts following project patterns:
 * - Singleton approach (like AirtableService)
 * - Memoized state management (like LanguageContext)
 * - Evidence-based implementation (confirmed by Puppeteer tests)
 * 
 * Core Problem Solved:
 * Smart Refresh System overwrites boost state during tab visibility changes,
 * causing users to lose visual feedback on boost operations.
 * 
 * Architecture:
 * 1. Boost Protection Guard - pauses refresh during active boosts
 * 2. Queued Refresh System - delays refresh requests until boost completion
 * 3. State Preservation - maintains boost spinners and user feedback
 */

export interface BoostProtectionState {
  isBoostActive: boolean;
  activeBoostId: string | null;
  queuedRefreshCount: number;
  lastBoostTime: number | null;
}

export interface RefreshRequest {
  type: 'activity' | 'visibility' | 'polling' | 'manual';
  callback: () => Promise<void>;
  timestamp: number;
  priority: 'high' | 'normal';
}

class BoostProtectionManager {
  private static instance: BoostProtectionManager | null = null;
  private activeBoosts = new Set<string>();
  private queuedRequests: RefreshRequest[] = [];
  private isProcessingQueue = false;
  
  // Singleton pattern (following AirtableService architecture)
  static getInstance(): BoostProtectionManager {
    if (!BoostProtectionManager.instance) {
      BoostProtectionManager.instance = new BoostProtectionManager();
    }
    return BoostProtectionManager.instance;
  }

  // Register boost operation (prevents refresh)
  startBoost(boostId: string): void {
    console.log(`🛡️ Boost Protection: Starting boost operation "${boostId}"`);
    this.activeBoosts.add(boostId);
  }

  // Complete boost operation (allows refresh)
  endBoost(boostId: string): void {
    console.log(`🛡️ Boost Protection: Scheduling end of boost operation "${boostId}" with grace period`);
    
    // Grace period to handle race conditions with rapid refresh triggers
    setTimeout(() => {
      console.log(`🛡️ Boost Protection: Actually ending boost operation "${boostId}"`);
      this.activeBoosts.delete(boostId);
      
      // Process queued refreshes after boost completion
      if (this.activeBoosts.size === 0 && this.queuedRequests.length > 0) {
        console.log(`🔄 Processing ${this.queuedRequests.length} queued refresh requests`);
        this.processQueuedRefreshes();
      }
    }, 1000); // 1 second grace period to handle visibility changes during boost
  }

  // Check if any boost operations are active
  hasActiveBoosts(): boolean {
    return this.activeBoosts.size > 0;
  }

  // Queue refresh request for later execution
  queueRefresh(request: RefreshRequest): void {
    if (!this.hasActiveBoosts()) {
      // No active boosts - execute immediately
      console.log(`🔄 No active boosts - executing ${request.type} refresh immediately`);
      request.callback().catch(error => 
        console.error(`❌ Immediate refresh failed:`, error)
      );
      return;
    }

    console.log(`⏳ Queueing ${request.type} refresh - boost operation in progress`);
    this.queuedRequests.push(request);
    
    // Keep only latest request per type (avoid spam)
    this.deduplicateQueue();
  }

  // Remove duplicate requests by type (keep latest)
  private deduplicateQueue(): void {
    const latestByType = new Map<string, RefreshRequest>();
    
    this.queuedRequests.forEach(request => {
      const existing = latestByType.get(request.type);
      if (!existing || request.timestamp > existing.timestamp) {
        latestByType.set(request.type, request);
      }
    });
    
    this.queuedRequests = Array.from(latestByType.values());
  }

  // Execute all queued refresh requests
  private async processQueuedRefreshes(): Promise<void> {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    const requests = [...this.queuedRequests];
    this.queuedRequests = [];
    
    try {
      // Sort by priority (high first) then by timestamp
      requests.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority === 'high' ? -1 : 1;
        }
        return a.timestamp - b.timestamp;
      });

      console.log(`🔄 Executing ${requests.length} queued refresh requests in order`);
      
      for (const request of requests) {
        try {
          console.log(`🔄 Executing queued ${request.type} refresh`);
          await request.callback();
          
          // Small delay between requests to avoid overwhelming
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`❌ Queued ${request.type} refresh failed:`, error);
        }
      }
      
      console.log(`✅ All queued refreshes completed`);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // Get current protection state
  getState(): BoostProtectionState {
    return {
      isBoostActive: this.hasActiveBoosts(),
      activeBoostId: this.activeBoosts.size > 0 ? Array.from(this.activeBoosts)[0] : null,
      queuedRefreshCount: this.queuedRequests.length,
      lastBoostTime: null // Could be enhanced if needed
    };
  }

  // Debug information
  getDebugInfo(): { activeBoosts: string[], queuedRequests: number, isProcessing: boolean } {
    return {
      activeBoosts: Array.from(this.activeBoosts),
      queuedRequests: this.queuedRequests.length,
      isProcessing: this.isProcessingQueue
    };
  }
}

/**
 * Hook for boost-protected refresh functionality
 * 
 * Usage in TaskFocusedView:
 * const { protectRefresh, startBoost, endBoost, state } = useBoostProtectedRefresh();
 * 
 * // In refresh callbacks:
 * const handleVisibilityRefresh = useCallback(async () => {
 *   await protectRefresh('visibility', onSilentRefresh);
 * }, [protectRefresh, onSilentRefresh]);
 * 
 * // In boost operations:
 * const executeBoost = async () => {
 *   const boostId = startBoost();
 *   try {
 *     await performBoostOperation();
 *   } finally {
 *     endBoost(boostId);
 *   }
 * };
 */
export const useBoostProtectedRefresh = () => {
  const manager = BoostProtectionManager.getInstance();
  const [state, setState] = useState<BoostProtectionState>(manager.getState());
  const updateStateRef = useRef<() => void>();

  // Memoized state update function
  const updateState = useCallback(() => {
    setState(manager.getState());
  }, [manager]);

  updateStateRef.current = updateState;

  // Protected refresh function
  const protectRefresh = useCallback(async (
    type: RefreshRequest['type'],
    callback: () => Promise<void>,
    priority: 'high' | 'normal' = 'normal'
  ) => {
    const request: RefreshRequest = {
      type,
      callback,
      timestamp: Date.now(),
      priority
    };

    manager.queueRefresh(request);
    updateStateRef.current?.();
  }, [manager]);

  // Start boost protection
  const startBoost = useCallback((customId?: string): string => {
    const boostId = customId || `boost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    manager.startBoost(boostId);
    updateStateRef.current?.();
    return boostId;
  }, [manager]);

  // End boost protection
  const endBoost = useCallback((boostId: string) => {
    manager.endBoost(boostId);
    // Small delay to allow queue processing to start
    setTimeout(() => updateStateRef.current?.(), 100);
  }, [manager]);

  // Get debug information
  const getDebugInfo = useCallback(() => {
    return manager.getDebugInfo();
  }, [manager]);

  return {
    protectRefresh,
    startBoost,
    endBoost,
    state,
    getDebugInfo
  };
};

export default useBoostProtectedRefresh;