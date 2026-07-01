-- ============================================
-- RESET PASSWORDS FOR EXISTING ACCOUNTS
-- Run this in Supabase SQL Editor
-- ============================================

-- Option 1: Set a known password for existing accounts
UPDATE auth.users
SET password_hash = crypt('admin123', gen_salt('bcrypt'))
WHERE email IN ('haringsolomon0212@gmail.com', 'KaliParrot@proton.me');

-- Option 2: Create new admin account with known password
INSERT INTO auth.users (id, email, password_hash, created_at)
SELECT 
  gen_random_uuid(),
  'admin@hermes.local',
  crypt('admin123', gen_salt('bcrypt')),
  NOW();

-- Create corresponding profile
INSERT INTO public.profiles (id, email, full_name, role, company_name)
SELECT 
  gen_random_uuid(),
  'admin@hermes.local',
  'Test Admin',
  'SuperAdmin',
  'Hermes Inc.'
ON CONFLICT (id) DO NOTHING;

-- Option 3: Check current password hashes
SELECT email, created_at, last_sign_in_at 
FROM auth.users 
WHERE email IN ('haringsolomon0212@gmail.com', 'KaliParrot@proton.me');
