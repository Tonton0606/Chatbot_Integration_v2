-- Reset passwords for test accounts
-- Use password: TestPass123!

UPDATE auth.users 
SET encrypted_password = crypt('TestPass123!', gen_salt('bf'))
WHERE email IN ('KaliParrot@proton.me', 'haringsolomon0212@gmail.com');

-- Verify the update
SELECT email, email_confirmed_at, raw_user_meta_data->>'role' as role
FROM auth.users 
WHERE email IN ('KaliParrot@proton.me', 'haringsolomon0212@gmail.com');
