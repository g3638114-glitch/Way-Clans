-- Run this in Supabase SQL Editor to fix the RLS issue

-- Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Disable RLS on user_buildings table  
ALTER TABLE user_buildings DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('users', 'user_buildings');
