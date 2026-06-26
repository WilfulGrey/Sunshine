/*
  # Add user activity timestamps to profiles

  1. Changes
    - Add `last_opened_at` (timestamptz) — set when the user opens/returns to the app
    - Add `last_action_at` (timestamptz) — set when the user performs a manual action
      (button click), NOT automatic refreshes/polling/realtime sync.

  2. Security
    - No new policies needed. The existing "Users can update their own profile"
      UPDATE policy (USING auth.uid() = id) already allows each logged-in user to
      write their own timestamps with the anon key + active session.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_opened_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_action_at timestamptz;
