-- Add type column if it doesn't exist
ALTER TABLE email_tracking 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'sent' CHECK (type IN ('sent', 'received', 'draft'));

-- Update email_tracking table to add the folder field
ALTER TABLE email_tracking 
ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT 'sent' CHECK (folder IN ('inbox', 'sent', 'drafts', 'trash'));

-- Set all existing records to 'sent' type and folder since we can't determine their previous state
UPDATE email_tracking 
SET folder = 'sent', 
    type = 'sent';

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_email_tracking_folder ON email_tracking(folder);
CREATE INDEX IF NOT EXISTS idx_email_tracking_type ON email_tracking(type);

-- Add comments explaining the usage of folder vs type
COMMENT ON COLUMN email_tracking.folder IS 'Folder for UI organization (inbox, sent, drafts, trash)';
COMMENT ON COLUMN email_tracking.type IS 'Type of email (sent, received, draft)'; 