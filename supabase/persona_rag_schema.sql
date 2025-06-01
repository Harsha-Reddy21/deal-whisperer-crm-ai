-- Customer Persona RAG Tables
-- These tables support the RAG-powered Customer Persona Builder

-- Table to store generated customer personas with behavioral analysis
CREATE TABLE IF NOT EXISTS customer_personas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    persona_name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    company_size VARCHAR(100),
    industry VARCHAR(255),
    communication_style VARCHAR(100),
    decision_making_style VARCHAR(100),
    pain_points JSONB DEFAULT '[]'::jsonb,
    preferred_channels JSONB DEFAULT '[]'::jsonb,
    buying_motivations JSONB DEFAULT '[]'::jsonb,
    objections_likely JSONB DEFAULT '[]'::jsonb,
    recommended_approach TEXT,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    behavioral_metrics JSONB,
    interaction_summary JSONB,
    similar_profiles JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contact_id, user_id)
);

-- Table to store behavioral patterns for pattern matching
CREATE TABLE IF NOT EXISTS behavioral_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pattern_name VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN ('communication', 'decision_making', 'engagement', 'buying_behavior')),
    pattern_description TEXT,
    pattern_indicators JSONB NOT NULL,
    success_metrics JSONB,
    associated_personas JSONB DEFAULT '[]'::jsonb,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store interaction embeddings for similarity search
CREATE TABLE IF NOT EXISTS interaction_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    embedding_type VARCHAR(50) NOT NULL CHECK (embedding_type IN ('behavioral', 'communication', 'engagement')),
    embedding_vector VECTOR(1536), -- OpenAI embedding dimension
    metadata JSONB,
    interaction_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track persona generation history and improvements
CREATE TABLE IF NOT EXISTS persona_generation_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    persona_id UUID REFERENCES customer_personas(id) ON DELETE CASCADE,
    generation_method VARCHAR(50) NOT NULL CHECK (generation_method IN ('basic', 'rag_enhanced')),
    input_data_quality INTEGER CHECK (input_data_quality >= 0 AND input_data_quality <= 100),
    interaction_count INTEGER DEFAULT 0,
    data_sources JSONB,
    generation_time_ms INTEGER,
    accuracy_feedback INTEGER CHECK (accuracy_feedback >= 1 AND accuracy_feedback <= 5),
    feedback_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store industry benchmarks and patterns
