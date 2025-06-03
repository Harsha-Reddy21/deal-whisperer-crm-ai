-- Deal Whisperer CRM Database Schema Update

-- First, create a default contact if none exists (to use for updating NULL contact_id values)
DO $$
DECLARE
  default_contact_id uuid;
  default_contact_name text;
  contact_count integer;
BEGIN
  -- Check if we have any contacts
  SELECT COUNT(*) INTO contact_count FROM contacts;
  
  IF contact_count = 0 THEN
    -- Create a default contact
    BEGIN
      INSERT INTO contacts (
        id,
        user_id,
        name,
        email,
        phone,
        status,
        created_at,
        updated_at
      ) 
      SELECT 
        gen_random_uuid(),
        user_id,
        'Default Contact',
        'default@example.com',
        '555-0000',
        'Cold Lead',
        NOW(),
        NOW()
      FROM deals
      WHERE contact_id IS NULL
      LIMIT 1
      RETURNING id, name INTO default_contact_id, default_contact_name;
      
      RAISE NOTICE 'Created default contact: % (%)', default_contact_name, default_contact_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create default contact: %', SQLERRM;
    END;
  ELSE
    -- Get first existing contact
    SELECT id, name INTO default_contact_id, default_contact_name FROM contacts LIMIT 1;
    RAISE NOTICE 'Using existing contact: % (%)', default_contact_name, default_contact_id;
  END IF;

  -- Only proceed if we have a contact
  IF default_contact_id IS NOT NULL THEN
    -- Update deals with NULL contact_id
    BEGIN
      UPDATE deals 
      SET contact_id = default_contact_id,
          contact_name = default_contact_name
      WHERE contact_id IS NULL;
      
      RAISE NOTICE 'Updated deals with NULL contact_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error updating deals: %', SQLERRM;
    END;
    
    -- Update activities with NULL contact_id
    BEGIN
      UPDATE activities 
      SET contact_id = COALESCE(
        (SELECT contact_id FROM deals WHERE deals.id = activities.deal_id),
        default_contact_id
      )
      WHERE contact_id IS NULL;
      
      RAISE NOTICE 'Updated activities with NULL contact_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error updating activities: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'No default contact found, skipping updates';
  END IF;
END $$;

-- Make contact_id NOT NULL in the deals table
DO $$
BEGIN
  ALTER TABLE deals 
    ALTER COLUMN contact_id SET NOT NULL;
  
  RAISE NOTICE 'Updated deals table: contact_id is now NOT NULL';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating deals table: %', SQLERRM;
END $$;

-- Update the foreign key constraint for deals.contact_id
DO $$
BEGIN
  -- First drop the constraint if it exists
  ALTER TABLE deals 
    DROP CONSTRAINT IF EXISTS deals_contact_id_fkey;

  -- Then create it with CASCADE delete
  ALTER TABLE deals
    ADD CONSTRAINT deals_contact_id_fkey 
      FOREIGN KEY (contact_id) 
      REFERENCES contacts(id) 
      ON DELETE CASCADE;
  
  RAISE NOTICE 'Updated deals foreign key constraint with CASCADE delete';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating deals foreign key: %', SQLERRM;
END $$;

-- Make contact_id NOT NULL in the activities table
DO $$
BEGIN
  ALTER TABLE activities 
    ALTER COLUMN contact_id SET NOT NULL;
  
  RAISE NOTICE 'Updated activities table: contact_id is now NOT NULL';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating activities table: %', SQLERRM;
END $$;

-- Remove lead_id from activities table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'activities'
    AND column_name = 'lead_id'
  ) THEN
    ALTER TABLE activities DROP COLUMN lead_id;
    RAISE NOTICE 'Dropped lead_id column from activities table';
  ELSE
    RAISE NOTICE 'lead_id column does not exist in activities table, skipping';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error dropping lead_id column: %', SQLERRM;
END $$;

