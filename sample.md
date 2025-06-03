          ┌────────────────────┐
          │  User Question     │
          └────────┬───────────┘
                   │
        ┌──────────▼────────────┐
        │ Embed the Query       │  ← OpenAI `text-embedding-3-small`
        └──────────┬────────────┘
                   │
       ┌───────────▼────────────┐
       │ Vector DB Search       │ ← pgvector / Pinecone / Supabase vector search
       └───────────┬────────────┘
                   │
   ┌───────────────▼────────────────┐
   │ Optional SQL Filter & Ranking  │ ← Filter by type, date, owner, etc.
   └───────────────┬────────────────┘
                   │
     ┌─────────────▼─────────────┐
     │ Top-K Matching Records    │
     └─────────────┬─────────────┘
                   │
     ┌─────────────▼─────────────┐
     │ Feed into GPT-4o          │ ← Use OpenAI or Local LLM
     │ (prompt + context chunks) │
     └─────────────┬─────────────┘
                   │
            ┌──────▼───────┐
            │ GPT Answer   │
            └──────────────┘
