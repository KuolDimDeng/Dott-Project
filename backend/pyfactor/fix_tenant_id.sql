-- Drop the tenant_id column if it exists
ALTER TABLE onboarding_onboardingprogress DROP COLUMN IF EXISTS tenant_id;

-- Add the tenant_id field with the correct UUID type
ALTER TABLE onboarding_onboardingprogress 
ADD COLUMN tenant_id UUID NOT NULL DEFAULT 'ac74d8aa-ac71-475e-83c8-d6be4183e633'::uuid;

-- Create index on tenant_id
CREATE INDEX IF NOT EXISTS onboard_tenant_idx ON onboarding_onboardingprogress(tenant_id);

-- After confirmation, remove the default constraint 
-- ALTER TABLE onboarding_onboardingprogress ALTER COLUMN tenant_id DROP DEFAULT; 