/**
 * Debug utilities for Cognito user attributes and authentication issues
 */
import { logger } from './logger';
import { updateUserAttributes, fetchUserAttributes, fetchAuthSession } from '@/config/amplifyUnified';

/**
 * Debug function to test updating Cognito attributes directly
 * @returns {Promise<boolean>} Whether the update was successful
 */
export async function testUpdateAttributes() {
  try {
    logger.info('[DebugCognito] Testing direct attribute update');
    
    // Get current attributes
    const currentAttributes = await fetchUserAttributes();
    logger.info('[DebugCognito] Current attributes:', currentAttributes);
    
    // Try update with userAttributes format (Amplify v6 format)
    try {
      logger.info('[DebugCognito] Attempting update with userAttributes format');
      const result = await updateUserAttributes({
        userAttributes: {
          'custom:onboarding': 'COMPLETE',
          'custom:setupdone': 'true',
          'custom:attrversion': 'v1.0.1'
        }
      });
      
      logger.info('[DebugCognito] Update successful with userAttributes format:', result);
      return true;
    } catch (error) {
      logger.error('[DebugCognito] Update failed with userAttributes format:', {
        message: error.message,
        name: error.name,
        code: error.code
      });
      
      // Try alternative format
      try {
        logger.info('[DebugCognito] Attempting update with legacy format');
        await updateUserAttributes({
          'custom:onboarding': 'COMPLETE',
          'custom:setupdone': 'true',
          'custom:attrversion': 'v1.0.1'
        });
        
        logger.info('[DebugCognito] Update successful with legacy format');
        return true;
      } catch (legacyError) {
        logger.error('[DebugCognito] Update failed with legacy format:', {
          message: legacyError.message,
          name: legacyError.name,
          code: legacyError.code
        });
      }
    }
    
    // Try the server-side update API as fallback
    logger.info('[DebugCognito] Attempting update via API endpoint');
    const { tokens } = await fetchAuthSession();
    
    if (!tokens) {
      logger.error('[DebugCognito] No auth session available for API call');
      return false;
    }
    
    const response = await fetch('/api/onboarding/fix-attributes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.idToken.toString()}`
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      logger.info('[DebugCognito] API update successful:', result);
      
      // Verify the update
      const updatedAttributes = await fetchUserAttributes();
      logger.info('[DebugCognito] Updated attributes:', updatedAttributes);
      
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      logger.error('[DebugCognito] API update failed:', {
        status: response.status,
        data: errorData
      });
    }
    
    return false;
  } catch (error) {
    logger.error('[DebugCognito] Unhandled error in testUpdateAttributes:', error);
    return false;
  }
}

/**
 * Debug function to diagnose attribute value issues
 * @returns {Promise<Object>} Diagnostic information
 */
export async function diagnoseCognitoIssues() {
  try {
    logger.info('[DebugCognito] Diagnosing Cognito issues');
    
    const diagnostics = {
      attributes: null,
      session: null,
      tokens: null,
      errors: []
    };
    
    // Check attributes
    try {
      const attributes = await fetchUserAttributes();
      diagnostics.attributes = {
        onboarding: attributes['custom:onboarding'] || 'not set',
        setupDone: attributes['custom:setupdone'] || 'not set',
        businessId: attributes['custom:businessid'] || 'not set',
        businessName: attributes['custom:businessname'] || 'not set',
        attrVersion: attributes['custom:attrversion'] || 'not set'
      };
    } catch (attrError) {
      diagnostics.errors.push({
        context: 'attributes',
        message: attrError.message,
        name: attrError.name,
        code: attrError.code
      });
    }
    
    // Check session
    try {
      const session = await fetchAuthSession();
      diagnostics.session = {
        hasIdToken: !!session?.tokens?.idToken,
        hasAccessToken: !!session?.tokens?.accessToken,
        authenticated: session?.authenticated || false
      };
      
      if (session?.tokens?.idToken) {
        try {
          // Parse token to extract claims
          const tokenString = session.tokens.idToken.toString();
          const parts = tokenString.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            diagnostics.tokens = {
              iss: payload.iss,
              sub: payload.sub,
              exp: new Date(payload.exp * 1000).toISOString(),
              hasOnboarding: 'custom:onboarding' in payload,
              hasSetupDone: 'custom:setupdone' in payload
            };
          }
        } catch (tokenError) {
          diagnostics.errors.push({
            context: 'token_parsing',
            message: tokenError.message
          });
        }
      }
    } catch (sessionError) {
      diagnostics.errors.push({
        context: 'session',
        message: sessionError.message,
        name: sessionError.name,
        code: sessionError.code
      });
    }
    
    logger.info('[DebugCognito] Diagnostic results:', diagnostics);
    return diagnostics;
  } catch (error) {
    logger.error('[DebugCognito] Unhandled error in diagnoseCognitoIssues:', error);
    return { errors: [{ context: 'global', message: error.message }] };
  }
}

/**
 * Add a debug button to the page that lets users fix their attributes
 * @returns {HTMLElement} The debug button
 */
export function addDebugFixButton() {
  if (typeof document === 'undefined') return null;
  
  // Check if button already exists
  if (document.getElementById('cognito-fix-button')) {
    return document.getElementById('cognito-fix-button');
  }
  
  // Create button
  const button = document.createElement('button');
  button.id = 'cognito-fix-button';
  button.textContent = 'Fix Cognito Attributes';
  button.style.position = 'fixed';
  button.style.bottom = '10px';
  button.style.right = '10px';
  button.style.zIndex = '9999';
  button.style.backgroundColor = '#f44336';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.padding = '8px 16px';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
  
  button.onclick = async () => {
    button.textContent = 'Fixing...';
    button.disabled = true;
    
    try {
      const result = await testUpdateAttributes();
      if (result) {
        button.textContent = 'Fixed! ✓';
        button.style.backgroundColor = '#4caf50';
      } else {
        button.textContent = 'Failed! Try Again';
        button.style.backgroundColor = '#ff9800';
        button.disabled = false;
      }
    } catch (error) {
      console.error('Fix error:', error);
      button.textContent = 'Error! Try Again';
      button.style.backgroundColor = '#ff9800';
      button.disabled = false;
    }
    
    // Reset after 5 seconds
    setTimeout(() => {
      button.textContent = 'Fix Cognito Attributes';
      button.style.backgroundColor = '#f44336';
      button.disabled = false;
    }, 5000);
  };
  
  document.body.appendChild(button);
  return button;
}

// Function to initialize debug tools in client code
export function initCognitoDebug() {
  if (typeof window !== 'undefined') {
    // Expose debug functions globally
    window.debugCognito = {
      testUpdateAttributes,
      diagnoseCognitoIssues,
      addFixButton: addDebugFixButton
    };
    
    // Automatically add the debug button in development
    if (process.env.NODE_ENV === 'development') {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addDebugFixButton);
      } else {
        addDebugFixButton();
      }
    }
  }
} 