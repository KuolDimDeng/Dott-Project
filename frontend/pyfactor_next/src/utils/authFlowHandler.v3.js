/**
 * Auth Flow Handler V3 - With Account Deletion Check
 * Handles post-authentication flow for both OAuth and email/password
 * Prevents deleted users from creating new accounts
 */

// Remove auth0Service import as it's causing the error

async function clearAuthData() {
  // Clear all auth-related data
  try {
    // Clear session storage
    sessionStorage.clear();
    
    // Clear local storage auth items
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('auth0') || 
      key.includes('tenant') || 
      key.includes('user')
    );
    authKeys.forEach(key => localStorage.removeItem(key));
    
    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  } catch (error) {
    console.error('[AuthFlowHandler] Error clearing auth data:', error);
  }
}

export async function handlePostAuthFlow(authData, authMethod = 'oauth') {
  console.log('[AuthFlowHandler.v3] Starting post-auth flow for', authMethod, {
    email: authData.user?.email,
    hasAccessToken: !!authData.accessToken
  });

  try {
    // Step 1: Call backend to create/retrieve user with tenant
    console.log('[AuthFlowHandler.v3] Calling backend user-sync endpoint...');
    
    const response = await fetch('/api/user/create-auth0-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.accessToken}`,
      },
      credentials: 'include',
      body: JSON.stringify({
        auth0_sub: authData.user.sub,
        email: authData.user.email,
        name: authData.user.name || authData.user.nickname,
        given_name: authData.user.given_name,
        family_name: authData.user.family_name,
        picture: authData.user.picture,
        email_verified: authData.user.email_verified,
        tenant_id: authData.user['https://dottapps.com/tenant_id'] // Include if exists
      })
    });
    
    const data = await response.json();
    
    // CRITICAL: Check for tenant verification failure
    if (response.status === 403 && data.error === 'TENANT_VERIFICATION_FAILED') {
      console.error('[AuthFlowHandler.v3] Tenant verification failed:', data);
      
      // Clear auth data
      await clearAuthData();
      
      // Redirect to support page with error details
      const params = new URLSearchParams({
        error: 'tenant_verification_failed',
        code: data.support_code,
        email: encodeURIComponent(data.support_email),
        message: encodeURIComponent(data.message)
      });
      
      window.location.href = `/auth/error?${params.toString()}`;
      return null;
    }
    
    // CRITICAL: Check for deleted account
    if (response.status === 403 && data.account_closed) {
      console.error('[AuthFlowHandler.v3] Account is closed/deleted:', data);
      
      // Clear all auth data
      await clearAuthData();
      
      // Log out from Auth0
      try {
        await fetch('/api/auth/logout', { 
          method: 'POST',
          credentials: 'include'
        });
      } catch (e) {
        console.error('[AuthFlowHandler.v3] Error logging out:', e);
      }
      
      // Redirect based on deletion status
      if (data.in_grace_period) {
        // Account in grace period - can be reactivated
        window.location.href = `/account-closed?email=${encodeURIComponent(authData.user.email)}&days=${data.days_remaining || 30}`;
      } else {
        // Account permanently deleted
        window.location.href = '/account-permanently-deleted';
      }
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status} - ${data.error || 'Unknown error'}`);
    }
    
    console.log('[AuthFlowHandler.v3] User creation/retrieval successful', {
      tenantId: data.tenant_id,
      isNewUser: data.is_new_user,
      needsOnboarding: data.needs_onboarding
    });
    
    // Step 2: Store user data
    const userData = {
      ...data,
      email: authData.user.email,
      authMethod: authMethod
    };
    
    // Store user data in session storage for other components to use
    sessionStorage.setItem('currentUser', JSON.stringify(userData));
    
    // Step 3: Handle differently based on auth method
    if (authMethod === 'email-password') {
      // For email-password, return data without redirecting
      // The EmailPasswordSignIn component handles the session bridge flow
      console.log('[AuthFlowHandler.v3] Email-password auth - returning data for session bridge');
      
      return {
        ...userData,
        tenantId: data.tenant_id,
        tenant_id: data.tenant_id,
        needsOnboarding: data.needs_onboarding,
        // Don't include redirectUrl for email-password
        // Let EmailPasswordSignIn handle the routing
      };
    } else {
      // For OAuth, determine the redirect URL based on onboarding status
      console.log('[AuthFlowHandler.v3] OAuth auth - determining redirect URL...');
      
      let redirectUrl;
      if (data.needs_onboarding) {
        redirectUrl = '/onboarding';
      } else if (data.tenant_id) {
        redirectUrl = `/${data.tenant_id}/dashboard`;
      } else {
        // Fallback - shouldn't happen but handle gracefully
        redirectUrl = '/onboarding';
      }
      
      console.log('[AuthFlowHandler.v3] OAuth redirect URL determined', {
        tenantId: data.tenant_id,
        needsOnboarding: data.needs_onboarding,
        redirectUrl,
        reason: 'Session verification now handled by callback page'
      });
      
      // Return the user data with redirect URL for callback page to handle
      return {
        ...data,
        email: data.email,
        businessName: data.business_name,
        subscriptionPlan: data.subscription_plan,
        role: data.role,
        tenantId: data.tenant_id,
        tenant_id: data.tenant_id,
        needsOnboarding: data.needs_onboarding,
        onboardingCompleted: !data.needs_onboarding,
        redirectUrl: redirectUrl
      };
    }
    
  } catch (error) {
    console.error('[AuthFlowHandler.v3] Error in auth flow:', error);
    
    // Check if it's an account closure error
    if (error.message && error.message.includes('account has been closed')) {
      await clearAuthData();
      window.location.href = '/account-closed';
      return null;
    }
    
    throw error;
  }
}

export default handlePostAuthFlow;