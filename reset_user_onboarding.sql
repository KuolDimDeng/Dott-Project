-- Reset onboarding for a specific user
-- This will force them to go through onboarding again

-- Replace 'admin@dottapps.com' with the email of the user you want to reset
DO $$
DECLARE
    user_id INTEGER;
    tenant_id UUID;
BEGIN
    -- Get the user ID
    SELECT id INTO user_id FROM custom_user WHERE email = 'admin@dottapps.com';
    
    IF user_id IS NULL THEN
        RAISE NOTICE 'User not found';
        RETURN;
    END IF;
    
    -- Get the tenant ID
    SELECT id INTO tenant_id FROM tenants WHERE owner_id = user_id::TEXT;
    
    -- Update user to mark as needs onboarding
    UPDATE custom_user 
    SET 
        setup_completed = FALSE,
        onboarding_completed = FALSE,
        needs_onboarding = TRUE,
        onboarding_status = 'pending'
    WHERE id = user_id;
    
    -- Delete or reset onboarding progress
    DELETE FROM onboarding_progress WHERE user_id = user_id;
    
    -- Optionally, you can insert a new progress record to start fresh
    INSERT INTO onboarding_progress (
        id,
        user_id,
        tenant_id,
        current_step,
        completed_steps,
        status,
        setup_completed,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        user_id,
        tenant_id,
        'business-info',
        '[]'::jsonb,
        'in_progress',
        FALSE,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Successfully reset onboarding for user ID: % (email: admin@dottapps.com)', user_id;
    RAISE NOTICE 'User will now be redirected to onboarding on next login';
END $$;