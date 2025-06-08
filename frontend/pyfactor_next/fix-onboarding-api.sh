#!/bin/bash

# Fix onboarding API and deployment issues
echo "🔧 Fixing onboarding API configuration..."

# Update the complete-all route to handle the Django backend properly
cat > src/app/api/onboarding/complete-all/route-fix.js << 'EOF'
// Temporary fix for backend API endpoint
// The Django backend expects data in a specific format for the /api/onboarding/complete/ endpoint

async function createTenantInBackend(user, onboardingData, tenantId, accessToken) {
  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    // First create the business info
    const businessResponse = await fetch(`${apiBaseUrl}/api/onboarding/business-info/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-User-Email': user.email,
        'X-User-Sub': user.sub,
      },
      body: JSON.stringify({
        business_name: onboardingData.businessName,
        business_type: onboardingData.businessType,
        country: onboardingData.country,
        state: onboardingData.businessState,
        legal_structure: onboardingData.legalStructure || 'Other',
        first_name: onboardingData.firstName,
        last_name: onboardingData.lastName,
        phone_number: onboardingData.phoneNumber,
        tenant_id: tenantId
      })
    });
    
    if (!businessResponse.ok) {
      console.error('[CompleteOnboarding] Business info creation failed');
      return { success: false, error: 'Failed to save business information' };
    }
    
    // Then save the subscription
    const subscriptionResponse = await fetch(`${apiBaseUrl}/api/onboarding/subscription/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-User-Email': user.email,
        'X-User-Sub': user.sub,
      },
      body: JSON.stringify({
        selected_plan: onboardingData.selectedPlan,
        billing_cycle: onboardingData.billingCycle || 'monthly',
        tenant_id: tenantId
      })
    });
    
    if (!subscriptionResponse.ok) {
      console.error('[CompleteOnboarding] Subscription save failed');
      return { success: false, error: 'Failed to save subscription' };
    }
    
    // Finally mark as complete
    const completeResponse = await fetch(`${apiBaseUrl}/api/onboarding/complete/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-User-Email': user.email,
        'X-User-Sub': user.sub,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        onboarding_completed_at: new Date().toISOString()
      })
    });
    
    if (!completeResponse.ok) {
      console.error('[CompleteOnboarding] Completion marking failed');
      return { success: false, error: 'Failed to complete onboarding' };
    }
    
    return { success: true, data: { tenant_id: tenantId } };
    
  } catch (error) {
    console.error('[CompleteOnboarding] Backend communication error:', error);
    return { success: false, error: error.message };
  }
}
EOF

echo "✅ Created temporary fix for backend API integration"
echo ""
echo "📝 Next steps:"
echo "1. This fix uses the existing Django endpoints instead of a new consolidated one"
echo "2. It makes 3 API calls (business-info, subscription, complete) to match current backend"
echo "3. Deploy this fix to resolve the 404 errors"
echo ""
echo "🚀 To apply the fix, replace the createTenantInBackend function in complete-all/route.js"