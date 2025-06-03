-- Modify search functions to include embedding_content in the results
-- This script updates all three search functions to return the embedding_content field
-- for use in providing more context to the LLM

-- 1. First, modify search_similar_deals to return embedding_content
DROP FUNCTION IF EXISTS search_similar_deals;

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
  embedding_content text,
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
    CAST(d.value AS float),
    CAST(d.probability AS float),
    d.contact_name,
    d.embedding_content,
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

COMMENT ON FUNCTION search_similar_deals IS 'Performs vector similarity search on deals. Returns embedding_content for LLM context.';

-- 2. Next, modify search_similar_contacts to return embedding_content
DROP FUNCTION IF EXISTS search_similar_contacts;

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
  embedding_content text,
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
    CAST(c.score AS float),
    c.embedding_content,
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

COMMENT ON FUNCTION search_similar_contacts IS 'Performs vector similarity search on contacts. Returns embedding_content for LLM context.';

-- 3. Finally, modify search_similar_leads to return embedding_content
DROP FUNCTION IF EXISTS search_similar_leads;

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
  embedding_content text,
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
    CAST(l.score AS float),
    l.embedding_content,
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

COMMENT ON FUNCTION search_similar_leads IS 'Performs vector similarity search on leads. Returns embedding_content for LLM context.';

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE 'Updated search functions to include embedding_content in results for improved LLM context.';
END $$; 