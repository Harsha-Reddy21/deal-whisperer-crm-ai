-- Add embeddings support to CRM tables
-- Enable the vector extension for Supabase
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to main CRM tables
ALTER TABLE deals ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS embedding_content text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS embedding_updated_at timestamp with time zone;

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS embedding_content text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS embedding_updated_at timestamp with time zone;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS embedding_content text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS embedding_updated_at timestamp with time zone;

-- Create indexes for vector similarity search
CREATE INDEX IF NOT EXISTS deals_embedding_idx ON deals USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS contacts_embedding_idx ON contacts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS leads_embedding_idx ON leads USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create a table to track embedding jobs
CREATE TABLE IF NOT EXISTS embedding_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL, -- 'deal', 'contact', 'lead'
  record_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index for embedding jobs
CREATE INDEX IF NOT EXISTS embedding_jobs_status_idx ON embedding_jobs(status);
CREATE INDEX IF NOT EXISTS embedding_jobs_record_idx ON embedding_jobs(record_type, record_id);

-- Function to queue embedding jobs
CREATE OR REPLACE FUNCTION queue_embedding_job(p_record_type text, p_record_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO embedding_jobs (record_type, record_id, status)
  VALUES (p_record_type, p_record_id, 'pending')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to queue embedding jobs when records are modified
CREATE OR REPLACE FUNCTION trigger_embedding_update()
RETURNS trigger AS $$
BEGIN
  -- Queue embedding job for the modified record
  PERFORM queue_embedding_job(TG_ARGV[0], NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for deals
DROP TRIGGER IF EXISTS deals_embedding_trigger ON deals;
CREATE TRIGGER deals_embedding_trigger
  AFTER INSERT OR UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_embedding_update('deal');

-- Create triggers for contacts
DROP TRIGGER IF EXISTS contacts_embedding_trigger ON contacts;
CREATE TRIGGER contacts_embedding_trigger
  AFTER INSERT OR UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_embedding_update('contact');

-- Create triggers for leads
DROP TRIGGER IF EXISTS leads_embedding_trigger ON leads;
CREATE TRIGGER leads_embedding_trigger
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_embedding_update('lead');

-- Create triggers for activities (to update related records)
CREATE OR REPLACE FUNCTION trigger_activity_embedding_update()
RETURNS trigger AS $$
BEGIN
  -- Queue embedding job for related deal if exists
  IF NEW.deal_id IS NOT NULL THEN
    PERFORM queue_embedding_job('deal', NEW.deal_id);
  END IF;
  
  -- Queue embedding job for related contact
  IF NEW.contact_id IS NOT NULL THEN
    PERFORM queue_embedding_job('contact', NEW.contact_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS activities_embedding_trigger ON activities;
CREATE TRIGGER activities_embedding_trigger
  AFTER INSERT OR UPDATE OR DELETE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION trigger_activity_embedding_update();

-- Function to get deal content for embedding
CREATE OR REPLACE FUNCTION get_deal_embedding_content(deal_id uuid)
RETURNS text AS $$
DECLARE
  deal_record deals%ROWTYPE;
  activities_text text := '';
  result_text text;
BEGIN
  -- Get deal record
  SELECT * INTO deal_record FROM deals WHERE id = deal_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Get related activities
  SELECT string_agg(
    format('- [%s] %s: %s %s', 
      to_char(created_at, 'YYYY-MM-DD'), 
      type, 
      subject, 
      COALESCE(description, '')
    ), E'\n'
  ) INTO activities_text
  FROM activities 
  WHERE deal_id = deal_record.id
  ORDER BY created_at DESC;
  
  -- Compose full content
  result_text := format(
    'Deal: %s
Value: $%s
Stage: %s
Company: %s
Contact: %s
Probability: %s%%
Next Step: %s
Outcome: %s
Last Activity: %s

Activities:
%s',
    deal_record.title,
    COALESCE(deal_record.value::text, '0'),
    COALESCE(deal_record.stage, 'Unknown'),
    COALESCE(deal_record.company, 'Unknown'),
    COALESCE(deal_record.contact_name, 'Unknown'),
    COALESCE(deal_record.probability::text, '0'),
    COALESCE(deal_record.next_step, 'None'),
    COALESCE(deal_record.outcome, 'Pending'),
    COALESCE(to_char(deal_record.last_activity, 'YYYY-MM-DD'), 'Never'),
    COALESCE(activities_text, 'No activities recorded')
  );
  
  RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- Function to get contact content for embedding
CREATE OR REPLACE FUNCTION get_contact_embedding_content(contact_id uuid)
RETURNS text AS $$
DECLARE
  contact_record contacts%ROWTYPE;
  activities_text text := '';
  deals_text text := '';
  result_text text;
BEGIN
  -- Get contact record
  SELECT * INTO contact_record FROM contacts WHERE id = contact_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Get related activities
  SELECT string_agg(
    format('- [%s] %s: %s %s', 
      to_char(created_at, 'YYYY-MM-DD'), 
      type, 
      subject, 
      COALESCE(description, '')
    ), E'\n'
  ) INTO activities_text
  FROM activities 
  WHERE contact_id = contact_record.id
  ORDER BY created_at DESC;
  
  -- Get related deals
  SELECT string_agg(
    format('- %s ($%s) - %s', 
      title, 
      COALESCE(value::text, '0'), 
      COALESCE(stage, 'Unknown')
    ), E'\n'
  ) INTO deals_text
  FROM deals 
  WHERE contact_id = contact_record.id
  ORDER BY created_at DESC;
  
  -- Compose full content
  result_text := format(
    'Contact: %s
Email: %s
Phone: %s
Company: %s
Title: %s
Status: %s
Score: %s
Persona: %s
Last Contact: %s

Related Deals:
%s

Activities:
%s',
    contact_record.name,
    COALESCE(contact_record.email, 'Unknown'),
    COALESCE(contact_record.phone, 'Unknown'),
    COALESCE(contact_record.company, 'Unknown'),
    COALESCE(contact_record.title, 'Unknown'),
    COALESCE(contact_record.status, 'Unknown'),
    COALESCE(contact_record.score::text, '0'),
    COALESCE(contact_record.persona, 'Unknown'),
    COALESCE(to_char(contact_record.last_contact, 'YYYY-MM-DD'), 'Never'),
    COALESCE(deals_text, 'No deals'),
    COALESCE(activities_text, 'No activities recorded')
  );
  
  RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- Function to get lead content for embedding
CREATE OR REPLACE FUNCTION get_lead_embedding_content(lead_id uuid)
RETURNS text AS $$
DECLARE
  lead_record leads%ROWTYPE;
  activities_text text := '';
  result_text text;
BEGIN
  -- Get lead record
  SELECT * INTO lead_record FROM leads WHERE id = lead_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Get related activities (through company_id if available)
  SELECT string_agg(
    format('- [%s] %s: %s %s', 
      to_char(created_at, 'YYYY-MM-DD'), 
      type, 
      subject, 
      COALESCE(description, '')
    ), E'\n'
  ) INTO activities_text
  FROM activities 
  WHERE company_id = lead_record.company_id
  ORDER BY created_at DESC;
  
  -- Compose full content
  result_text := format(
    'Lead: %s
Email: %s
Phone: %s
Company: %s
Status: %s
Source: %s
Score: %s
Assigned To: %s

Activities:
%s',
    lead_record.name,
    COALESCE(lead_record.email, 'Unknown'),
    COALESCE(lead_record.phone, 'Unknown'),
    COALESCE(lead_record.company, 'Unknown'),
    COALESCE(lead_record.status, 'Unknown'),
    COALESCE(lead_record.source, 'Unknown'),
    COALESCE(lead_record.score::text, '0'),
    COALESCE(lead_record.assigned_to, 'Unassigned'),
    COALESCE(activities_text, 'No activities recorded')
  );
  
  RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- Function to search similar records using embeddings
CREATE OR REPLACE FUNCTION search_similar_records(
  query_embedding vector(1536),
  record_types text[] DEFAULT ARRAY['deal', 'contact', 'lead'],
  similarity_threshold float DEFAULT 0.7,
  max_results int DEFAULT 10
)
RETURNS TABLE(
  record_type text,
  record_id uuid,
  content text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  (
    SELECT 
      'deal'::text as record_type,
      d.id as record_id,
      d.embedding_content as content,
      1 - (d.embedding <=> query_embedding) as similarity
    FROM deals d
    WHERE d.embedding IS NOT NULL 
      AND 'deal' = ANY(record_types)
      AND 1 - (d.embedding <=> query_embedding) >= similarity_threshold
    
    UNION ALL
    
    SELECT 
      'contact'::text as record_type,
      c.id as record_id,
      c.embedding_content as content,
      1 - (c.embedding <=> query_embedding) as similarity
    FROM contacts c
    WHERE c.embedding IS NOT NULL 
      AND 'contact' = ANY(record_types)
      AND 1 - (c.embedding <=> query_embedding) >= similarity_threshold
    
    UNION ALL
    
    SELECT 
      'lead'::text as record_type,
      l.id as record_id,
      l.embedding_content as content,
      1 - (l.embedding <=> query_embedding) as similarity
    FROM leads l
    WHERE l.embedding IS NOT NULL 
      AND 'lead' = ANY(record_types)
      AND 1 - (l.embedding <=> query_embedding) >= similarity_threshold
  )
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql; 