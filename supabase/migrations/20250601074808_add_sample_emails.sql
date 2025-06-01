-- Add sample email data for testing
-- This will only insert if no emails exist for the user

-- Function to add sample emails for a user
CREATE OR REPLACE FUNCTION add_sample_emails_for_user(user_uuid UUID)
RETURNS void AS $$
DECLARE
    email_count INTEGER;
BEGIN
    -- Check if user already has emails
    SELECT COUNT(*) INTO email_count 
    FROM email_tracking 
    WHERE user_id = user_uuid;
    
    -- Only add sample emails if none exist
    IF email_count = 0 THEN
        INSERT INTO email_tracking (
            user_id, email_id, subject, body, sent_at, read_at, contact_id
        ) VALUES 
        (
            user_uuid,
            'sample_001',
            'Welcome to our CRM system',
            'Thank you for joining our CRM platform. We are excited to help you manage your sales pipeline more effectively. This email contains important information about getting started with your account.',
            NOW() - INTERVAL '2 hours',
            NULL, -- Unread
            NULL
        ),
        (
            user_uuid,
            'sample_002',
            'Partnership Opportunity Discussion',
            'I hope this email finds you well. I wanted to reach out regarding a potential partnership opportunity between our companies. We have been following your work and believe there could be significant synergy between our organizations. Would you be available for a brief call next week to discuss this further?',
            NOW() - INTERVAL '5 hours',
            NULL, -- Unread
            NULL
        ),
        (
            user_uuid,
            'sample_003',
            'Follow-up: Meeting Yesterday',
            'Thank you for taking the time to meet with me yesterday. I really enjoyed our conversation about the new product features and your roadmap for Q2. As discussed, I am attaching the proposal document for your review. Please let me know if you have any questions.',
            NOW() - INTERVAL '1 day',
            NOW() - INTERVAL '1 day', -- Read
            NULL
        ),
        (
            user_uuid,
            'sample_004',
            'Urgent: Contract Review Needed',
            'We need to finalize the contract terms by end of week to meet our Q1 deadline. The legal team has reviewed the document and made some minor adjustments. Can you please review the attached contract and let me know if the changes are acceptable?',
            NOW() - INTERVAL '3 hours',
            NULL, -- Unread
            NULL
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Note: This function can be called manually for each user:
-- SELECT add_sample_emails_for_user('user-uuid-here'); 