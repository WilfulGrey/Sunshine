/*
  # Add user profiles data

  1. Insert user profiles
    - Michał Kępiński
    - Dominika Grabowska  
    - Małgorzata Łuksin
    - Administrator Mamamia

  2. Notes
    - Uses generated UUIDs for user IDs
    - Creates profiles that can be used for task assignment
    - Email addresses follow company domain pattern
*/

-- Insert user profiles
INSERT INTO profiles (id, full_name, email, created_at) VALUES
  (gen_random_uuid(), 'Michał Kępiński', 'michal.kepinski@mamamia.com', now()),
  (gen_random_uuid(), 'Dominika Grabowska', 'dominika.grabowska@mamamia.com', now()),
  (gen_random_uuid(), 'Małgorzata Łuksin', 'malgorzata.luksin@mamamia.com', now()),
  (gen_random_uuid(), 'Administrator Mamamia', 'admin@mamamia.com', now())
ON CONFLICT (email) DO NOTHING;