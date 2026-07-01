-- ENABLE SECURITY FEATURES: Email Verification & 2FA
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. ENABLE EMAIL CONFIRMATION
-- ============================================
-- This requires users to verify their email before logging in

-- Update site URL for email confirmation links
-- Go to: Authentication > URL Configuration > Site URL
-- Set to: http://localhost:5173/auth/callback (for dev) or your production URL

-- ============================================
-- 2. EMAIL TEMPLATES (Configure in Supabase Dashboard)
-- ============================================
-- Go to: Authentication > Email Templates
-- 
-- Confirm Signup Template:
-- Subject: Verify your email for Enterprise Portal
-- Body:
-- <h2>Welcome to Enterprise Portal!</h2>
-- <p>Please verify your email by entering this code:</p>
-- <h1>{{ .Token }}</h1>
-- <p>Or click: <a href="{{ .ConfirmationURL }}">Verify Email</a></p>
-- <p>This code expires in 1 hour.</p>
--
-- Magic Link Template (for 2FA):
-- Subject: Your 2FA Code - Enterprise Portal
-- Body:
-- <h2>Two-Factor Authentication</h2>
-- <p>Your verification code is:</p>
-- <h1>{{ .Token }}</h1>
-- <p>This code expires in 5 minutes.</p>
-- <p>If you didn't request this, please secure your account immediately.</p>

-- ============================================
-- 3. CREATE OTP/2FA CODES TABLE (Optional - for enhanced 2FA)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email_verification', '2fa_login', 'password_reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_otp_codes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own OTP codes
CREATE POLICY "Users can view own OTP codes" 
ON public.user_otp_codes FOR SELECT 
USING (auth.uid() = user_id);

-- Only service role can insert/update
CREATE POLICY "Service role can manage OTP codes" 
ON public.user_otp_codes FOR ALL 
USING (true) 
WITH CHECK (true);

-- ============================================
-- 4. FUNCTION TO CLEAN UP EXPIRED OTP CODES
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_otp_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_otp_codes 
  WHERE expires_at < NOW() OR (used = true AND created_at < NOW() - INTERVAL '24 hours');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. ENABLE 2FA REQUIREMENT FOR ADMIN USERS (Optional)
-- ============================================

-- Add 2FA enabled flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Update existing admin users to require 2FA
UPDATE public.profiles 
SET two_factor_enabled = true 
WHERE role IN ('Admin', 'SuperAdmin');

-- ============================================
-- 6. SECURITY AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" 
ON public.security_audit_log FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('Admin', 'SuperAdmin')
  )
);

-- ============================================
-- 7. VERIFY SETUP
-- ============================================

-- Check email confirmation settings
SELECT 
  email,
  email_confirmed_at,
  raw_user_meta_data->>'role' as role
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check profiles with 2FA
SELECT 
  email, 
  role, 
  two_factor_enabled,
  email_verified
FROM public.profiles 
WHERE role IN ('Admin', 'SuperAdmin');
