-- Add lead_id column to activities table
ALTER TABLE activities ADD COLUMN lead_id UUID REFERENCES leads(id) ON DELETE CASCADE;

-- Add outcome column to deals table
ALTER TABLE deals ADD COLUMN outcome TEXT CHECK (outcome IN ('won', 'lost', 'in_progress')) DEFAULT 'in_progress';

-- Create index for better performance
CREATE INDEX idx_activities_lead_id ON activities(lead_id);
CREATE INDEX idx_deals_outcome ON deals(outcome);
