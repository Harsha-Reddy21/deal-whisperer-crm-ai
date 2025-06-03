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