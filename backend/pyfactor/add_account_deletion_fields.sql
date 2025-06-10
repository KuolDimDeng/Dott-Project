-- Add account deletion fields to custom_auth_user table
ALTER TABLE custom_auth_user 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS deletion_reason VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS deletion_feedback TEXT NULL,
ADD COLUMN IF NOT EXISTS deletion_initiated_by VARCHAR(255) NULL;

-- Add index for is_deleted field for faster queries
CREATE INDEX IF NOT EXISTS custom_auth_user_is_deleted_idx ON custom_auth_user(is_deleted);

-- Create account deletion log table
CREATE TABLE IF NOT EXISTS custom_auth_account_deletion_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(254) NOT NULL,
    user_id INTEGER NOT NULL,
    tenant_id UUID NULL,
    auth0_sub VARCHAR(255) NULL,
    deletion_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deletion_reason VARCHAR(255) NULL,
    deletion_feedback TEXT NULL,
    deletion_initiated_by VARCHAR(255) NOT NULL DEFAULT 'user',
    auth0_deleted BOOLEAN DEFAULT FALSE,
    database_deleted BOOLEAN DEFAULT FALSE,
    tenant_deleted BOOLEAN DEFAULT FALSE,
    deletion_errors JSONB NULL,
    ip_address INET NULL,
    user_agent TEXT NULL
);

-- Add indexes for account deletion log
CREATE INDEX IF NOT EXISTS account_deletion_log_user_email_idx ON custom_auth_account_deletion_log(user_email);
CREATE INDEX IF NOT EXISTS account_deletion_log_deletion_date_idx ON custom_auth_account_deletion_log(deletion_date);

-- Add comment to explain soft delete
COMMENT ON COLUMN custom_auth_user.is_deleted IS 'Soft delete flag - when true, user account has been closed but data is retained for compliance';
COMMENT ON COLUMN custom_auth_user.deleted_at IS 'Timestamp when the account was closed';
COMMENT ON COLUMN custom_auth_user.deletion_reason IS 'Reason provided by user for closing account';
COMMENT ON COLUMN custom_auth_user.deletion_feedback IS 'Additional feedback provided during account closure';
COMMENT ON TABLE custom_auth_account_deletion_log IS 'Audit log for account deletions - keeps permanent record for compliance';