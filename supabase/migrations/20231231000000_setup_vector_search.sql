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

-- Drop existing functions to prevent errors
DROP FUNCTION IF EXISTS search_similar_deals(vector, float, int, uuid);
DROP FUNCTION IF EXISTS search_similar_contacts(vector, float, int, uuid);
DROP FUNCTION IF EXISTS search_similar_leads(vector, float, int, uuid);

-- Creates a function to search for similar deals using vector similarity
CREATE OR REPLACE FUNCTION search_similar_deals(
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int,
  target_user_id uuid
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
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.company,
    d.stage,
    d.value,
    d.probability,
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
CREATE OR REPLACE FUNCTION search_similar_contacts(
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int,
  target_user_id uuid
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
    c.score,
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
CREATE OR REPLACE FUNCTION search_similar_leads(
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int,
  target_user_id uuid
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
    l.score,
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