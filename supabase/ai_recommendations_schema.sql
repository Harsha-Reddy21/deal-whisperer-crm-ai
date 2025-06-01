-- AI Recommendations Tracking Tables
-- These tables track AI recommendations, their application, and outcomes

-- Table to store AI recommendations
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(20) NOT NULL CHECK (recommendation_type IN ('high', 'medium', 'low')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    category VARCHAR(20) NOT NULL CHECK (category IN ('timing', 'engagement', 'process', 'risk', 'opportunity')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    action TEXT NOT NULL,
    impact VARCHAR(100),
    reasoning TEXT,
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    applied BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMP WITH TIME ZONE,
    feedback VARCHAR(20) CHECK (feedback IN ('helpful', 'not_helpful')),
    feedback_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track recommendation actions and outcomes
CREATE TABLE IF NOT EXISTS ai_recommendation_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation_id UUID NOT NULL REFERENCES ai_recommendations(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    action_taken TEXT NOT NULL,
    outcome TEXT,
    impact_measured BOOLEAN DEFAULT FALSE,
    probability_before INTEGER,
    probability_after INTEGER,
    stage_before VARCHAR(50),
    stage_after VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store AI analysis context for deals
CREATE TABLE IF NOT EXISTS ai_deal_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deal_age_days INTEGER,
    last_activity_days INTEGER,
    activity_count INTEGER DEFAULT 0,
    email_count INTEGER DEFAULT 0,
    email_open_rate DECIMAL(5,2),
    email_click_rate DECIMAL(5,2),
    file_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high')),
    engagement_level VARCHAR(20) CHECK (engagement_level IN ('low', 'medium', 'high')),
    ai_readiness_score INTEGER CHECK (ai_readiness_score >= 0 AND ai_readiness_score <= 100),
    pattern_insights JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(deal_id, analysis_date::date)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_deal ON ai_recommendations(user_id, deal_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_applied ON ai_recommendations(applied, applied_at);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_actions_user ON ai_recommendation_actions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_deal_analysis_user_date ON ai_deal_analysis(user_id, analysis_date);

-- Row Level Security (RLS) policies
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_deal_analysis ENABLE ROW LEVEL SECURITY;

-- Policies for ai_recommendations
CREATE POLICY "Users can view their own AI recommendations" ON ai_recommendations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI recommendations" ON ai_recommendations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI recommendations" ON ai_recommendations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI recommendations" ON ai_recommendations
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for ai_recommendation_actions
CREATE POLICY "Users can view their own AI recommendation actions" ON ai_recommendation_actions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI recommendation actions" ON ai_recommendation_actions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI recommendation actions" ON ai_recommendation_actions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI recommendation actions" ON ai_recommendation_actions
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for ai_deal_analysis
CREATE POLICY "Users can view their own AI deal analysis" ON ai_deal_analysis
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI deal analysis" ON ai_deal_analysis
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI deal analysis" ON ai_deal_analysis
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI deal analysis" ON ai_deal_analysis
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_ai_recommendations_updated_at BEFORE UPDATE ON ai_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_recommendation_actions_updated_at BEFORE UPDATE ON ai_recommendation_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_deal_analysis_updated_at BEFORE UPDATE ON ai_deal_analysis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 