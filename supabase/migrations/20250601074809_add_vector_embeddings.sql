-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector columns to existing tables for AI-powered search and analysis
ALTER TABLE deals ADD COLUMN IF NOT EXISTS title_vector vector(1536);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS next_step_vector vector(1536);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS description_vector vector(1536);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS persona_vector vector(1536);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes_vector vector(1536);

ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_vector vector(1536);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS notes_vector vector(1536);

ALTER TABLE companies ADD COLUMN IF NOT EXISTS description_vector vector(1536);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notes_vector vector(1536);

-- Create a dedicated table for storing embeddings metadata and search analytics
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

-- Create a table for semantic search queries and results
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

-- Create indexes for vector similarity search
CREATE INDEX IF NOT EXISTS idx_deals_title_vector ON deals USING ivfflat (title_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_deals_next_step_vector ON deals USING ivfflat (next_step_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_deals_description_vector ON deals USING ivfflat (description_vector vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_contacts_persona_vector ON contacts USING ivfflat (persona_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_contacts_notes_vector ON contacts USING ivfflat (notes_vector vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_activities_description_vector ON activities USING ivfflat (description_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_activities_notes_vector ON activities USING ivfflat (notes_vector vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_companies_description_vector ON companies USING ivfflat (description_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_companies_notes_vector ON companies USING ivfflat (notes_vector vector_cosine_ops) WITH (lists = 100);

-- Indexes for embedding metadata
CREATE INDEX IF NOT EXISTS idx_embedding_metadata_user_id ON embedding_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_embedding_metadata_table_record ON embedding_metadata(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_embedding_metadata_vector ON embedding_metadata USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);

-- Indexes for semantic searches
CREATE INDEX IF NOT EXISTS idx_semantic_searches_user_id ON semantic_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_semantic_searches_type ON semantic_searches(search_type);
CREATE INDEX IF NOT EXISTS idx_semantic_searches_vector ON semantic_searches USING ivfflat (query_vector vector_cosine_ops) WITH (lists = 100);

-- Enable RLS for new tables
ALTER TABLE embedding_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_searches ENABLE ROW LEVEL SECURITY;

-- RLS policies for embedding_metadata
CREATE POLICY "Users can view their own embedding metadata" ON embedding_metadata
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own embedding metadata" ON embedding_metadata
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own embedding metadata" ON embedding_metadata
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own embedding metadata" ON embedding_metadata
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for semantic_searches
CREATE POLICY "Users can view their own semantic searches" ON semantic_searches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own semantic searches" ON semantic_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own semantic searches" ON semantic_searches
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own semantic searches" ON semantic_searches
  FOR DELETE USING (auth.uid() = user_id);

-- Create functions for vector similarity search
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

-- Create trigger function to update embedding metadata when records change
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

-- Add comments for documentation
COMMENT ON TABLE embedding_metadata IS 'Stores vector embeddings for CRM data with metadata for search and analytics';
COMMENT ON TABLE semantic_searches IS 'Tracks semantic search queries and results for analytics and caching';
COMMENT ON FUNCTION search_similar_deals IS 'Performs vector similarity search on deals based on title embeddings';
COMMENT ON FUNCTION search_similar_contacts IS 'Performs vector similarity search on contacts based on persona embeddings'; 