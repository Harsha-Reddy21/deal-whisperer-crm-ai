# Setup Guide: RAG-Powered Customer Persona Builder

## Prerequisites

1. **OpenAI API Key**: Required for AI persona generation
2. **Supabase Project**: Active Supabase project with database access
3. **Node.js Environment**: Existing React/TypeScript project setup

## Installation Steps

### 1. Environment Configuration

Add your OpenAI API key to the `.env` file:

```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Database Schema Setup

Execute the following SQL files in your Supabase dashboard (SQL Editor):

#### Step 1: Apply the RAG schema
```sql
-- Copy and paste the contents of supabase/persona_rag_schema.sql
-- This creates the new tables for persona storage and RAG functionality
```

#### Step 2: Verify table creation
```sql
-- Check that all tables were created successfully
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'customer_personas',
  'behavioral_patterns', 
  'interaction_embeddings',
  'persona_generation_history',
  'industry_benchmarks'
);
```

### 3. Dependencies Check

Ensure all required dependencies are installed:

```bash
npm install @tanstack/react-query
npm install @supabase/supabase-js
npm install openai
npm install lucide-react
```

### 4. Component Integration

The Customer Persona Builder is already integrated into the existing component structure. No additional imports needed.

## Verification Steps

### 1. Test Basic Functionality

1. Navigate to the Customer Persona Builder in your application
2. Select a contact from the dropdown
3. Try generating a basic persona (should work without interaction data)
4. Verify the persona is generated and displayed correctly

### 2. Test RAG Functionality

1. Ensure you have contacts with interaction history (activities, emails, deals)
2. Select a contact with rich interaction data
3. Choose "RAG Enhanced" generation method
4. Click "Analyze Interaction History"
5. Verify behavioral metrics are calculated and displayed
6. Generate a RAG-enhanced persona
7. Compare the quality difference between basic and RAG personas

### 3. Database Verification

Check that data is being stored correctly:

```sql
-- Check persona generation history
SELECT * FROM persona_generation_history ORDER BY created_at DESC LIMIT 5;

-- Check stored personas
SELECT * FROM customer_personas ORDER BY created_at DESC LIMIT 5;

-- Check industry benchmarks
SELECT * FROM industry_benchmarks LIMIT 10;
```

## Troubleshooting

### Common Issues

#### 1. OpenAI API Key Not Working
- **Error**: "OpenAI API key not found"
- **Solution**: Verify the key is correctly set in `.env` and restart the development server

#### 2. Database Connection Issues
- **Error**: Database queries failing
- **Solution**: Check Supabase connection and ensure RLS policies are properly configured

#### 3. No Interaction Data
- **Error**: "Failed to gather interaction history"
- **Solution**: Ensure contacts have associated activities, emails, or deals in the database

#### 4. Low Data Quality Scores
- **Issue**: Generated personas seem generic
- **Solution**: Add more interaction data (activities, emails, deals) for the contact

### Performance Optimization

#### 1. Database Indexes
Ensure the following indexes exist for optimal performance:

```sql
-- Check existing indexes
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE tablename IN ('customer_personas', 'behavioral_patterns', 'interaction_embeddings');
```

#### 2. Query Optimization
Monitor slow queries and optimize as needed:

```sql
-- Enable query logging to identify slow queries
-- Check with your Supabase dashboard for query performance metrics
```

## Feature Testing Checklist

- [ ] Environment variables configured
- [ ] Database schema applied successfully
- [ ] Basic persona generation works
- [ ] RAG persona generation works
- [ ] Interaction history analysis displays correctly
- [ ] Behavioral metrics calculated accurately
- [ ] Data quality scores computed
- [ ] Personas stored in database
- [ ] Generation history tracked
- [ ] Error handling works for edge cases
- [ ] UI components render correctly
- [ ] Tabs switch between persona and insights
- [ ] Progress bars and metrics display properly

## Next Steps

### 1. Data Population
- Import existing customer data
- Set up activity tracking
- Configure email tracking
- Add deal progression data

### 2. Team Training
- Train sales team on persona interpretation
- Establish persona update workflows
- Create feedback collection process

### 3. Monitoring & Analytics
- Set up persona accuracy tracking
- Monitor generation success rates
- Track feature adoption metrics
- Analyze correlation with deal outcomes

## Support

For issues or questions:

1. **Technical Issues**: Check the browser console for error messages
2. **Database Issues**: Verify Supabase connection and table structure
3. **AI Issues**: Confirm OpenAI API key and quota availability
4. **Performance Issues**: Check network requests and database query performance

## Advanced Configuration

### Vector Embeddings (Future Enhancement)
To enable vector similarity search, install the pgvector extension in Supabase:

```sql
-- Enable pgvector extension (requires Supabase Pro plan)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector index for similarity search
CREATE INDEX idx_interaction_embeddings_vector 
ON interaction_embeddings 
USING ivfflat (embedding_vector vector_cosine_ops);
```

### Custom Industry Benchmarks
Add your own industry benchmarks:

```sql
INSERT INTO industry_benchmarks (
  industry, 
  company_size_category, 
  benchmark_type, 
  benchmark_value, 
  benchmark_unit,
  benchmark_data
) VALUES (
  'Your Industry',
  'Small (1-50)',
  'email_engagement_rate',
  25.0,
  'percentage',
  '{"source": "custom", "sample_size": 100}'
);
```

---

The RAG-powered Customer Persona Builder is now ready for use! This advanced feature will provide unprecedented insights into customer behavior based on actual interaction data. 