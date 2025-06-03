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