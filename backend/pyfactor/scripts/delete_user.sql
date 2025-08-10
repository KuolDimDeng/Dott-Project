-- Comprehensive User Deletion SQL Script
-- This script deletes a user and all related data from the database
-- 
-- Usage: 
--   1. Replace 'USER_EMAIL_HERE' with the actual email address
--   2. Run this script in your PostgreSQL database
--
-- Example:
--   psql -d dott_production -f delete_user.sql
--
-- Or replace the email variable and run directly:
--   \set user_email 'user@example.com'

-- Set the email address to delete (CHANGE THIS!)
\set user_email 'USER_EMAIL_HERE'

-- Start transaction for safety
BEGIN;

-- Find the user ID
DO $$
DECLARE
    v_user_id INTEGER;
    v_user_email TEXT := :'user_email';
    v_session_ids UUID[];
    v_deleted_count INTEGER := 0;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id 
    FROM custom_auth_user 
    WHERE email = v_user_email;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User % not found in database', v_user_email;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found user % with ID %', v_user_email, v_user_id;
    
    -- Get all session IDs for this user (for cascading deletes)
    SELECT ARRAY_AGG(session_id) INTO v_session_ids
    FROM user_sessions 
    WHERE user_id = v_user_id;
    
    -- Delete Smart Insights data
    DELETE FROM smart_insights_credittransaction WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count > 0 THEN
        RAISE NOTICE '  ✓ Deleted % smart insights transactions', v_deleted_count;
    END IF;
    
    DELETE FROM smart_insights_usercredit WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count > 0 THEN
        RAISE NOTICE '  ✓ Deleted % smart insights credits', v_deleted_count;
    END IF;
    
    -- Delete Audit logs
    DELETE FROM audit_log WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count > 0 THEN
        RAISE NOTICE '  ✓ Deleted % audit log entries', v_deleted_count;
    END IF;
    
    -- Delete Session-related data
    IF v_session_ids IS NOT NULL THEN
        DELETE FROM session_events WHERE session_id = ANY(v_session_ids);
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        IF v_deleted_count > 0 THEN
            RAISE NOTICE '  ✓ Deleted % session events', v_deleted_count;
        END IF;
        
        DELETE FROM session_security WHERE session_id = ANY(v_session_ids);
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        IF v_deleted_count > 0 THEN
            RAISE NOTICE '  ✓ Deleted % session security records', v_deleted_count;
        END IF;
    END IF;
    
    DELETE FROM user_sessions WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count > 0 THEN
        RAISE NOTICE '  ✓ Deleted % user sessions', v_deleted_count;
    END IF;
    
    -- Delete User Profile and Employee data
    DELETE FROM users_userprofile WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count > 0 THEN
        RAISE NOTICE '  ✓ Deleted user profile', v_deleted_count;
    END IF;
    
    DELETE FROM hr_employee WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count > 0 THEN
        RAISE NOTICE '  ✓ Deleted employee record', v_deleted_count;
    END IF;
    
    -- Delete Notifications
    DELETE FROM notifications_notification WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count > 0 THEN
        RAISE NOTICE '  ✓ Deleted % notifications', v_deleted_count;
    END IF;
    
    -- Delete created_by references (be careful with these - they might be important business data)
    -- Uncomment these lines if you want to delete ALL data created by this user
    /*
    DELETE FROM events_event WHERE created_by_id = v_user_id;
    DELETE FROM sales_customer WHERE created_by_id = v_user_id;
    DELETE FROM sales_invoice WHERE created_by_id = v_user_id;
    DELETE FROM inventory_product WHERE created_by_id = v_user_id;
    DELETE FROM purchases_purchaseorder WHERE created_by_id = v_user_id;
    DELETE FROM vendors_vendor WHERE created_by_id = v_user_id;
    DELETE FROM finance_transaction WHERE created_by_id = v_user_id;
    DELETE FROM payroll_payrollrun WHERE created_by_id = v_user_id;
    DELETE FROM analysis_analysisreport WHERE created_by_id = v_user_id;
    DELETE FROM jobs_job WHERE created_by_id = v_user_id;
    DELETE FROM crm_contact WHERE created_by_id = v_user_id;
    DELETE FROM transport_vehicle WHERE created_by_id = v_user_id;
    */
    
    -- Delete other user-specific data
    DELETE FROM taxes_taxfiling WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count > 0 THEN
        RAISE NOTICE '  ✓ Deleted % tax filings', v_deleted_count;
    END IF;
    
    DELETE FROM banking_bankaccount WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count > 0 THEN
        RAISE NOTICE '  ✓ Deleted % bank accounts', v_deleted_count;
    END IF;
    
    DELETE FROM payments_payment WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count > 0 THEN
        RAISE NOTICE '  ✓ Deleted % payments', v_deleted_count;
    END IF;
    
    DELETE FROM whatsapp_business_whatsappmessage WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count > 0 THEN
        RAISE NOTICE '  ✓ Deleted % WhatsApp messages', v_deleted_count;
    END IF;
    
    DELETE FROM data_export_exportrequest WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count > 0 THEN
        RAISE NOTICE '  ✓ Deleted % export requests', v_deleted_count;
    END IF;
    
    DELETE FROM communications_communication WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count > 0 THEN
        RAISE NOTICE '  ✓ Deleted % communications', v_deleted_count;
    END IF;
    
    -- Finally, delete the user
    DELETE FROM custom_auth_user WHERE id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ SUCCESS: User % has been completely deleted', v_user_email;
    ELSE
        RAISE NOTICE '❌ FAILED: Could not delete user %', v_user_email;
    END IF;
    
END $$;

-- Verify deletion
SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM custom_auth_user WHERE email = :'user_email')
    THEN '❌ FAILED - User still exists'
    ELSE '✅ SUCCESS - User has been deleted'
END as deletion_status;

-- IMPORTANT: Uncomment the next line to actually commit the deletion
-- COMMIT;

-- For safety, we ROLLBACK by default. Change to COMMIT when you're sure.
ROLLBACK;

-- To use this script:
-- 1. Save it as delete_user.sql
-- 2. Replace 'USER_EMAIL_HERE' with the actual email
-- 3. Change ROLLBACK to COMMIT at the end when ready
-- 4. Run: psql -d your_database -f delete_user.sql