-- Check your current users and their roles
SELECT id, email, role, created_at
FROM profiles
ORDER BY created_at DESC;

-- If you need to set a specific user as SuperAdmin, replace 'USER_ID_HERE' with the actual user ID:
-- UPDATE profiles 
-- SET role = 'SuperAdmin' 
-- WHERE id = 'USER_ID_HERE';

-- Or set as Admin:
-- UPDATE profiles 
-- SET role = 'Admin' 
-- WHERE id = 'USER_ID_HERE';

-- Verify all admin users:
SELECT id, email, role 
FROM profiles 
WHERE role IN ('Admin', 'SuperAdmin');
