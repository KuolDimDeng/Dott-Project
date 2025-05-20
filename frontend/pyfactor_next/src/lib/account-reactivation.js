/**
 * Account reactivation utilities
 * This file contains functions for checking and reactivating disabled accounts
 */

/**
 * Checks if an account exists but is disabled
 * @param {string} email - The email to check
 * @returns {Promise<Object>} - The check result
 */
export async function checkDisabledAccount(email) {
  if (!email) {
    throw new Error('Email is required');
  }

  try {
    const response = await fetch('/api/user/check-disabled', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to check account status');
    }

    return await response.json();
  } catch (error) {
    console.error('[AccountReactivation] Error checking disabled account:', error);
    throw error;
  }
}

/**
 * Reactivates a disabled account
 * @param {Object} params - Reactivation parameters
 * @param {string} params.email - The email address
 * @param {string} [params.username] - The Cognito username if different from email
 * @param {string} [params.tenantId] - The tenant ID to reactivate
 * @returns {Promise<Object>} - The reactivation result
 */
export async function reactivateAccount({ email, username, tenantId }) {
  if (!email && !username) {
    throw new Error('Email or username is required');
  }

  try {
    const response = await fetch('/api/user/reactivate-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        username,
        tenantId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to reactivate account');
    }

    return await response.json();
  } catch (error) {
    console.error('[AccountReactivation] Error reactivating account:', error);
    throw error;
  }
}

/**
 * Checks if an account exists and is disabled, and offers reactivation
 * @param {string} email - The email to check
 * @returns {Promise<{shouldContinue: boolean, message: string}>} - Whether to continue with sign-up and a message
 */
export async function handlePossibleReactivation(email) {
  try {
    // Check if the account exists and is disabled
    const checkResult = await checkDisabledAccount(email);
    
    if (checkResult.success && checkResult.exists && checkResult.isDisabled) {
      // Account exists and is disabled, offer reactivation
      const confirmReactivation = window.confirm(
        'This account was previously closed. Would you like to reactivate it? ' +
        'This will restore your previous data.'
      );
      
      if (confirmReactivation) {
        // User wants to reactivate, proceed with reactivation
        const reactivationResult = await reactivateAccount({
          email,
          username: checkResult.username,
          tenantId: checkResult.tenantInfo?.id
        });
        
        if (reactivationResult.success) {
          return {
            shouldContinue: false,
            reactivated: true,
            message: 'Your account has been reactivated! You can now sign in.'
          };
        } else {
          return {
            shouldContinue: false,
            reactivated: false,
            message: `Could not reactivate account: ${reactivationResult.message}`
          };
        }
      } else {
        // User declined reactivation, they want to continue with sign-up
        // (which will likely fail with "User already exists")
        return {
          shouldContinue: true,
          reactivated: false,
          message: 'Continuing with sign-up. Note that this email is already registered.'
        };
      }
    } else if (checkResult.success && checkResult.exists && !checkResult.isDisabled) {
      // Account exists and is already active
      return {
        shouldContinue: false,
        reactivated: false,
        message: 'This account is already active. Please sign in with your email and password.'
      };
    } else {
      // Account doesn't exist, continue with normal sign-up
      return {
        shouldContinue: true,
        reactivated: false,
        message: null
      };
    }
  } catch (error) {
    console.error('[AccountReactivation] Error handling reactivation:', error);
    // If there's an error, continue with normal sign-up flow
    return {
      shouldContinue: true,
      reactivated: false,
      message: null
    };
  }
} 