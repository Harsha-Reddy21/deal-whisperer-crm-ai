-- Fix Activity Type Constraints
-- Run this in your Supabase SQL Editor if you're still getting constraint errors

-- Check current constraints on activities table
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'activities' AND n.nspname = 'public';

-- Drop the existing type constraint if it exists and is too restrictive
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_class cl ON cl.oid = c.conrelid
        WHERE cl.relname = 'activities' 
        AND n.nspname = 'public' 
        AND c.conname = 'activities_type_check'
    ) THEN
        ALTER TABLE activities DROP CONSTRAINT activities_type_check;
    END IF;
END $$;

-- Add a new, more flexible type constraint
ALTER TABLE activities ADD CONSTRAINT activities_type_check 
CHECK (type IN ('email', 'call', 'meeting', 'note', 'task'));

-- Also ensure priority and status have proper constraints
DO $$ 
BEGIN
    -- Drop existing priority constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_class cl ON cl.oid = c.conrelid
        WHERE cl.relname = 'activities' 
        AND n.nspname = 'public' 
        AND c.conname = 'activities_priority_check'
    ) THEN
        ALTER TABLE activities DROP CONSTRAINT activities_priority_check;
    END IF;
    
    -- Drop existing status constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_class cl ON cl.oid = c.conrelid
        WHERE cl.relname = 'activities' 
        AND n.nspname = 'public' 
        AND c.conname = 'activities_status_check'
    ) THEN
        ALTER TABLE activities DROP CONSTRAINT activities_status_check;
    END IF;
END $$;

-- Add proper constraints for priority and status
ALTER TABLE activities ADD CONSTRAINT activities_priority_check 
CHECK (priority IN ('low', 'medium', 'high'));

ALTER TABLE activities ADD CONSTRAINT activities_status_check 
CHECK (status IN ('pending', 'completed', 'cancelled'));

-- Update any existing records that might have invalid values
UPDATE activities SET type = 'call' WHERE type IS NULL OR type = '';
UPDATE activities SET priority = 'medium' WHERE priority IS NULL OR priority = '';
UPDATE activities SET status = 'pending' WHERE status IS NULL OR status = ''; 