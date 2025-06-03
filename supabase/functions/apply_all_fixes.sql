-- Comprehensive fix script for all semantic search functions
-- This script fixes:
-- 1. Type mismatch with score field (casting to float)
-- 2. Parameter ordering to comply with PostgreSQL requirements

-- Log start of fixes
DO $$
BEGIN
  RAISE NOTICE '------------ STARTING SEMANTIC SEARCH FUNCTION FIXES ------------';
END $$;

---------------------------------------------------------------
-- FIX 1: SEARCH_SIMILAR_CONTACTS FUNCTION
---------------------------------------------------------------

-- Drop the existing function
DROP FUNCTION IF EXISTS search_similar_contacts;

-- Recreate the function with proper type casting and parameter ordering
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

COMMENT ON FUNCTION search_similar_contacts IS 'Performs vector similarity search on contacts. Fixed type mismatch with score field by casting to float and reordered parameters to comply with PostgreSQL requirements.';

-- Log completion of contact function fix
DO $$
BEGIN
  RAISE NOTICE 'Fixed search_similar_contacts function';
END $$;

---------------------------------------------------------------
-- FIX 2: SEARCH_SIMILAR_LEADS FUNCTION
---------------------------------------------------------------

-- Drop the existing function
DROP FUNCTION IF EXISTS search_similar_leads;

-- Recreate the function with proper type casting and parameter ordering
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

COMMENT ON FUNCTION search_similar_leads IS 'Performs vector similarity search on leads. Fixed type mismatch with score field by casting to float and reordered parameters to comply with PostgreSQL requirements.';

-- Log completion of lead function fix
DO $$
BEGIN
  RAISE NOTICE 'Fixed search_similar_leads function';
END $$;

---------------------------------------------------------------
-- FIX 3: SEARCH_SIMILAR_DEALS FUNCTION
---------------------------------------------------------------

-- Drop the existing function
DROP FUNCTION IF EXISTS search_similar_deals;

-- Recreate the function with proper parameter ordering
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

COMMENT ON FUNCTION search_similar_deals IS 'Performs vector similarity search on deals. Fixed parameter ordering to comply with PostgreSQL requirements.';

-- Log completion of deal function fix
DO $$
BEGIN
  RAISE NOTICE 'Fixed search_similar_deals function';
END $$;

-- Log completion of all fixes
DO $$
BEGIN
  RAISE NOTICE '------------ ALL SEMANTIC SEARCH FUNCTION FIXES COMPLETED ------------';
  RAISE NOTICE 'IMPORTANT: You also need to update your JavaScript/TypeScript code to match the new parameter order.';
  RAISE NOTICE 'See the README.md file for details on how to update your code.';
END $$; 