/**
 * Auth0 Action: Add Email Claim to All Token Types
 * 
 * This action adds the email claim to both standard JWT and JWE (encrypted) tokens.
 * It supports different token formats and ensures email is consistently available.
 * 
 * To implement this in Auth0:
 * 1. Go to Auth0 Dashboard > Actions > Flows
 * 2. Select the "Login" flow
 * 3. Click "+" to add a new action, choose "Build Custom"
 * 4. Name it "Add Email to All Token Types"
 * 5. Copy-paste this entire code
 * 6. Deploy the action and add it to your Login flow
 */

/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
  console.log('Executing "Add Email to All Token Types" action');
  
  // Skip if no authorization context
  if (!event.authorization) {
    console.log('No authorization context, skipping token modification');
    return;
  }
  
  try {
    // Get user email from event
    const userEmail = event.user.email;
    
    if (!userEmail) {
      console.log('No email found in user profile, skipping token modification');
      return;
    }
    
    // Add to access token
    api.accessToken.setCustomClaim('email', userEmail);
    
    // Add to ID token as well for consistency
    api.idToken.setCustomClaim('email', userEmail);
    
    // Also add as namespaced claim (Auth0 recommended approach)
    api.accessToken.setCustomClaim('https://api.dottapps.com/email', userEmail);
    api.idToken.setCustomClaim('https://api.dottapps.com/email', userEmail);
    
    console.log(`Successfully added email claim (${userEmail}) to all token types`);
  } catch (error) {
    console.error('Error setting email claim:', error.message);
  }
};

/**
 * Handler that will be invoked when this action is resuming after an external redirect.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onContinuePostLogin = async (event, api) => {
  // Not needed for this action
};
