-- Check if RLS is enabled on the table
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'onboarding_onboardingprogress';

-- Check policies on the table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'onboarding_onboardingprogress'; 