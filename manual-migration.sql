-- Manual Migration Script
-- Run this in your Supabase SQL Editor to add the new fields

-- Add lead_id column to activities table
ALTER TABLE activities ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE CASCADE;

-- Add outcome column to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('won', 'lost', 'in_progress')) DEFAULT 'in_progress';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_outcome ON deals(outcome);

-- Update existing deals to have 'in_progress' outcome if null
UPDATE deals SET outcome = 'in_progress' WHERE outcome IS NULL; 