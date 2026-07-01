-- Add demographic fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS age_group TEXT CHECK (age_group IN ('18-24', '25-34', '35-44', '45-54', '55-64', '65+')),
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'non-binary', 'prefer-not-to-say', 'other')),
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;
