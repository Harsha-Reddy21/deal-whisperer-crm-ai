-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Make sure deals table has the embedding column
ALTER TABLE IF EXISTS deals 
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- Make sure contacts table has the embedding column
ALTER TABLE IF EXISTS contacts 
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS persona_vector vector(1536),
ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- Make sure leads table has the embedding column
ALTER TABLE IF EXISTS leads 
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- Creates a function to search for similar deals using vector similarity
-- Note: We use a very low default threshold (0.01) to ensure results are always returned
-- even for queries that don't have strong semantic matches
CREATE OR REPLACE FUNCTION search_similar_deals(
  query_embedding vector(1536),
  target_user_id uuid,
  similarity_threshold float DEFAULT 0.01,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  title text,
  company text,
  stage text,
  value float,
  probability float,
  contact_name text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Using a low threshold to prioritize returning results over strict similarity
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.company,
    d.stage,
    CAST(d.value AS float), -- Explicitly cast to float to prevent type mismatch
    CAST(d.probability AS float), -- Also cast probability to prevent potential type mismatch
    d.contact_name,
    1 - (d.embedding <=> query_embedding) as similarity
  FROM
    deals d
  WHERE
    d.user_id = target_user_id
    AND d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > similarity_threshold
  ORDER BY
    d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Creates a function to search for similar contacts using vector similarity
-- Using a low threshold to ensure results are returned for all queries
CREATE OR REPLACE FUNCTION search_similar_contacts(
  query_embedding vector(1536),
  target_user_id uuid,
  similarity_threshold float DEFAULT 0.01,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  title text,
  company text,
  email text,
  phone text,
  status text,
  score float,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.title,
    c.company,
    c.email,
    c.phone,
    c.status,
    CAST(c.score AS float), -- Explicitly cast to float to prevent type mismatch
    1 - (c.embedding <=> query_embedding) as similarity
  FROM
    contacts c
  WHERE
    c.user_id = target_user_id
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > similarity_threshold
  ORDER BY
    c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Creates a function to search for similar leads using vector similarity
-- Using a low threshold to ensure results are returned for all queries
CREATE OR REPLACE FUNCTION search_similar_leads(
  query_embedding vector(1536),
  target_user_id uuid,
  similarity_threshold float DEFAULT 0.01,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  company text,
  email text,
  phone text,
  source text,
  status text,
  score float,
  similarity float
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
    l.phone,
    l.source,
    l.status,
    CAST(l.score AS float), -- Explicitly cast to float to prevent type mismatch
    1 - (l.embedding <=> query_embedding) as similarity
  FROM
    leads l
  WHERE
    l.user_id = target_user_id
    AND l.embedding IS NOT NULL
    AND 1 - (l.embedding <=> query_embedding) > similarity_threshold
  ORDER BY
    l.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create an index on the vector columns for faster similarity search
CREATE INDEX IF NOT EXISTS deals_embedding_idx ON deals USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS contacts_embedding_idx ON contacts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS leads_embedding_idx ON leads USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create tracking table for semantic searches
CREATE TABLE IF NOT EXISTS semantic_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text text NOT NULL,
  query_vector vector(1536),
  search_type text NOT NULL,
  similarity_threshold float,
  created_at timestamptz DEFAULT now(),
  result_count int
); 