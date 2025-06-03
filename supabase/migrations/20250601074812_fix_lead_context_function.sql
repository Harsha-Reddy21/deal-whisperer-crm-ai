-- Fix the compose_lead_context function to properly handle leads table schema
-- and use the correct activity relationships

CREATE OR REPLACE FUNCTION compose_lead_context(lead_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    lead_record leads%ROWTYPE;
    activities_text text := '';
    activity_record record;
    result_text text := '';
BEGIN
    -- Get the lead record
    SELECT * INTO lead_record FROM leads WHERE id = lead_id;
    
    IF NOT FOUND THEN
        RETURN '';
    END IF;
    
    -- Start building the context
    result_text := 'LEAD INFORMATION:' || E'\n';
    result_text := result_text || 'Name: ' || COALESCE(lead_record.name, 'No name') || E'\n';
    result_text := result_text || 'Company: ' || COALESCE(lead_record.company, 'No company') || E'\n';
    result_text := result_text || 'Email: ' || COALESCE(lead_record.email, 'No email') || E'\n';
    result_text := result_text || 'Phone: ' || COALESCE(lead_record.phone, 'No phone') || E'\n';
    
    -- Only include title if it exists and is not null
    IF lead_record.title IS NOT NULL AND lead_record.title != '' THEN
        result_text := result_text || 'Title: ' || lead_record.title || E'\n';
    END IF;
    
    result_text := result_text || 'Status: ' || COALESCE(lead_record.status, 'Unknown') || E'\n';
    result_text := result_text || 'Source: ' || COALESCE(lead_record.source, 'Unknown source') || E'\n';
    result_text := result_text || 'Score: ' || COALESCE(lead_record.score::text, '0') || E'\n';
    
    -- Only include notes if they exist
    IF lead_record.notes IS NOT NULL AND lead_record.notes != '' THEN
        result_text := result_text || 'Notes: ' || lead_record.notes || E'\n';
    END IF;
    
    -- Include additional lead-specific fields if they exist
    IF lead_record.lead_magnet IS NOT NULL AND lead_record.lead_magnet != '' THEN
        result_text := result_text || 'Lead Magnet: ' || lead_record.lead_magnet || E'\n';
    END IF;
    
    IF lead_record.utm_source IS NOT NULL AND lead_record.utm_source != '' THEN
        result_text := result_text || 'UTM Source: ' || lead_record.utm_source || E'\n';
    END IF;
    
    IF lead_record.utm_campaign IS NOT NULL AND lead_record.utm_campaign != '' THEN
        result_text := result_text || 'UTM Campaign: ' || lead_record.utm_campaign || E'\n';
    END IF;
    
    -- Get related activities using lead_id (if the activities table has been updated to support leads)
    -- First try to get activities directly linked to the lead
    FOR activity_record IN 
        SELECT type, subject, description, notes, created_at, outcome, status
        FROM activities 
        WHERE lead_id = lead_record.id
        ORDER BY created_at DESC
        LIMIT 15
    LOOP
        IF activities_text = '' THEN
            activities_text := E'\n' || 'RELATED ACTIVITIES:' || E'\n';
        END IF;
        
        activities_text := activities_text || '- [' || activity_record.created_at::date || '] ';
        activities_text := activities_text || COALESCE(activity_record.type, 'Activity') || ': ';
        activities_text := activities_text || COALESCE(activity_record.subject, activity_record.description, 'No description');
        
        IF activity_record.notes IS NOT NULL AND activity_record.notes != '' THEN
            activities_text := activities_text || ' | Notes: ' || activity_record.notes;
        END IF;
        
        IF activity_record.outcome IS NOT NULL AND activity_record.outcome != '' THEN
            activities_text := activities_text || ' | Outcome: ' || activity_record.outcome;
        END IF;
        
        IF activity_record.status IS NOT NULL AND activity_record.status != '' THEN
            activities_text := activities_text || ' | Status: ' || activity_record.status;
        END IF;
        
        activities_text := activities_text || E'\n';
    END LOOP;
    
    -- If no direct lead activities found, try to find activities for contacts with matching email/phone
    -- This is a fallback for leads that might have been converted to contacts
    IF activities_text = '' THEN
        FOR activity_record IN 
            SELECT type, subject, description, notes, created_at, outcome, status
            FROM activities 
            WHERE contact_id IN (
                SELECT id FROM contacts 
                WHERE (email = lead_record.email OR phone = lead_record.phone)
                AND user_id = (SELECT user_id FROM leads WHERE id = lead_record.id)
            )
            ORDER BY created_at DESC
            LIMIT 10
        LOOP
            IF activities_text = '' THEN
                activities_text := E'\n' || 'RELATED ACTIVITIES (from converted contact):' || E'\n';
            END IF;
            
            activities_text := activities_text || '- [' || activity_record.created_at::date || '] ';
            activities_text := activities_text || COALESCE(activity_record.type, 'Activity') || ': ';
            activities_text := activities_text || COALESCE(activity_record.subject, activity_record.description, 'No description');
            
            IF activity_record.notes IS NOT NULL AND activity_record.notes != '' THEN
                activities_text := activities_text || ' | Notes: ' || activity_record.notes;
            END IF;
            
            IF activity_record.outcome IS NOT NULL AND activity_record.outcome != '' THEN
                activities_text := activities_text || ' | Outcome: ' || activity_record.outcome;
            END IF;
            
            activities_text := activities_text || E'\n';
        END LOOP;
    END IF;
    
    result_text := result_text || activities_text;
    
    RETURN result_text;
END;
$$;

-- Update the comment for the function
COMMENT ON FUNCTION compose_lead_context IS 'Composes rich text blob including lead info and related activities (both direct and from converted contacts)';

-- Test the function to make sure it works
DO $$
BEGIN
    -- Test with a non-existent lead ID to make sure it returns empty string
    IF compose_lead_context('00000000-0000-0000-0000-000000000000') != '' THEN
        RAISE EXCEPTION 'compose_lead_context should return empty string for non-existent lead';
    END IF;
    
    RAISE NOTICE 'compose_lead_context function updated and tested successfully';
END $$; 