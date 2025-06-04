-- COMPREHENSIVE FIX: Add ALL missing columns to onboarding_onboardingprogress table
-- This script adds all fields defined in the OnboardingProgress Django model
-- Safe to run multiple times (uses IF NOT EXISTS)

-- Add all missing columns systematically

-- Session tracking fields
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'session_id') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN session_id UUID NULL;
        RAISE NOTICE 'Added session_id column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'last_session_activity') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN last_session_activity TIMESTAMP WITH TIME ZONE NULL;
        RAISE NOTICE 'Added last_session_activity column';
    END IF;
END $$;

-- Status fields
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'onboarding_status') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN onboarding_status VARCHAR(50) DEFAULT 'business_info';
        RAISE NOTICE 'Added onboarding_status column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'account_status') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN account_status VARCHAR(20) DEFAULT 'pending';
        RAISE NOTICE 'Added account_status column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'user_role') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN user_role VARCHAR(20) DEFAULT 'owner';
        RAISE NOTICE 'Added user_role column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'subscription_plan') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN subscription_plan VARCHAR(20) DEFAULT 'free';
        RAISE NOTICE 'Added subscription_plan column';
    END IF;
END $$;

-- Progress tracking fields
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'current_step') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN current_step VARCHAR(50) DEFAULT 'business_info';
        RAISE NOTICE 'Added current_step column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'next_step') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN next_step VARCHAR(50) DEFAULT 'subscription';
        RAISE NOTICE 'Added next_step column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'completed_steps') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN completed_steps JSONB DEFAULT '[]';
        RAISE NOTICE 'Added completed_steps column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'last_active_step') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN last_active_step VARCHAR(256) NULL;
        RAISE NOTICE 'Added last_active_step column';
    END IF;
END $$;

-- Timestamp fields
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'created_at') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'updated_at') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'last_login') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN last_login TIMESTAMP WITH TIME ZONE NULL;
        RAISE NOTICE 'Added last_login column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'access_token_expiration') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN access_token_expiration TIMESTAMP WITH TIME ZONE NULL;
        RAISE NOTICE 'Added access_token_expiration column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'completed_at') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE NULL;
        RAISE NOTICE 'Added completed_at column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'database_setup_task_id') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN database_setup_task_id VARCHAR(255) NULL;
        RAISE NOTICE 'Added database_setup_task_id column';
    END IF;
END $$;

-- Subscription and plan data
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'selected_plan') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN selected_plan VARCHAR(20) DEFAULT 'free';
        RAISE NOTICE 'Added selected_plan column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'subscription_status') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN subscription_status VARCHAR(20) NULL;
        RAISE NOTICE 'Added subscription_status column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'billing_cycle') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN billing_cycle VARCHAR(20) DEFAULT 'monthly';
        RAISE NOTICE 'Added billing_cycle column';
    END IF;
END $$;

-- Payment tracking
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'payment_completed') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN payment_completed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added payment_completed column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'payment_method') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN payment_method VARCHAR(50) NULL;
        RAISE NOTICE 'Added payment_method column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'payment_id') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN payment_id VARCHAR(100) NULL;
        RAISE NOTICE 'Added payment_id column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'payment_timestamp') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN payment_timestamp TIMESTAMP WITH TIME ZONE NULL;
        RAISE NOTICE 'Added payment_timestamp column';
    END IF;
END $$;

-- RLS setup tracking
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'rls_setup_completed') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN rls_setup_completed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added rls_setup_completed column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'rls_setup_timestamp') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN rls_setup_timestamp TIMESTAMP WITH TIME ZONE NULL;
        RAISE NOTICE 'Added rls_setup_timestamp column';
    END IF;
END $$;

-- Setup status tracking
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'setup_completed') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN setup_completed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added setup_completed column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'setup_timestamp') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN setup_timestamp TIMESTAMP WITH TIME ZONE NULL;
        RAISE NOTICE 'Added setup_timestamp column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'setup_error') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN setup_error TEXT NULL;
        RAISE NOTICE 'Added setup_error column';
    END IF;
END $$;

-- Schema and metadata fields
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'schema_name') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN schema_name VARCHAR(63) NULL;
        RAISE NOTICE 'Added schema_name column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'metadata') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE 'Added metadata column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'attribute_version') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN attribute_version VARCHAR(10) DEFAULT '1.0.0';
        RAISE NOTICE 'Added attribute_version column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'preferences') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN preferences JSONB DEFAULT '{}';
        RAISE NOTICE 'Added preferences column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'business_id') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN business_id UUID NULL;
        RAISE NOTICE 'Added business_id column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_onboardingprogress' AND column_name = 'tenant_id') THEN
        ALTER TABLE onboarding_onboardingprogress ADD COLUMN tenant_id UUID NOT NULL;
        RAISE NOTICE 'Added tenant_id column';
    END IF;
END $$;

-- Create all necessary indexes for performance
CREATE INDEX IF NOT EXISTS onboard_tenant_idx ON onboarding_onboardingprogress(tenant_id);
CREATE INDEX IF NOT EXISTS onboard_session_idx ON onboarding_onboardingprogress(session_id);
CREATE INDEX IF NOT EXISTS onboard_activity_idx ON onboarding_onboardingprogress(last_session_activity);
CREATE INDEX IF NOT EXISTS onboard_business_idx ON onboarding_onboardingprogress(business_id);
CREATE INDEX IF NOT EXISTS onboard_account_status_idx ON onboarding_onboardingprogress(account_status);
CREATE INDEX IF NOT EXISTS onboard_user_role_idx ON onboarding_onboardingprogress(user_role);
CREATE INDEX IF NOT EXISTS onboard_onboarding_status_idx ON onboarding_onboardingprogress(onboarding_status);
CREATE INDEX IF NOT EXISTS onboard_current_step_idx ON onboarding_onboardingprogress(current_step);
CREATE INDEX IF NOT EXISTS onboard_payment_completed_idx ON onboarding_onboardingprogress(payment_completed);
CREATE INDEX IF NOT EXISTS onboard_setup_completed_idx ON onboarding_onboardingprogress(setup_completed);
CREATE INDEX IF NOT EXISTS onboard_created_at_idx ON onboarding_onboardingprogress(created_at);
CREATE INDEX IF NOT EXISTS onboard_updated_at_idx ON onboarding_onboardingprogress(updated_at);

-- Show final comprehensive schema
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'onboarding_onboardingprogress' 
ORDER BY column_name; 