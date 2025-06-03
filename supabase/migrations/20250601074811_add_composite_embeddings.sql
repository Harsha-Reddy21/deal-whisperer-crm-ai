-- Add composite embedding columns to store rich context embeddings
-- These will contain embeddings of the full entity + related activities

-- Add composite embedding columns to existing tables
ALTER TABLE deals ADD COLUMN IF NOT EXISTS composite_embedding vector(1536);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS composite_embedding vector(1536);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS composite_embedding vector(1536);

-- Create indexes for composite embeddings
CREATE INDEX IF NOT EXISTS idx_deals_composite_embedding ON deals USING ivfflat (composite_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_contacts_composite_embedding ON contacts USING ivfflat (composite_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_leads_composite_embedding ON leads USING ivfflat (composite_embedding vector_cosine_ops) WITH (lists = 100);

-- Function to compose rich text blob for deals
CREATE OR REPLACE FUNCTION compose_deal_context(deal_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    deal_record deals%ROWTYPE;
    contact_record contacts%ROWTYPE;
    activities_text text := '';
    activity_record record;
    result_text text := '';
BEGIN
    -- Get the deal record
    SELECT * INTO deal_record FROM deals WHERE id = deal_id;
    
    IF NOT FOUND THEN
        RETURN '';
    END IF;
    
    -- Get the contact record
    SELECT * INTO contact_record FROM contacts WHERE id = deal_record.contact_id;
    
    -- Start building the context
    result_text := 'DEAL INFORMATION:' || E'\n';
    result_text := result_text || 'Title: ' || COALESCE(deal_record.title, 'No title') || E'\n';
    result_text := result_text || 'Company: ' || COALESCE(deal_record.company, 'No company') || E'\n';
    result_text := result_text || 'Value: $' || COALESCE(deal_record.value::text, '0') || E'\n';
    result_text := result_text || 'Stage: ' || COALESCE(deal_record.stage, 'Unknown') || E'\n';
    result_text := result_text || 'Priority: ' || COALESCE(deal_record.priority, 'Medium') || E'\n';
    result_text := result_text || 'Close Probability: ' || COALESCE(deal_record.close_probability::text, '0') || '%' || E'\n';
    result_text := result_text || 'Expected Close Date: ' || COALESCE(deal_record.expected_close_date::text, 'Not set') || E'\n';
    result_text := result_text || 'Next Step: ' || COALESCE(deal_record.next_step, 'No next step defined') || E'\n';
    result_text := result_text || 'Description: ' || COALESCE(deal_record.description, 'No description') || E'\n';
    result_text := result_text || 'Outcome: ' || COALESCE(deal_record.outcome, 'Pending') || E'\n';
    
    -- Add contact information
    IF contact_record.id IS NOT NULL THEN
        result_text := result_text || E'\n' || 'CONTACT INFORMATION:' || E'\n';
        result_text := result_text || 'Name: ' || COALESCE(contact_record.name, 'No name') || E'\n';
        result_text := result_text || 'Email: ' || COALESCE(contact_record.email, 'No email') || E'\n';
        result_text := result_text || 'Phone: ' || COALESCE(contact_record.phone, 'No phone') || E'\n';
        result_text := result_text || 'Title: ' || COALESCE(contact_record.title, 'No title') || E'\n';
        result_text := result_text || 'Status: ' || COALESCE(contact_record.status, 'Unknown') || E'\n';
        result_text := result_text || 'Persona: ' || COALESCE(contact_record.persona, 'No persona defined') || E'\n';
        result_text := result_text || 'Notes: ' || COALESCE(contact_record.notes, 'No notes') || E'\n';
    END IF;
    
    -- Get related activities
    FOR activity_record IN 
        SELECT type, description, notes, created_at, outcome
        FROM activities 
        WHERE deal_id = deal_record.id 
        ORDER BY created_at DESC
        LIMIT 20
    LOOP
        IF activities_text = '' THEN
            activities_text := E'\n' || 'RELATED ACTIVITIES:' || E'\n';
        END IF;
        
        activities_text := activities_text || '- [' || activity_record.created_at::date || '] ';
        activities_text := activities_text || COALESCE(activity_record.type, 'Activity') || ': ';
        activities_text := activities_text || COALESCE(activity_record.description, 'No description');
        
        IF activity_record.notes IS NOT NULL AND activity_record.notes != '' THEN
            activities_text := activities_text || ' | Notes: ' || activity_record.notes;
        END IF;
        
        IF activity_record.outcome IS NOT NULL AND activity_record.outcome != '' THEN
            activities_text := activities_text || ' | Outcome: ' || activity_record.outcome;
        END IF;
        
        activities_text := activities_text || E'\n';
    END LOOP;
    
    result_text := result_text || activities_text;
    
    RETURN result_text;
END;
$$;

-- Function to compose rich text blob for contacts
CREATE OR REPLACE FUNCTION compose_contact_context(contact_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    contact_record contacts%ROWTYPE;
    activities_text text := '';
    deals_text text := '';
    activity_record record;
    deal_record record;
    result_text text := '';
BEGIN
    -- Get the contact record
    SELECT * INTO contact_record FROM contacts WHERE id = contact_id;
    
    IF NOT FOUND THEN
        RETURN '';
    END IF;
    
    -- Start building the context
    result_text := 'CONTACT INFORMATION:' || E'\n';
    result_text := result_text || 'Name: ' || COALESCE(contact_record.name, 'No name') || E'\n';
    result_text := result_text || 'Company: ' || COALESCE(contact_record.company, 'No company') || E'\n';
    result_text := result_text || 'Email: ' || COALESCE(contact_record.email, 'No email') || E'\n';
    result_text := result_text || 'Phone: ' || COALESCE(contact_record.phone, 'No phone') || E'\n';
    result_text := result_text || 'Title: ' || COALESCE(contact_record.title, 'No title') || E'\n';
    result_text := result_text || 'Status: ' || COALESCE(contact_record.status, 'Unknown') || E'\n';
    result_text := result_text || 'Persona: ' || COALESCE(contact_record.persona, 'No persona defined') || E'\n';
    result_text := result_text || 'Notes: ' || COALESCE(contact_record.notes, 'No notes') || E'\n';
    
    -- Get related deals
    FOR deal_record IN 
        SELECT title, company, stage, value, priority, expected_close_date
        FROM deals 
        WHERE contact_id = contact_record.id 
        ORDER BY created_at DESC
        LIMIT 10
    LOOP
        IF deals_text = '' THEN
            deals_text := E'\n' || 'RELATED DEALS:' || E'\n';
        END IF;
        
        deals_text := deals_text || '- ' || COALESCE(deal_record.title, 'Untitled Deal');
        deals_text := deals_text || ' (' || COALESCE(deal_record.company, 'No company') || ')';
        deals_text := deals_text || ' - Stage: ' || COALESCE(deal_record.stage, 'Unknown');
        deals_text := deals_text || ' - Value: $' || COALESCE(deal_record.value::text, '0');
        deals_text := deals_text || ' - Priority: ' || COALESCE(deal_record.priority, 'Medium');
        
        IF deal_record.expected_close_date IS NOT NULL THEN
            deals_text := deals_text || ' - Expected Close: ' || deal_record.expected_close_date::text;
        END IF;
        
        deals_text := deals_text || E'\n';
    END LOOP;
    
    -- Get related activities
    FOR activity_record IN 
        SELECT type, description, notes, created_at, outcome
        FROM activities 
        WHERE contact_id = contact_record.id 
        ORDER BY created_at DESC
        LIMIT 15
    LOOP
        IF activities_text = '' THEN
            activities_text := E'\n' || 'RELATED ACTIVITIES:' || E'\n';
        END IF;
        
        activities_text := activities_text || '- [' || activity_record.created_at::date || '] ';
        activities_text := activities_text || COALESCE(activity_record.type, 'Activity') || ': ';
        activities_text := activities_text || COALESCE(activity_record.description, 'No description');
        
        IF activity_record.notes IS NOT NULL AND activity_record.notes != '' THEN
            activities_text := activities_text || ' | Notes: ' || activity_record.notes;
        END IF;
        
        IF activity_record.outcome IS NOT NULL AND activity_record.outcome != '' THEN
            activities_text := activities_text || ' | Outcome: ' || activity_record.outcome;
        END IF;
        
        activities_text := activities_text || E'\n';
    END LOOP;
    
    result_text := result_text || deals_text || activities_text;
    
    RETURN result_text;
END;
$$;

-- Function to compose rich text blob for leads
CREATE OR REPLACE FUNCTION compose_lead_context(lead_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    lead_record leads%ROWTYPE;
    activities_text text := '';
    activity_record record;
    result_text text := '';
BEGIN
    -- Get the lead record
    SELECT * INTO lead_record FROM leads WHERE id = lead_id;
    
    IF NOT FOUND THEN
        RETURN '';
    END IF;
    
    -- Start building the context
    result_text := 'LEAD INFORMATION:' || E'\n';
    result_text := result_text || 'Name: ' || COALESCE(lead_record.name, 'No name') || E'\n';
    result_text := result_text || 'Company: ' || COALESCE(lead_record.company, 'No company') || E'\n';
    result_text := result_text || 'Email: ' || COALESCE(lead_record.email, 'No email') || E'\n';
    result_text := result_text || 'Phone: ' || COALESCE(lead_record.phone, 'No phone') || E'\n';
    result_text := result_text || 'Title: ' || COALESCE(lead_record.title, 'No title') || E'\n';
    result_text := result_text || 'Status: ' || COALESCE(lead_record.status, 'Unknown') || E'\n';
    result_text := result_text || 'Source: ' || COALESCE(lead_record.source, 'Unknown source') || E'\n';
    result_text := result_text || 'Score: ' || COALESCE(lead_record.score::text, '0') || E'\n';
    result_text := result_text || 'Notes: ' || COALESCE(lead_record.notes, 'No notes') || E'\n';
    
    -- Get related activities
    FOR activity_record IN 
        SELECT type, description, notes, created_at, outcome
        FROM activities 
        WHERE contact_id IN (
            SELECT id FROM contacts WHERE email = lead_record.email OR phone = lead_record.phone
        )
        ORDER BY created_at DESC
        LIMIT 15
    LOOP
        IF activities_text = '' THEN
            activities_text := E'\n' || 'RELATED ACTIVITIES:' || E'\n';
        END IF;
        
        activities_text := activities_text || '- [' || activity_record.created_at::date || '] ';
        activities_text := activities_text || COALESCE(activity_record.type, 'Activity') || ': ';
        activities_text := activities_text || COALESCE(activity_record.description, 'No description');
        
        IF activity_record.notes IS NOT NULL AND activity_record.notes != '' THEN
            activities_text := activities_text || ' | Notes: ' || activity_record.notes;
        END IF;
        
        IF activity_record.outcome IS NOT NULL AND activity_record.outcome != '' THEN
            activities_text := activities_text || ' | Outcome: ' || activity_record.outcome;
        END IF;
        
        activities_text := activities_text || E'\n';
    END LOOP;
    
    result_text := result_text || activities_text;
    
    RETURN result_text;
END;
$$;

-- Enhanced search functions that use composite embeddings
CREATE OR REPLACE FUNCTION search_deals_composite(
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
  similarity float,
  context_preview text
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
    1 - (d.composite_embedding <=> query_embedding) as similarity,
    LEFT(compose_deal_context(d.id), 200) || '...' as context_preview
  FROM deals d
  WHERE 
    d.composite_embedding IS NOT NULL
    AND (target_user_id IS NULL OR d.user_id = target_user_id)
    AND 1 - (d.composite_embedding <=> query_embedding) > similarity_threshold
  ORDER BY d.composite_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION search_contacts_composite(
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
  email text,
  similarity float,
  context_preview text
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
    c.email,
    1 - (c.composite_embedding <=> query_embedding) as similarity,
    LEFT(compose_contact_context(c.id), 200) || '...' as context_preview
  FROM contacts c
  WHERE 
    c.composite_embedding IS NOT NULL
    AND (target_user_id IS NULL OR c.user_id = target_user_id)
    AND 1 - (c.composite_embedding <=> query_embedding) > similarity_threshold
  ORDER BY c.composite_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION search_leads_composite(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  target_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  company text,
  email text,
  status text,
  similarity float,
  context_preview text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.company,
    l.email,
    l.status,
    1 - (l.composite_embedding <=> query_embedding) as similarity,
    LEFT(compose_lead_context(l.id), 200) || '...' as context_preview
  FROM leads l
  WHERE 
    l.composite_embedding IS NOT NULL
    AND (target_user_id IS NULL OR l.user_id = target_user_id)
    AND 1 - (l.composite_embedding <=> query_embedding) > similarity_threshold
  ORDER BY l.composite_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add comments for documentation
COMMENT ON COLUMN deals.composite_embedding IS 'Vector embedding of deal + contact info + related activities for comprehensive semantic search';
COMMENT ON COLUMN contacts.composite_embedding IS 'Vector embedding of contact + related deals + activities for comprehensive semantic search';
COMMENT ON COLUMN leads.composite_embedding IS 'Vector embedding of lead + related activities for comprehensive semantic search';

COMMENT ON FUNCTION compose_deal_context IS 'Composes rich text blob including deal info, contact details, and related activities';
COMMENT ON FUNCTION compose_contact_context IS 'Composes rich text blob including contact info, related deals, and activities';
COMMENT ON FUNCTION compose_lead_context IS 'Composes rich text blob including lead info and related activities'; 