-- Create a trigger function to automatically add companies when they don't exist
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION add_company_if_not_exists()
  RETURNS TRIGGER AS $BODY$
  BEGIN
    -- Check if the company name exists and create it if it doesn't
    IF NEW.company IS NOT NULL AND LENGTH(TRIM(NEW.company)) > 0 THEN
      BEGIN
        INSERT INTO companies (
          id,
          user_id, 
          name, 
          status, 
          created_at, 
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          NEW.user_id, 
          NEW.company, 
          'active', 
          NOW(), 
          NOW()
        )
        -- Handle case where the company already exists
        ON CONFLICT DO NOTHING;
        
      EXCEPTION WHEN OTHERS THEN
        -- Log the error but continue with the deal creation
        RAISE NOTICE 'Could not create company: %', SQLERRM;
      END;
    END IF;
    
    RETURN NEW;
  END;
  $BODY$ LANGUAGE plpgsql;

  RAISE NOTICE 'Created/updated add_company_if_not_exists function';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating add_company_if_not_exists function: %', SQLERRM;
END $$;

-- Create trigger to add companies automatically when deals are created
DO $$
BEGIN
  DROP TRIGGER IF EXISTS add_company_on_deal_insert ON deals;
  
  CREATE TRIGGER add_company_on_deal_insert
    BEFORE INSERT ON deals
    FOR EACH ROW
    EXECUTE FUNCTION add_company_if_not_exists();
    
  RAISE NOTICE 'Created add_company_on_deal_insert trigger';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating add_company_on_deal_insert trigger: %', SQLERRM;
END $$;

-- Create the update_updated_at_column function if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $BODY$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $BODY$ language 'plpgsql';
    
    RAISE NOTICE 'Created update_updated_at_column function';
  ELSE
    RAISE NOTICE 'update_updated_at_column function already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating update_updated_at_column function: %', SQLERRM;
END $$;

-- Create triggers for updated_at timestamp
DO $$
BEGIN
  -- Create/update triggers for activities
  DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
  CREATE TRIGGER update_activities_updated_at 
    BEFORE UPDATE ON activities
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
  
  RAISE NOTICE 'Created update_activities_updated_at trigger';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating update_activities_updated_at trigger: %', SQLERRM;
END $$;

-- Create triggers for deals
DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_deals_updated_at ON deals;
  CREATE TRIGGER update_deals_updated_at 
    BEFORE UPDATE ON deals
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
    
  RAISE NOTICE 'Created update_deals_updated_at trigger';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating update_deals_updated_at trigger: %', SQLERRM;
END $$;

-- Recreate indexes for improved performance
DO $$
BEGIN
  DROP INDEX IF EXISTS idx_activities_contact_id;
  CREATE INDEX idx_activities_contact_id ON activities(contact_id);
  
  RAISE NOTICE 'Created idx_activities_contact_id index';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating idx_activities_contact_id index: %', SQLERRM;
END $$;

DO $$
BEGIN
  DROP INDEX IF EXISTS idx_deals_contact_id;
  CREATE INDEX idx_deals_contact_id ON deals(contact_id);
  
  RAISE NOTICE 'Created idx_deals_contact_id index';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating idx_deals_contact_id index: %', SQLERRM;
END $$;

-- Additional Schema Updates for Deal Whisperer CRM

-- 1. Fix the companies table status check constraint
DO $$
BEGIN
  -- First check if the constraint exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'companies_status_check'
  ) THEN
    -- Drop the existing constraint
    ALTER TABLE companies DROP CONSTRAINT companies_status_check;
    
    -- Add a new constraint that allows 'active' as a valid status
    ALTER TABLE companies ADD CONSTRAINT companies_status_check 
      CHECK (status IS NULL OR status IN ('active', 'inactive', 'prospect', 'customer', 'partner'));
    
    RAISE NOTICE 'Fixed companies_status_check constraint';
  ELSE
    -- If constraint doesn't exist, create it
    ALTER TABLE companies ADD CONSTRAINT companies_status_check 
      CHECK (status IS NULL OR status IN ('active', 'inactive', 'prospect', 'customer', 'partner'));
    
    RAISE NOTICE 'Created companies_status_check constraint';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating companies_status_check constraint: %', SQLERRM;
END $$;

