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

-- Final completion notice
DO $$
BEGIN
  RAISE NOTICE 'Schema update completed successfully!';
END $$; 