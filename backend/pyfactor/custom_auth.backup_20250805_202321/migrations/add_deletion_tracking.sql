-- Add deletion tracking fields to user table
ALTER TABLE custom_auth_user 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS deletion_feedback TEXT NULL,
ADD COLUMN IF NOT EXISTS deletion_initiated_by VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS permanently_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMP NULL;

-- Create index for deleted users
CREATE INDEX IF NOT EXISTS idx_user_deleted ON custom_auth_user(is_deleted, email);
CREATE INDEX IF NOT EXISTS idx_user_deleted_at ON custom_auth_user(deleted_at);

-- Create account deletion log table
CREATE TABLE IF NOT EXISTS custom_auth_accountdeletionlog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(254) NOT NULL,
    user_id INTEGER NOT NULL,
    tenant_id UUID NULL,
    auth0_sub VARCHAR(255) NULL,
    deletion_reason TEXT,
    deletion_feedback TEXT,
    deletion_initiated_by VARCHAR(50),
    tenant_deleted BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for deletion logs
CREATE INDEX IF NOT EXISTS idx_deletion_log_email ON custom_auth_accountdeletionlog(user_email);
CREATE INDEX IF NOT EXISTS idx_deletion_log_date ON custom_auth_accountdeletionlog(deleted_at);

-- Create email hash tracking to prevent recreation
CREATE TABLE IF NOT EXISTS user_deletion_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_hash VARCHAR(255) NOT NULL,
    original_user_id INTEGER NOT NULL,
    original_tenant_id UUID NULL,
    deletion_requested_at TIMESTAMP NOT NULL,
    grace_period_ends_at TIMESTAMP NOT NULL,
    permanently_deleted_at TIMESTAMP NULL,
    reactivated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deletion_tracking_email_hash ON user_deletion_tracking(email_hash);
CREATE INDEX IF NOT EXISTS idx_deletion_tracking_grace_period ON user_deletion_tracking(grace_period_ends_at);