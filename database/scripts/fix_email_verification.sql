-- FIX EMAIL VERIFICATION - Run this in Supabase SQL Editor
-- This enables email confirmation and configures the auth system

-- ============================================
-- 1. CHECK CURRENT EMAIL SETTINGS
-- ============================================

-- View current auth settings
SELECT 
  name,
  value
FROM auth.config
WHERE name LIKE '%email%' OR name LIKE '%confirm%';

-- ============================================
-- 2. ENABLE EMAIL CONFIRMATION (Critical!)
-- ============================================

-- Disable auto-confirmation (this makes email verification REQUIRED)
-- Go to: Supabase Dashboard → Authentication → Providers → Email
-- Toggle OFF: "Confirm email"

-- Or run this to check users who need verification:
SELECT 
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC;

-- ============================================
-- 3. CONFIGURE EMAIL TEMPLATES
-- ============================================
-- Go to: Supabase Dashboard → Authentication → Email Templates

-- Confirm Signup Template (HTML):
/*
<h2>Welcome to Hermes Enterprise Portal!</h2>
<p>Hi {{ .Data.name }},</p>
<p>Please verify your email address by entering this 6-digit code:</p>
<div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
  <h1 style="font-size: 32px; letter-spacing: 8px; margin: 0;">{{ .Token }}</h1>
</div>
<p>Or click this link to verify:</p>
<p><a href="{{ .ConfirmationURL }}" style="background: #c9a84c; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a></p>
<p style="color: #666; font-size: 12px;">This code expires in 1 hour.<br>If you didn't create an account, you can safely ignore this email.</p>
<hr>
<p style="color: #999; font-size: 11px;">Hermes Enterprise Portal</p>
*/

-- Magic Link Template (for 2FA):
/*
<h2>Two-Factor Authentication</h2>
<p>Hi {{ .Data.name }},</p>
<p>Your admin account requires additional verification. Please enter this code:</p>
<div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
  <h1 style="font-size: 32px; letter-spacing: 8px; margin: 0;">{{ .Token }}</h1>
</div>
<p>This code expires in 5 minutes.</p>
<p style="color: red; font-size: 12px;"><strong>If you didn't request this code, secure your account immediately.</strong></p>
<hr>
<p style="color: #999; font-size: 11px;">Hermes Enterprise Portal Security</p>
*/

-- ============================================
-- 4. SET SITE URL (Important!)
-- ============================================

-- Go to: Authentication → URL Configuration
-- Site URL: http://localhost:5173 (for local development)
-- Redirect URLs: Add http://localhost:5173/auth/callback

-- ============================================
-- 5. TEST EMAIL CONFIGURATION
-- ============================================

-- Create a test user (will trigger email if enabled)
-- Note: This will only send email if confirm_email is enabled in dashboard

-- First, let's manually confirm a user for testing:
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'KaliParrot@proton.me';

-- ============================================
-- 6. CHECK EMAIL PROVIDER SETTINGS
-- ============================================

-- Supabase free tier uses their shared email provider
-- For production, configure custom SMTP:
-- Go to: Authentication → Providers → Email → SMTP Settings

-- ============================================
-- 7. RESEND VERIFICATION EMAIL (Manual)
-- ============================================

-- If you need to manually trigger a verification email, 
-- the app already has this functionality (Resend button)

-- Or you can check email logs in Supabase Dashboard:
-- Go to: Logs → Auth → Look for "send_email" events

-- ============================================
-- 8. BYPASS FOR TESTING (Not for production!)
-- ============================================

-- If emails aren't working during development, 
-- auto-confirm users (DISABLE IN PRODUCTION!):

-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   -- Auto-confirm email for testing
--   NEW.email_confirmed_at = NOW();
--   
--   INSERT INTO public.profiles (id, email, full_name, company_name, role)
--   VALUES (
--     NEW.id,
--     NEW.email,
--     COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
--     NEW.raw_user_meta_data->>'company_name',
--     COALESCE(NEW.raw_user_meta_data->>'role', 'User')
--   )
--   ON CONFLICT (id) DO UPDATE SET
--     email = EXCLUDED.email,
--     full_name = EXCLUDED.full_name,
--     updated_at = NOW();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION CHECK
-- ============================================

-- Verify your user status:
SELECT 
  email,
  email_confirmed_at IS NOT NULL as is_verified,
  email_confirmed_at,
  created_at,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'full_name' as full_name
FROM auth.users
WHERE email = 'KaliParrot@proton.me';