-- 2. Update the activities table to properly handle lead_id
DO $$
BEGIN
  -- Add lead_id column back if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'lead_id'
  ) THEN
    ALTER TABLE activities ADD COLUMN lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
    
    -- Update constraint to make either contact_id or lead_id required, but not both
    ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_require_contact_or_lead;
    ALTER TABLE activities ADD CONSTRAINT activities_require_contact_or_lead 
      CHECK ((contact_id IS NOT NULL AND lead_id IS NULL) OR (contact_id IS NULL AND lead_id IS NOT NULL));
    
    -- Make contact_id nullable again
    ALTER TABLE activities ALTER COLUMN contact_id DROP NOT NULL;
    
    RAISE NOTICE 'Added lead_id column back to activities table';
  ELSE
    -- If column exists, just ensure the constraint is correct
    ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_require_contact_or_lead;
    ALTER TABLE activities ADD CONSTRAINT activities_require_contact_or_lead 
      CHECK ((contact_id IS NOT NULL AND lead_id IS NULL) OR (contact_id IS NULL AND lead_id IS NOT NULL));
    
    -- Make contact_id nullable again
    ALTER TABLE activities ALTER COLUMN contact_id DROP NOT NULL;
    
    RAISE NOTICE 'Updated activities table constraints for lead_id';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating activities table: %', SQLERRM;
END $$;

-- 3. Modify the deals table to handle probability differently based on status
DO $$
BEGIN
  -- Add deal_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deals' AND column_name = 'deal_status'
  ) THEN
    ALTER TABLE deals ADD COLUMN deal_status VARCHAR(20) DEFAULT 'in_progress' NOT NULL;
    
    -- Add constraint to ensure valid status values
    ALTER TABLE deals ADD CONSTRAINT deals_status_check 
      CHECK (deal_status IN ('in_progress', 'won', 'lost'));
    
    RAISE NOTICE 'Added deal_status column to deals table';
  ELSE
    -- Ensure constraint exists
    ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_status_check;
    ALTER TABLE deals ADD CONSTRAINT deals_status_check 
      CHECK (deal_status IN ('in_progress', 'won', 'lost'));
    
    RAISE NOTICE 'Updated deals_status_check constraint';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating deals table: %', SQLERRM;
END $$;

-- 4. Create functions to count related leads and contacts for companies
DO $$
BEGIN
  -- Create a function to count related leads for a company
  CREATE OR REPLACE FUNCTION get_company_leads_count(company_id UUID) 
  RETURNS INTEGER AS $FUNC$
  DECLARE
    lead_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO lead_count FROM leads WHERE company_id = $1;
    RETURN lead_count;
  END;
  $FUNC$ LANGUAGE plpgsql;
  
  -- Create a function to count related contacts for a company
  CREATE OR REPLACE FUNCTION get_company_contacts_count(company_id UUID) 
  RETURNS INTEGER AS $FUNC$
  DECLARE
    contact_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO contact_count FROM contacts WHERE company_id = $1;
    RETURN contact_count;
  END;
  $FUNC$ LANGUAGE plpgsql;
  
  RAISE NOTICE 'Created company relationship counting functions';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating company relationship counting functions: %', SQLERRM;
END $$;

-- Final completion notice
DO $$
BEGIN
  RAISE NOTICE 'Schema update completed successfully!';
  RAISE NOTICE 'Additional schema updates completed successfully!';
END $$;

-- 5. Add company_id FK to deals table and create a function to update it based on company name
DO $$
BEGIN
  -- First check if company_id column exists in deals table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deals' AND column_name = 'company_id'
  ) THEN
    -- Add company_id column with FK constraint
    ALTER TABLE deals ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added company_id column to deals table';
    
    -- Update existing deals to link with companies by name
    UPDATE deals d
    SET company_id = c.id
    FROM companies c
    WHERE d.company = c.name AND d.user_id = c.user_id AND d.company_id IS NULL;
    
    RAISE NOTICE 'Updated existing deals with company_id where possible';
    
    -- Create index for improved performance
    CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);
    RAISE NOTICE 'Created index on deals.company_id';
  ELSE
    RAISE NOTICE 'company_id column already exists in deals table';
  END IF;
  
  -- Create or replace trigger function to keep company_id in sync with company name
  CREATE OR REPLACE FUNCTION sync_deal_company_id()
  RETURNS TRIGGER AS $FUNC$
  BEGIN
    -- When company name changes, try to find matching company_id
    IF NEW.company IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.company IS NULL OR NEW.company <> OLD.company) THEN
      NEW.company_id := (
        SELECT id FROM companies 
        WHERE name = NEW.company AND user_id = NEW.user_id
        LIMIT 1
      );
    END IF;
    
    RETURN NEW;
  END;
  $FUNC$ LANGUAGE plpgsql;
  
  -- Create trigger for the function
  DROP TRIGGER IF EXISTS sync_deal_company_id_trigger ON deals;
  CREATE TRIGGER sync_deal_company_id_trigger
    BEFORE INSERT OR UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION sync_deal_company_id();
  
  RAISE NOTICE 'Created sync_deal_company_id trigger function and trigger';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating deals-companies relationship: %', SQLERRM;
