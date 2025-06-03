-- =====================================================
-- DEAL WHISPERER CRM - COMPLETE DATABASE SCHEMA
-- =====================================================
-- This migration creates the complete database schema for the Deal Whisperer CRM system
-- including all tables, indexes, functions, policies, and AI features.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- CORE CRM TABLES
-- =====================================================

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  size TEXT CHECK (size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
  website TEXT,
  description TEXT,
  notes TEXT,
  location TEXT,
  founded_year INTEGER,
  revenue_range TEXT,
  employee_count INTEGER,
  logo_url TEXT,
  social_links JSONB DEFAULT '{}',
  tags TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Vector columns for AI search
  description_vector vector(1536),
  notes_vector vector(1536)
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  title TEXT,
  company TEXT, -- Denormalized for quick access
  status TEXT DEFAULT 'Cold Lead' CHECK (status IN ('Cold Lead', 'Hot Lead', 'Qualified', 'Customer')),
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  persona TEXT,
  notes TEXT,
  avatar TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  last_contact TIMESTAMP WITH TIME ZONE,
  next_follow_up TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Vector columns for AI search
  persona_vector vector(1536),
  notes_vector vector(1536)
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  company TEXT, -- Denormalized for quick access
  title TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'form', 'import', 'integration', 'referral', 'social', 'advertising')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'unqualified', 'converted')),
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  notes TEXT,
  lead_magnet TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  conversion_date TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  company TEXT, -- Denormalized for quick access
  contact_name TEXT, -- Denormalized for quick access
  value DECIMAL(15,2) DEFAULT 0,
  stage TEXT DEFAULT 'Discovery' CHECK (stage IN ('Discovery', 'Proposal', 'Negotiation', 'Closing', 'Won', 'Lost')),
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  outcome TEXT DEFAULT 'in_progress' CHECK (outcome IN ('in_progress', 'won', 'lost')),
  expected_close_date DATE,
  actual_close_date DATE,
  next_step TEXT,
  last_activity TIMESTAMP WITH TIME ZONE,
  pipeline TEXT DEFAULT 'default',
  deal_source TEXT,
  competitor TEXT,
  loss_reason TEXT,
  win_reason TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Vector columns for AI search
  title_vector vector(1536),
  next_step_vector vector(1536),
  description_vector vector(1536)
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'task', 'note', 'demo', 'proposal', 'follow_up')),
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'rescheduled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  location TEXT,
  attendees TEXT[],
  outcome TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Vector columns for AI search
  description_vector vector(1536),
  notes_vector vector(1536)
);

-- Email tracking table
CREATE TABLE IF NOT EXISTS email_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'sent' CHECK (type IN ('sent', 'received', 'draft')),
  subject TEXT NOT NULL,
  body TEXT,
  sender_email TEXT,
  recipient_email TEXT,
  cc_emails TEXT[],
  bcc_emails TEXT[],
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed')),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  attachments JSONB DEFAULT '[]',
  tracking_data JSONB DEFAULT '{}',
  template_id UUID,
  campaign_id UUID,
  thread_id TEXT,
  message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- AI AND ANALYTICS TABLES
-- =====================================================

-- Embedding metadata table for vector search
CREATE TABLE IF NOT EXISTS embedding_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  text_content TEXT NOT NULL,
  embedding_vector vector(1536) NOT NULL,
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(table_name, record_id, field_name)
);

-- Semantic search queries and results
CREATE TABLE IF NOT EXISTS semantic_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  query_vector vector(1536) NOT NULL,
  search_type TEXT NOT NULL CHECK (search_type IN ('deals', 'contacts', 'activities', 'companies', 'all')),
  results_count INTEGER DEFAULT 0,
  similarity_threshold DECIMAL(3,2) DEFAULT 0.7,
  search_results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email summaries table
