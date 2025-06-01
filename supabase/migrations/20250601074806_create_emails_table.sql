-- Create emails table for comprehensive email management
CREATE TABLE IF NOT EXISTS emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  -- Email metadata
  email_id TEXT UNIQUE NOT NULL, -- External email service ID
  thread_id TEXT, -- For email threading
  message_id TEXT, -- RFC 2822 Message-ID
  
  -- Email content
  subject TEXT NOT NULL,
  body_text TEXT, -- Plain text version
  body_html TEXT, -- HTML version
  snippet TEXT, -- Short preview text
  
  -- Email addresses
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails TEXT[] NOT NULL, -- Array of recipient emails
  cc_emails TEXT[], -- Array of CC emails
  bcc_emails TEXT[], -- Array of BCC emails
  reply_to TEXT,
  
  -- Email status and metadata
  type TEXT NOT NULL CHECK (type IN ('inbox', 'sent', 'draft', 'trash', 'spam')),
  status TEXT DEFAULT 'unread' CHECK (status IN ('read', 'unread', 'archived', 'starred', 'important')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Email tracking
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  
  -- Attachments and labels
  has_attachments BOOLEAN DEFAULT FALSE,
  attachment_count INTEGER DEFAULT 0,
  labels TEXT[], -- Array of labels/tags
  
  -- AI features
  summary TEXT, -- AI-generated summary
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  importance_score INTEGER CHECK (importance_score >= 0 AND importance_score <= 100),
  auto_categorized BOOLEAN DEFAULT FALSE,
  category TEXT, -- AI-determined category
  
  -- System fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_attachments table
CREATE TABLE IF NOT EXISTS email_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  attachment_id TEXT, -- External service attachment ID
  download_url TEXT,
  is_inline BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_summaries table for AI-generated summaries
CREATE TABLE IF NOT EXISTS email_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_type TEXT NOT NULL CHECK (summary_type IN ('unread', 'daily', 'weekly', 'custom', 'single')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  email_ids UUID[], -- Array of email IDs included in summary
  email_count INTEGER DEFAULT 0,
  date_range_start TIMESTAMP WITH TIME ZONE,
  date_range_end TIMESTAMP WITH TIME ZONE,
  filters JSONB, -- Store filter criteria used
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_type_status ON emails(type, status);
CREATE INDEX IF NOT EXISTS idx_emails_contact_id ON emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_emails_lead_id ON emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_emails_deal_id ON emails(deal_id);
CREATE INDEX IF NOT EXISTS idx_emails_company_id ON emails(company_id);
CREATE INDEX IF NOT EXISTS idx_emails_sent_at ON emails(sent_at);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_from_email ON emails(from_email);
CREATE INDEX IF NOT EXISTS idx_emails_subject ON emails USING gin(to_tsvector('english', subject));
CREATE INDEX IF NOT EXISTS idx_emails_body_text ON emails USING gin(to_tsvector('english', body_text));

CREATE INDEX IF NOT EXISTS idx_email_attachments_email_id ON email_attachments(email_id);
CREATE INDEX IF NOT EXISTS idx_email_summaries_user_id ON email_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_email_summaries_type ON email_summaries(summary_type);

-- Enable RLS (Row Level Security)
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for emails
CREATE POLICY "Users can view their own emails" ON emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emails" ON emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emails" ON emails
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emails" ON emails
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for email_attachments
CREATE POLICY "Users can view attachments of their emails" ON email_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM emails 
      WHERE emails.id = email_attachments.email_id 
      AND emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attachments for their emails" ON email_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM emails 
      WHERE emails.id = email_attachments.email_id 
      AND emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update attachments of their emails" ON email_attachments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM emails 
      WHERE emails.id = email_attachments.email_id 
      AND emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments of their emails" ON email_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM emails 
      WHERE emails.id = email_attachments.email_id 
      AND emails.user_id = auth.uid()
    )
  );

-- Create RLS policies for email_summaries
CREATE POLICY "Users can view their own email summaries" ON email_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email summaries" ON email_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email summaries" ON email_summaries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email summaries" ON email_summaries
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_emails_updated_at BEFORE UPDATE ON emails
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: Sample emails will be created programmatically when users first access the email feature
-- since auth.uid() is not available during migration execution 