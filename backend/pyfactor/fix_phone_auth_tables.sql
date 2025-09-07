-- SQL script to fix phone authentication table schemas
-- Run this in Render shell via Django dbshell

-- First, drop the existing tables (they have wrong schema)
DROP TABLE IF EXISTS custom_auth_phoneotp CASCADE;
DROP TABLE IF EXISTS custom_auth_phoneverificationattempt CASCADE;

-- Create PhoneOTP table with correct schema matching the model
CREATE TABLE custom_auth_phoneotp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) DEFAULT 'login',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE,
    message_sid VARCHAR(100),
    delivery_status VARCHAR(20) DEFAULT 'pending',
    ip_address INET,
    user_agent TEXT,
    tenant_id VARCHAR(100),
    business_id VARCHAR(100)
);

-- Create indexes for PhoneOTP
CREATE INDEX idx_phoneotp_phone_created ON custom_auth_phoneotp(phone_number, created_at);
CREATE INDEX idx_phoneotp_otp_expires ON custom_auth_phoneotp(otp_code, expires_at);
CREATE INDEX idx_phoneotp_expires ON custom_auth_phoneotp(expires_at);
CREATE INDEX idx_phoneotp_phone ON custom_auth_phoneotp(phone_number);
CREATE INDEX idx_phoneotp_tenant ON custom_auth_phoneotp(tenant_id);
CREATE INDEX idx_phoneotp_business ON custom_auth_phoneotp(business_id);

-- Create PhoneVerificationAttempt table with correct schema
CREATE TABLE custom_auth_phoneverificationattempt (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE INDEX idx_phoneverif_phone_created ON custom_auth_phoneverificationattempt(phone_number, created_at);
CREATE INDEX idx_phoneverif_ip_created ON custom_auth_phoneverificationattempt(ip_address, created_at);
CREATE INDEX idx_phoneverif_created ON custom_auth_phoneverificationattempt(created_at);
CREATE INDEX idx_phoneverif_phone ON custom_auth_phoneverificationattempt(phone_number);
CREATE INDEX idx_phoneverif_ip ON custom_auth_phoneverificationattempt(ip_address);
CREATE INDEX idx_phoneverif_tenant ON custom_auth_phoneverificationattempt(tenant_id);
CREATE INDEX idx_phoneverif_business ON custom_auth_phoneverificationattempt(business_id);

-- Verify tables were created
\dt custom_auth*