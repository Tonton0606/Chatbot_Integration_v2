-- ============================================
-- FIX SIGNUP ISSUE - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================

-- 1. Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Recreate the function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'Client')
  );
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile: ' || SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Verify the trigger is created
SELECT trigger_name, event_manipulation, action_statement, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'auth.users';

-- 5. Test the trigger by inserting a test user (optional - comment out after testing)
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
-- VALUES (
--   gen_random_uuid(),
--   'test@example.com',
--   crypt('password123', gen_salt('bf')),
--   NOW(),
--   '{"full_name": "Test User", "role": "Admin"}'::jsonb
-- );

-- 6. Check if profile was created
-- SELECT * FROM public.profiles WHERE email = 'test@example.com';

-- 7. Clean up test data (optional - comment out after testing)
-- DELETE FROM public.profiles WHERE email = 'test@example.com';
-- DELETE FROM auth.users WHERE email = 'test@example.com';

