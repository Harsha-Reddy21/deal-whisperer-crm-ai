-- Create the pgvector extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding vector column to leads table
DO $$
BEGIN
  -- Check if pgvector extension is available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    RAISE NOTICE 'pgvector extension is available';
  ELSE
    RAISE EXCEPTION 'pgvector extension is not available. Please install it first.';
  END IF;

  -- Check if the column exists before adding it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'combined_content_vector'
  ) THEN
    -- Add the vector column
    ALTER TABLE leads ADD COLUMN combined_content_vector vector(1536);
    
    RAISE NOTICE 'Added combined_content_vector column to leads table';
  ELSE
    RAISE NOTICE 'combined_content_vector column already exists in leads table';
  END IF;
  
  -- Create index for vector similarity search
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_leads_combined_content_vector'
  ) THEN
    CREATE INDEX idx_leads_combined_content_vector ON leads 
      USING ivfflat (combined_content_vector vector_cosine_ops)
      WITH (lists = 100);
      
    RAISE NOTICE 'Created index on leads.combined_content_vector';
  ELSE
    RAISE NOTICE 'Index on leads.combined_content_vector already exists';
  END IF;
END $$;

-- Add embedding update function for leads
CREATE OR REPLACE FUNCTION update_lead_embeddings_after_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification to update lead embeddings when an activity is created/updated
  PERFORM pg_notify(
    'lead_embedding_update', 
    json_build_object(
      'lead_id', NEW.lead_id, 
      'user_id', NEW.user_id, 
      'operation', TG_OP
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update lead embeddings when activities change
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_lead_embeddings_after_activity_trigger'
  ) THEN
    CREATE TRIGGER update_lead_embeddings_after_activity_trigger
      AFTER INSERT OR UPDATE ON activities
      FOR EACH ROW
      WHEN (NEW.lead_id IS NOT NULL)
      EXECUTE FUNCTION update_lead_embeddings_after_activity();
      
    RAISE NOTICE 'Created update_lead_embeddings_after_activity_trigger';
  ELSE
    RAISE NOTICE 'update_lead_embeddings_after_activity_trigger already exists';
  END IF;
END $$;

-- Create vector search function for leads
CREATE OR REPLACE FUNCTION search_similar_leads(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  target_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  company text,
  status text,
  score integer,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.email,
    l.company,
    l.status,
    l.score,
    1 - (l.combined_content_vector <=> query_embedding) as similarity
  FROM leads l
  WHERE 
    l.combined_content_vector IS NOT NULL
    AND (target_user_id IS NULL OR l.user_id = target_user_id)
    AND 1 - (l.combined_content_vector <=> query_embedding) > similarity_threshold
  ORDER BY l.combined_content_vector <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Update search types in semantic_searches table
DO $$
BEGIN
  -- Update the check constraint for search_type to include 'leads'
  ALTER TABLE semantic_searches 
    DROP CONSTRAINT IF EXISTS semantic_searches_search_type_check;
    
  ALTER TABLE semantic_searches 
    ADD CONSTRAINT semantic_searches_search_type_check 
    CHECK (search_type IN ('deals', 'contacts', 'activities', 'companies', 'leads', 'all'));
    
  RAISE NOTICE 'Updated semantic_searches_search_type_check to include leads';
END $$;

-- Print completion message
DO $$
BEGIN
  RAISE NOTICE 'Migration for lead embeddings completed';
  
  -- Verify vector column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'combined_content_vector'
  ) THEN
    RAISE NOTICE 'combined_content_vector column exists in leads table';
  ELSE
    RAISE EXCEPTION 'combined_content_vector column does not exist in leads table';
  END IF;
END $$; 