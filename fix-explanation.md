# Business Type and Subscription Plan Fix

This change fixes an issue where the business type and subscription plan selected during onboarding were not being properly stored and displayed in the dashboard.

Changes made:

1. Updated subscription handling to properly set cookies with the user-selected plan
2. Added proper cookie handling in the subscription/save API endpoint
3. Removed businessSubtypes field which is no longer needed
4. Ensured the profile API reads the correct values from cookies

Now the dashboard will correctly display the business type and subscription plan that the user selected during onboarding.
