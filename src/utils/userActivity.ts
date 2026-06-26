import { supabase } from '../lib/supabase';

/**
 * Tracks user activity timestamps in the `profiles` table:
 *   - last_opened_at: when the user opens / returns to the app
 *   - last_action_at: when the user performs a MANUAL action (button click).
 *     Automatic refreshes (activity/visibility/polling), realtime sync and
 *     version checks must NOT call recordUserAction.
 *
 * All writes are fire-and-forget — failures are logged but never block the UI.
 * Writes target the current user's own row, allowed by the existing
 * "Users can update their own profile" RLS policy (auth.uid() = id).
 */

const ACTION_THROTTLE_MS = 30_000;   // last_action_at: at most one write / 30s
const OPENED_THROTTLE_MS = 60_000;   // last_opened_at: at most one write / 60s (tab toggles)

let lastActionWriteAt = 0;
let lastOpenedWriteAt = 0;

/**
 * Record a manual user action. Throttled to one write per 30s.
 * Call from genuine button-click handlers only.
 */
export const recordUserAction = (userId: string | undefined | null): void => {
  if (!userId) return;
  const now = Date.now();
  if (now - lastActionWriteAt < ACTION_THROTTLE_MS) return;
  lastActionWriteAt = now;

  supabase
    .from('profiles')
    .update({ last_action_at: new Date().toISOString() })
    .eq('id', userId)
    .then(({ error }) => {
      if (error) console.warn('recordUserAction failed:', error.message);
    });
};

/**
 * Record that the user opened / returned to the app. Throttled to one write per 60s.
 * Call on mount and on tab-visible.
 */
export const recordUserOpened = (userId: string | undefined | null): void => {
  if (!userId) return;
  const now = Date.now();
  if (now - lastOpenedWriteAt < OPENED_THROTTLE_MS) return;
  lastOpenedWriteAt = now;

  supabase
    .from('profiles')
    .update({ last_opened_at: new Date().toISOString() })
    .eq('id', userId)
    .then(({ error }) => {
      if (error) console.warn('recordUserOpened failed:', error.message);
    });
};