END $$;

-- 6. Add similar triggers for contacts and leads to keep company_id in sync
DO $$
BEGIN
  -- First check if company_id column exists in contacts table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contacts' AND column_name = 'company_id'
  ) THEN
    -- Add company_id column with FK constraint
    ALTER TABLE contacts ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added company_id column to contacts table';
    
    -- Update existing contacts to link with companies by name
    UPDATE contacts c
    SET company_id = co.id
    FROM companies co
    WHERE c.company = co.name AND c.user_id = co.user_id AND c.company_id IS NULL;
    
    RAISE NOTICE 'Updated existing contacts with company_id where possible';
    
    -- Create index for improved performance
    CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
    RAISE NOTICE 'Created index on contacts.company_id';
  ELSE
    RAISE NOTICE 'company_id column already exists in contacts table';
  END IF;
  
  -- Create or replace trigger function to keep company_id in sync with company name for contacts
  CREATE OR REPLACE FUNCTION sync_contact_company_id()
  RETURNS TRIGGER AS $FUNC$
  BEGIN
    -- When company name changes, try to find matching company_id
    IF NEW.company IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.company IS NULL OR NEW.company <> OLD.company) THEN
      NEW.company_id := (
        SELECT id FROM companies 
        WHERE name = NEW.company AND user_id = NEW.user_id
        LIMIT 1
      );
    END IF;
    
    RETURN NEW;
  END;
  $FUNC$ LANGUAGE plpgsql;
  
  -- Create trigger for the function
  DROP TRIGGER IF EXISTS sync_contact_company_id_trigger ON contacts;
  CREATE TRIGGER sync_contact_company_id_trigger
    BEFORE INSERT OR UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION sync_contact_company_id();
  
  RAISE NOTICE 'Created sync_contact_company_id trigger function and trigger';
  
  -- Check if company_id column exists in leads table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'company_id'
  ) THEN
    -- Add company_id column with FK constraint
    ALTER TABLE leads ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added company_id column to leads table';
    
    -- Update existing leads to link with companies by name
    UPDATE leads l
    SET company_id = co.id
    FROM companies co
    WHERE l.company = co.name AND l.user_id = co.user_id AND l.company_id IS NULL;
    
    RAISE NOTICE 'Updated existing leads with company_id where possible';
    
    -- Create index for improved performance
    CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
    RAISE NOTICE 'Created index on leads.company_id';
  ELSE
    RAISE NOTICE 'company_id column already exists in leads table';
  END IF;
  
  -- Create or replace trigger function to keep company_id in sync with company name for leads
  CREATE OR REPLACE FUNCTION sync_lead_company_id()
  RETURNS TRIGGER AS $FUNC$
  BEGIN
    -- When company name changes, try to find matching company_id
    IF NEW.company IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.company IS NULL OR NEW.company <> OLD.company) THEN
      NEW.company_id := (
        SELECT id FROM companies 
        WHERE name = NEW.company AND user_id = NEW.user_id
        LIMIT 1
      );
    END IF;
    
    RETURN NEW;
  END;
  $FUNC$ LANGUAGE plpgsql;
  
  -- Create trigger for the function
  DROP TRIGGER IF EXISTS sync_lead_company_id_trigger ON leads;
  CREATE TRIGGER sync_lead_company_id_trigger
    BEFORE INSERT OR UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION sync_lead_company_id();
  
  RAISE NOTICE 'Created sync_lead_company_id trigger function and trigger';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating contacts/leads-companies relationship: %', SQLERRM;
END $$;

-- 7. Add lead_id to email_tracking table
DO $$
BEGIN
  -- Check if lead_id column exists in email_tracking table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_tracking' AND column_name = 'lead_id'
  ) THEN
    -- Add lead_id column with FK constraint
    ALTER TABLE email_tracking ADD COLUMN lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
    
    -- Create index for improved performance
    CREATE INDEX IF NOT EXISTS idx_email_tracking_lead_id ON email_tracking(lead_id);
    
    RAISE NOTICE 'Added lead_id column to email_tracking table';
  ELSE
    RAISE NOTICE 'lead_id column already exists in email_tracking table';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating email_tracking table: %', SQLERRM;
END $$; 