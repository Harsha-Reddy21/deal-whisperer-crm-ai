-- Add body and read_at fields to email_tracking table
ALTER TABLE email_tracking 
ADD COLUMN IF NOT EXISTS body TEXT,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Create index for read_at for better performance
CREATE INDEX IF NOT EXISTS idx_email_tracking_read_at ON email_tracking(read_at);
CREATE INDEX IF NOT EXISTS idx_email_tracking_user_read_status ON email_tracking(user_id, read_at); 