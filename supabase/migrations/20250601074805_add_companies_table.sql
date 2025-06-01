-- Create companies table
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  size TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  description TEXT,
  status TEXT DEFAULT 'prospect' CHECK (status IN ('prospect', 'customer', 'partner', 'inactive')),
  revenue BIGINT,
  employees INTEGER,
  founded_year INTEGER,
  logo_url TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  facebook_url TEXT,
  notes TEXT,
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  last_contact DATE,
  next_follow_up DATE,
  assigned_to UUID,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_industry ON companies(industry);
CREATE INDEX idx_companies_score ON companies(score);
CREATE INDEX idx_companies_assigned_to ON companies(assigned_to);

-- Enable RLS (Row Level Security)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own companies" ON companies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own companies" ON companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies" ON companies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies" ON companies
  FOR DELETE USING (auth.uid() = user_id);

-- Add company_id to existing tables for relationships
ALTER TABLE contacts ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Create indexes for the new foreign keys
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_leads_company_id ON leads(company_id);
CREATE INDEX idx_deals_company_id ON deals(company_id);
CREATE INDEX idx_activities_company_id ON activities(company_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 