CREATE TABLE IF NOT EXISTS industry_benchmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    industry VARCHAR(255) NOT NULL,
    company_size_category VARCHAR(100),
    benchmark_type VARCHAR(100) NOT NULL,
    benchmark_value DECIMAL(10,2),
    benchmark_unit VARCHAR(50),
    benchmark_data JSONB,
    data_source VARCHAR(255),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(industry, company_size_category, benchmark_type)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_personas_user_contact ON customer_personas(user_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_customer_personas_industry ON customer_personas(industry, company_size);
CREATE INDEX IF NOT EXISTS idx_behavioral_patterns_user_type ON behavioral_patterns(user_id, pattern_type);
CREATE INDEX IF NOT EXISTS idx_interaction_embeddings_user_type ON interaction_embeddings(user_id, embedding_type);
CREATE INDEX IF NOT EXISTS idx_persona_generation_history_contact ON persona_generation_history(contact_id, created_at);
CREATE INDEX IF NOT EXISTS idx_industry_benchmarks_industry ON industry_benchmarks(industry, company_size_category);

-- Vector similarity search index (requires pgvector extension)
-- CREATE INDEX IF NOT EXISTS idx_interaction_embeddings_vector ON interaction_embeddings USING ivfflat (embedding_vector vector_cosine_ops);

-- Row Level Security (RLS) policies
ALTER TABLE customer_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_generation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_benchmarks ENABLE ROW LEVEL SECURITY;

-- Policies for customer_personas
CREATE POLICY "Users can view their own customer personas" ON customer_personas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customer personas" ON customer_personas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customer personas" ON customer_personas
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customer personas" ON customer_personas
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for behavioral_patterns
CREATE POLICY "Users can view their own behavioral patterns" ON behavioral_patterns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own behavioral patterns" ON behavioral_patterns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own behavioral patterns" ON behavioral_patterns
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own behavioral patterns" ON behavioral_patterns
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for interaction_embeddings
CREATE POLICY "Users can view their own interaction embeddings" ON interaction_embeddings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interaction embeddings" ON interaction_embeddings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interaction embeddings" ON interaction_embeddings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interaction embeddings" ON interaction_embeddings
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for persona_generation_history
CREATE POLICY "Users can view their own persona generation history" ON persona_generation_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own persona generation history" ON persona_generation_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own persona generation history" ON persona_generation_history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own persona generation history" ON persona_generation_history
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for industry_benchmarks (read-only for users)
CREATE POLICY "Users can view industry benchmarks" ON industry_benchmarks
    FOR SELECT USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_customer_personas_updated_at BEFORE UPDATE ON customer_personas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_behavioral_patterns_updated_at BEFORE UPDATE ON behavioral_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interaction_embeddings_updated_at BEFORE UPDATE ON interaction_embeddings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample industry benchmarks
INSERT INTO industry_benchmarks (industry, company_size_category, benchmark_type, benchmark_value, benchmark_unit, benchmark_data) VALUES
('Technology', 'Small (1-50)', 'email_engagement_rate', 28.5, 'percentage', '{"source": "industry_average", "sample_size": 1000}'),
('Technology', 'Medium (51-200)', 'email_engagement_rate', 32.1, 'percentage', '{"source": "industry_average", "sample_size": 800}'),
('Technology', 'Large (200+)', 'email_engagement_rate', 35.7, 'percentage', '{"source": "industry_average", "sample_size": 500}'),
('Healthcare', 'Small (1-50)', 'email_engagement_rate', 25.2, 'percentage', '{"source": "industry_average", "sample_size": 600}'),
('Healthcare', 'Medium (51-200)', 'email_engagement_rate', 29.8, 'percentage', '{"source": "industry_average", "sample_size": 400}'),
('Healthcare', 'Large (200+)', 'email_engagement_rate', 33.4, 'percentage', '{"source": "industry_average", "sample_size": 300}'),
('Finance', 'Small (1-50)', 'email_engagement_rate', 22.1, 'percentage', '{"source": "industry_average", "sample_size": 700}'),
('Finance', 'Medium (51-200)', 'email_engagement_rate', 26.7, 'percentage', '{"source": "industry_average", "sample_size": 500}'),
('Finance', 'Large (200+)', 'email_engagement_rate', 30.2, 'percentage', '{"source": "industry_average", "sample_size": 400}'),
('Technology', 'Small (1-50)', 'average_deal_cycle', 45, 'days', '{"source": "industry_average", "sample_size": 1000}'),
('Technology', 'Medium (51-200)', 'average_deal_cycle', 65, 'days', '{"source": "industry_average", "sample_size": 800}'),
('Technology', 'Large (200+)', 'average_deal_cycle', 120, 'days', '{"source": "industry_average", "sample_size": 500}'),
('Healthcare', 'Small (1-50)', 'average_deal_cycle', 60, 'days', '{"source": "industry_average", "sample_size": 600}'),
('Healthcare', 'Medium (51-200)', 'average_deal_cycle', 90, 'days', '{"source": "industry_average", "sample_size": 400}'),
('Healthcare', 'Large (200+)', 'average_deal_cycle', 150, 'days', '{"source": "industry_average", "sample_size": 300}'),
('Finance', 'Small (1-50)', 'average_deal_cycle', 75, 'days', '{"source": "industry_average", "sample_size": 700}'),
('Finance', 'Medium (51-200)', 'average_deal_cycle', 105, 'days', '{"source": "industry_average", "sample_size": 500}'),
('Finance', 'Large (200+)', 'average_deal_cycle', 180, 'days', '{"source": "industry_average", "sample_size": 400}')
ON CONFLICT (industry, company_size_category, benchmark_type) DO NOTHING; 