-- SQL to create phone authentication tables manually
-- Run this in the Render shell via Django

-- Create PhoneOTP table
CREATE TABLE IF NOT EXISTS custom_auth_phoneotp (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    purpose VARCHAR(20) DEFAULT 'login',
    message_sid VARCHAR(100),
    delivery_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    tenant_id VARCHAR(100),
    business_id VARCHAR(100)
);

-- Create indexes for PhoneOTP
CREATE INDEX IF NOT EXISTS idx_phoneotp_phone_number ON custom_auth_phoneotp(phone_number);
CREATE INDEX IF NOT EXISTS idx_phoneotp_tenant_id ON custom_auth_phoneotp(tenant_id);
CREATE INDEX IF NOT EXISTS idx_phoneotp_business_id ON custom_auth_phoneotp(business_id);

-- Create PhoneVerificationAttempt table
CREATE TABLE IF NOT EXISTS custom_auth_phoneverificationattempt (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(20),
    ip_address INET,
    attempt_type VARCHAR(20) NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    tenant_id VARCHAR(100),
    business_id VARCHAR(100)
);

-- Create indexes for PhoneVerificationAttempt
CREATE INDEX IF NOT EXISTS idx_phoneverification_phone_number ON custom_auth_phoneverificationattempt(phone_number);
CREATE INDEX IF NOT EXISTS idx_phoneverification_ip_address ON custom_auth_phoneverificationattempt(ip_address);
CREATE INDEX IF NOT EXISTS idx_phoneverification_tenant_id ON custom_auth_phoneverificationattempt(tenant_id);
CREATE INDEX IF NOT EXISTS idx_phoneverification_business_id ON custom_auth_phoneverificationattempt(business_id);