CREATE TABLE IF NOT EXISTS email_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_type TEXT NOT NULL CHECK (summary_type IN ('unread', 'daily', 'weekly', 'custom', 'single')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_insights TEXT[],
  action_items TEXT[],
  priority_emails JSONB DEFAULT '[]',
  email_count INTEGER DEFAULT 0,
  date_range_start TIMESTAMP WITH TIME ZONE,
  date_range_end TIMESTAMP WITH TIME ZONE,
  statistics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transcripts table for audio/video processing
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'transcribing', 'transcribed', 'summarized', 'failed')),
  transcript_text TEXT,
  summary TEXT,
  key_points TEXT[],
  action_items TEXT[],
  topics TEXT[],
  sentiment TEXT,
  confidence_score DECIMAL(3,2),
  duration_seconds INTEGER,
  language TEXT DEFAULT 'en',
  processing_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary indexes
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_score ON contacts(score);

CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);

CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_outcome ON deals(outcome);
CREATE INDEX IF NOT EXISTS idx_deals_value ON deals(value);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close_date ON deals(expected_close_date);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_scheduled_at ON activities(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_email_tracking_user_id ON email_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_contact_id ON email_tracking(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_deal_id ON email_tracking(deal_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_type ON email_tracking(type);
CREATE INDEX IF NOT EXISTS idx_email_tracking_status ON email_tracking(status);

-- Vector indexes for AI search
CREATE INDEX IF NOT EXISTS idx_deals_title_vector ON deals USING ivfflat (title_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_deals_next_step_vector ON deals USING ivfflat (next_step_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_deals_description_vector ON deals USING ivfflat (description_vector vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_contacts_persona_vector ON contacts USING ivfflat (persona_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_contacts_notes_vector ON contacts USING ivfflat (notes_vector vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_activities_description_vector ON activities USING ivfflat (description_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_activities_notes_vector ON activities USING ivfflat (notes_vector vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_companies_description_vector ON companies USING ivfflat (description_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_companies_notes_vector ON companies USING ivfflat (notes_vector vector_cosine_ops) WITH (lists = 100);

-- Embedding metadata indexes
CREATE INDEX IF NOT EXISTS idx_embedding_metadata_user_id ON embedding_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_embedding_metadata_table_record ON embedding_metadata(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_embedding_metadata_vector ON embedding_metadata USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);

-- Semantic search indexes
CREATE INDEX IF NOT EXISTS idx_semantic_searches_user_id ON semantic_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_semantic_searches_type ON semantic_searches(search_type);
CREATE INDEX IF NOT EXISTS idx_semantic_searches_vector ON semantic_searches USING ivfflat (query_vector vector_cosine_ops) WITH (lists = 100);

-- Transcript indexes
CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_contact_id ON transcripts(contact_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_deal_id ON transcripts(deal_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_status ON transcripts(status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedding_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Users can view their own companies" ON companies
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own companies" ON companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own companies" ON companies
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own companies" ON companies
  FOR DELETE USING (auth.uid() = user_id);

-- Contacts policies
CREATE POLICY "Users can view their own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contacts" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Leads policies
CREATE POLICY "Users can view their own leads" ON leads
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own leads" ON leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own leads" ON leads
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own leads" ON leads
  FOR DELETE USING (auth.uid() = user_id);

-- Deals policies
CREATE POLICY "Users can view their own deals" ON deals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own deals" ON deals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own deals" ON deals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own deals" ON deals
  FOR DELETE USING (auth.uid() = user_id);

-- Activities policies
CREATE POLICY "Users can view their own activities" ON activities
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own activities" ON activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own activities" ON activities
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own activities" ON activities
  FOR DELETE USING (auth.uid() = user_id);

-- Email tracking policies
CREATE POLICY "Users can view their own email tracking" ON email_tracking
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own email tracking" ON email_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own email tracking" ON email_tracking
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own email tracking" ON email_tracking
  FOR DELETE USING (auth.uid() = user_id);

-- Embedding metadata policies
CREATE POLICY "Users can view their own embedding metadata" ON embedding_metadata
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own embedding metadata" ON embedding_metadata
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own embedding metadata" ON embedding_metadata
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own embedding metadata" ON embedding_metadata
  FOR DELETE USING (auth.uid() = user_id);

-- Semantic searches policies
CREATE POLICY "Users can view their own semantic searches" ON semantic_searches
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own semantic searches" ON semantic_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own semantic searches" ON semantic_searches
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own semantic searches" ON semantic_searches
  FOR DELETE USING (auth.uid() = user_id);

-- Email summaries policies
CREATE POLICY "Users can view their own email summaries" ON email_summaries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own email summaries" ON email_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own email summaries" ON email_summaries
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own email summaries" ON email_summaries
  FOR DELETE USING (auth.uid() = user_id);

-- Transcripts policies
CREATE POLICY "Users can view their own transcripts" ON transcripts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transcripts" ON transcripts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transcripts" ON transcripts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transcripts" ON transcripts
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_tracking_updated_at BEFORE UPDATE ON email_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transcripts_updated_at BEFORE UPDATE ON transcripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update embedding metadata timestamp
CREATE OR REPLACE FUNCTION update_embedding_metadata_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_embedding_metadata_updated_at 
  BEFORE UPDATE ON embedding_metadata
  FOR EACH ROW EXECUTE FUNCTION update_embedding_metadata_timestamp();

-- Vector similarity search functions
CREATE OR REPLACE FUNCTION search_similar_deals(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  target_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  company text,
  stage text,
  value numeric,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.company,
    d.stage,
    d.value,
    1 - (d.title_vector <=> query_embedding) as similarity
  FROM deals d
  WHERE 
    d.title_vector IS NOT NULL
    AND (target_user_id IS NULL OR d.user_id = target_user_id)
    AND 1 - (d.title_vector <=> query_embedding) > similarity_threshold
  ORDER BY d.title_vector <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION search_similar_contacts(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  target_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  company text,
  title text,
  persona text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.company,
    c.title,
    c.persona,
    1 - (c.persona_vector <=> query_embedding) as similarity
  FROM contacts c
  WHERE 
    c.persona_vector IS NOT NULL
    AND (target_user_id IS NULL OR c.user_id = target_user_id)
    AND 1 - (c.persona_vector <=> query_embedding) > similarity_threshold
  ORDER BY c.persona_vector <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION search_similar_activities(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  target_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  type text,
  description text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.type,
    a.description,
    1 - (a.description_vector <=> query_embedding) as similarity
  FROM activities a
  WHERE 
    a.description_vector IS NOT NULL
    AND (target_user_id IS NULL OR a.user_id = target_user_id)
    AND 1 - (a.description_vector <=> query_embedding) > similarity_threshold
  ORDER BY a.description_vector <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION search_similar_companies(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  target_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  industry text,
  description text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    comp.id,
    comp.name,
    comp.industry,
    comp.description,
    1 - (comp.description_vector <=> query_embedding) as similarity
  FROM companies comp
  WHERE 
    comp.description_vector IS NOT NULL
    AND (target_user_id IS NULL OR comp.user_id = target_user_id)
    AND 1 - (comp.description_vector <=> query_embedding) > similarity_threshold
  ORDER BY comp.description_vector <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to add sample emails for new users
CREATE OR REPLACE FUNCTION add_sample_emails_for_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert sample emails only if user has no emails yet
  IF NOT EXISTS (SELECT 1 FROM email_tracking WHERE user_id = target_user_id) THEN
    INSERT INTO email_tracking (user_id, type, subject, body, sender_email, recipient_email, status, created_at) VALUES
    (target_user_id, 'received', 'Partnership Opportunity - TechCorp Integration', 'Hi there, I hope this email finds you well. I wanted to reach out regarding a potential partnership opportunity between our companies. We''ve been following your work in the CRM space and believe there could be significant synergies. Would you be available for a brief call next week to discuss this further? Best regards, Sarah', 'sarah.johnson@techcorp.com', 'user@example.com', 'delivered', NOW() - INTERVAL '2 hours'),
    (target_user_id, 'received', 'Follow-up: Enterprise Software Demo Request', 'Thank you for your interest in our enterprise software solution. As discussed, I''m attaching the demo materials and pricing information. Our solution has helped companies like yours increase productivity by 40% on average. I''d love to schedule a personalized demo to show you how this could work specifically for your use case. When would be a good time for you this week?', 'mike.chen@enterprise-solutions.com', 'user@example.com', 'delivered', NOW() - INTERVAL '4 hours'),
    (target_user_id, 'received', 'Quarterly Business Review - Q4 Planning', 'Hi Team, I hope everyone is doing well. As we approach the end of Q3, it''s time to start planning for our Q4 business review. I''d like to schedule a meeting to discuss our progress, challenges, and goals for the upcoming quarter. Please review the attached documents and come prepared with your department updates. Looking forward to a productive discussion.', 'director@company.com', 'user@example.com', 'delivered', NOW() - INTERVAL '6 hours'),
    (target_user_id, 'sent', 'Re: Project Timeline and Deliverables', 'Thank you for the detailed project timeline. I''ve reviewed the deliverables and they look comprehensive. I have a few questions about the implementation phase that I''d like to discuss. Could we schedule a call for tomorrow afternoon? I''m available between 2-4 PM EST. Looking forward to moving this project forward.', 'user@example.com', 'client@project.com', 'delivered', NOW() - INTERVAL '1 day');
  END IF;
END;
$$;

-- =====================================================
-- SAMPLE DATA FUNCTIONS
-- =====================================================

-- Function to create sample data for new users
CREATE OR REPLACE FUNCTION create_sample_data_for_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Add sample company
  INSERT INTO companies (user_id, name, industry, size, description, website, location)
  VALUES (target_user_id, 'TechCorp Solutions', 'Technology', 'medium', 'Leading provider of enterprise software solutions', 'https://techcorp.com', 'San Francisco, CA')
  ON CONFLICT DO NOTHING;

  -- Add sample contact
  INSERT INTO contacts (user_id, name, email, phone, company, title, status, score, persona)
  VALUES (target_user_id, 'John Smith', 'john.smith@techcorp.com', '+1 (555) 123-4567', 'TechCorp Solutions', 'CTO', 'Qualified', 85, 'Technical Decision Maker - Focuses on scalability and integration capabilities')
  ON CONFLICT DO NOTHING;

  -- Add sample deal
  INSERT INTO deals (user_id, title, company, contact_name, value, stage, probability, next_step)
  VALUES (target_user_id, 'Enterprise CRM Implementation', 'TechCorp Solutions', 'John Smith', 150000, 'Proposal', 75, 'Schedule technical demo with development team')
  ON CONFLICT DO NOTHING;

  -- Add sample emails
  PERFORM add_sample_emails_for_user(target_user_id);
END;
$$;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE companies IS 'Stores company information and profiles';
COMMENT ON TABLE contacts IS 'Stores contact information with AI-generated personas';
COMMENT ON TABLE leads IS 'Stores lead information before conversion to contacts';
COMMENT ON TABLE deals IS 'Stores sales opportunities and pipeline data';
COMMENT ON TABLE activities IS 'Stores all customer interactions and activities';
COMMENT ON TABLE email_tracking IS 'Stores email communications and tracking data';
COMMENT ON TABLE embedding_metadata IS 'Stores vector embeddings for CRM data with metadata for search and analytics';
COMMENT ON TABLE semantic_searches IS 'Tracks semantic search queries and results for analytics and caching';
COMMENT ON TABLE email_summaries IS 'Stores AI-generated email summaries and insights';
COMMENT ON TABLE transcripts IS 'Stores audio/video transcripts and AI analysis';

COMMENT ON FUNCTION search_similar_deals IS 'Performs vector similarity search on deals based on title embeddings';
COMMENT ON FUNCTION search_similar_contacts IS 'Performs vector similarity search on contacts based on persona embeddings';
COMMENT ON FUNCTION search_similar_activities IS 'Performs vector similarity search on activities based on description embeddings';
COMMENT ON FUNCTION search_similar_companies IS 'Performs vector similarity search on companies based on description embeddings';
COMMENT ON FUNCTION add_sample_emails_for_user IS 'Adds sample emails for new users to demonstrate email functionality';
COMMENT ON FUNCTION create_sample_data_for_user IS 'Creates sample data for new users including companies, contacts, deals, and emails';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Deal Whisperer CRM database schema migration completed successfully!';
  RAISE NOTICE 'Created tables: companies, contacts, leads, deals, activities, email_tracking, embedding_metadata, semantic_searches, email_summaries, transcripts';
  RAISE NOTICE 'Created indexes for performance optimization';
  RAISE NOTICE 'Enabled Row Level Security (RLS) with user-scoped policies';
  RAISE NOTICE 'Created vector similarity search functions for AI features';
  RAISE NOTICE 'Added sample data creation functions';
END $$; 