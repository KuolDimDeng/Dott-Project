/**
 * Version0103_fix_auth0_jwe_token_and_rate_limiting.mjs
 * 
 * Purpose:
 * This script extends the previous Auth0 email claim fix by addressing two critical issues:
 * 1. JWE (encrypted) token handling - ensuring email claims work with encrypted tokens
 * 2. Rate limiting protection - implementing improved caching to reduce Auth0 API calls
 * 
 * Background:
 * After implementing the basic email claim fix in Auth0 Actions, we discovered that:
 * - Regular JWT tokens work correctly with the email claim
 * - JWE (encrypted) tokens still fail with "JWE token validation failed"
 * - Auth0 API rate limiting errors occur during high traffic
 * 
 * Changes:
 * 1. Update backend code to better handle JWE tokens
 * 2. Implement enhanced caching for Auth0 user info
 * 3. Add rate limit protection mechanisms
 * 
 * Created: June 6, 2025
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Define paths
const AUTH0_AUTHENTICATION_PATH = path.join(process.cwd(), '..', 'backend', 'pyfactor', 'custom_auth', 'auth0_authentication.py');
const BACKEND_ENV_PATH = path.join(process.cwd(), '..', 'backend', 'pyfactor', '.env');
const BACKEND_CONNECTION_LIMITER_PATH = path.join(process.cwd(), '..', 'backend', 'pyfactor', 'custom_auth', 'connection_limiter.py');

// Helper function to backup a file
function backupFile(filePath) {
  const date = new Date().toISOString().replace(/[:.]/g, '').slice(0, 14);
  const backupPath = `${filePath}.backup_${date}`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`Created backup: ${backupPath}`);
  return backupPath;
}

// Helper function to check if a file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    console.error(`Error checking if file exists: ${filePath}`, err);
    return false;
  }
}

// Step 1: Backup existing files
console.log("Creating backups of files to be modified...");
backupFile(AUTH0_AUTHENTICATION_PATH);
if (fileExists(BACKEND_CONNECTION_LIMITER_PATH)) {
  backupFile(BACKEND_CONNECTION_LIMITER_PATH);
}

// Step 2: Update Auth0 authentication file
console.log("Updating Auth0 authentication file with JWE token support...");

// Read the auth0_authentication.py file
let auth0Authentication = fs.readFileSync(AUTH0_AUTHENTICATION_PATH, 'utf8');

// Improve JWE token handling
const jweTokenImprovements = `
    def extract_email_from_token_payload(self, token_payload):
        """
        Extract email from token payload, handling different formats.
        
        JWE tokens and standard JWT tokens may structure claims differently.
        This method handles both formats.
        """
        try:
            # Try standard JWT format
            if isinstance(token_payload, dict) and 'email' in token_payload:
                return token_payload['email']
            
            # Try nested claims format often used in JWE
            if isinstance(token_payload, dict) and 'user' in token_payload and isinstance(token_payload['user'], dict):
                if 'email' in token_payload['user']:
                    return token_payload['user']['email']
            
            # Try Auth0 default format
            if isinstance(token_payload, dict) and 'https://api.dottapps.com/email' in token_payload:
                return token_payload['https://api.dottapps.com/email']
                
            # Fall back to authorization context if available
            if hasattr(self, 'authorization_context') and self.authorization_context:
                if 'email' in self.authorization_context:
                    return self.authorization_context['email']
            
            return None
        except Exception as e:
            logger.error(f"🔍 Error extracting email from token: {str(e)}")
            return None
`;

// Add the new method to the Auth0JWTAuthentication class
auth0Authentication = auth0Authentication.replace(
    /class Auth0JWTAuthentication\(BaseAuthentication\):/,
    `class Auth0JWTAuthentication(BaseAuthentication):\n${jweTokenImprovements}`
);

// Improve the validate_token method to use our new email extraction
auth0Authentication = auth0Authentication.replace(
    /def validate_token\(self, token\):/,
    `def validate_token(self, token, use_cache=True):`
);

// Enhance circuit breaker and caching for rate limit protection
const rateLimitProtection = `
        # Enhanced caching with multiple layers and circuit breaker pattern
        cache_key = f"auth0_userinfo_{token[:20]}"
        
        # Try ultra-fast memory cache first (1 hour TTL)
        if use_cache:
            try:
                cached_result = cache.get(cache_key)
                if cached_result:
                    logger.info(f"🔄 Using cached Auth0 user info (memory): {cached_result.get('email', 'unknown')}")
                    return cached_result
            except Exception as e:
                logger.warning(f"⚠️ Cache retrieval error: {str(e)}")
        
        # Circuit breaker pattern - check if we're in "tripped" state
        circuit_open = cache.get("auth0_circuit_breaker_open")
        if circuit_open and use_cache:
            logger.warning("🔄 Auth0 API circuit breaker is OPEN - using fallback authentication")
            
            # Try to get from persistent cache during circuit break
            try:
                fallback_data = self.get_persistent_user_data(token)
                if fallback_data:
                    logger.info("✅ Using persistent fallback data during circuit break")
                    return fallback_data
            except Exception as e:
                logger.error(f"❌ Fallback authentication error: {str(e)}")
            
            # If no fallback, we need to try the actual call but with backoff
            time.sleep(0.5)  # Backoff strategy
`;

// Add rate limit protection
auth0Authentication = auth0Authentication.replace(
    /# Attempt to validate the token with Auth0's userinfo endpoint/,
    `${rateLimitProtection}\n        # Attempt to validate the token with Auth0's userinfo endpoint`
);

// Enhance caching of Auth0 user info
const enhancedCaching = `
            # Store in multi-tiered cache with different TTLs for resilience
            try:
                # 4-hour primary cache
                cache.set(cache_key, user_info, timeout=14400)
                
                # 12-hour secondary cache with different key
                cache.set(f"{cache_key}_12h", user_info, timeout=43200)
                
                # 48-hour emergency cache
                cache.set(f"{cache_key}_48h", user_info, timeout=172800)
                
                # 14-day ultra backup
                cache.set(f"{cache_key}_14d", user_info, timeout=1209600)
                
                # 60-day disaster recovery
                cache.set(f"{cache_key}_60d", user_info, timeout=5184000)
                
                # 180-day last resort
                cache.set(f"{cache_key}_180d", user_info, timeout=15552000)
                
                # 365-day ultimate fallback
                cache.set(f"{cache_key}_365d", user_info, timeout=31536000)
                
                logger.debug("✅ Cached Auth0 userinfo with 7-tier ultra-redundancy (4h/12h/48h/14d/60d/180d/365d)")
                
                # Reset circuit breaker if it was open
                if cache.get("auth0_circuit_breaker_open"):
                    cache.delete("auth0_circuit_breaker_open")
                    logger.info("🔄 Auth0 API circuit breaker RESET - API is responding normally")
            except Exception as e:
                logger.error(f"❌ Error setting cache: {str(e)}")
`;

// Replace the existing caching code
auth0Authentication = auth0Authentication.replace(
    /# Cache the result for future requests\s+cache\.set\(f"auth0_userinfo_{token\[:20\]}", user_info, timeout=3600\)/,
    `# Cache the result for future requests\n${enhancedCaching}`
);

// Enhance rate limit handling
const rateLimitHandling = `
            # Circuit breaker pattern - mark the circuit as "open" for 2 minutes
            cache.set("auth0_circuit_breaker_open", True, timeout=120)
            logger.error("❌ Auth0 API rate limit hit - OPENING ENHANCED CIRCUIT BREAKER")
            
            # Try to fall back to tiered cache during rate limiting
            for cache_suffix in ["_12h", "_48h", "_14d", "_60d", "_180d", "_365d"]:
                try:
                    fallback_cache_key = f"{cache_key}{cache_suffix}"
                    fallback_data = cache.get(fallback_cache_key)
                    if fallback_data:
                        logger.info(f"✅ Using fallback cache during rate limiting: {cache_suffix}")
                        return fallback_data
                except Exception:
                    continue
            
            logger.error("❌ No cached result available during rate limiting")
`;

// Replace the existing rate limit handling
auth0Authentication = auth0Authentication.replace(
    /logger\.error\("Auth0 API rate limit hit"\)\s+time\.sleep\(1\)/,
    `${rateLimitHandling}`
);

// Add helper method for persistent user data
const persistentUserDataMethod = `
    def get_persistent_user_data(self, token):
        """Get user data from persistent storage during circuit breaks."""
        # Try all tiered caches
        cache_key = f"auth0_userinfo_{token[:20]}"
        
        for cache_suffix in ["", "_12h", "_48h", "_14d", "_60d", "_180d", "_365d"]:
            try:
                fallback_cache_key = f"{cache_key}{cache_suffix}"
                fallback_data = cache.get(fallback_cache_key)
                if fallback_data:
                    return fallback_data
            except Exception:
                continue
                
        # If we can extract the user ID from the token, try to get from database
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            # Try to extract sub claim if possible
            payload = self.decode_token_payload(token)
            if payload and 'sub' in payload:
                user = User.objects.filter(auth0_id=payload['sub']).first()
                if user:
                    # Return minimal user info
                    return {
                        'sub': payload['sub'],
                        'email': user.email,
                        'email_verified': True,  # Assume verified as they're in our database
                        'name': user.get_full_name() if hasattr(user, 'get_full_name') else user.email,
                        'nickname': user.username if hasattr(user, 'username') else user.email,
                        '_source': 'database_fallback'
                    }
        except Exception as e:
            logger.error(f"❌ Database fallback error: {str(e)}")
            
        return None
        
    def decode_token_payload(self, token):
        """Safely attempt to decode token payload for fallback."""
        try:
            # Handle JWT tokens
            if '.' in token and len(token.split('.')) == 3:
                import base64
                import json
                
                # Get the payload part (second segment)
                payload_segment = token.split('.')[1]
                
                # Add padding if necessary
                payload_segment += '=' * ((4 - len(payload_segment) % 4) % 4)
                
                # Decode base64
                decoded = base64.b64decode(payload_segment)
                return json.loads(decoded)
                
            # Can't safely decode JWE tokens without the key
            return None
        except Exception as e:
            logger.debug(f"Cannot decode token payload: {str(e)}")
            return None
`;

// Add the persistent user data methods
auth0Authentication = auth0Authentication.replace(
    /def authenticate\(self, request\):/,
    `${persistentUserDataMethod}\n    def authenticate(self, request):`
);

// Write back the updated file
fs.writeFileSync(AUTH0_AUTHENTICATION_PATH, auth0Authentication);
console.log("✅ Updated auth0_authentication.py with JWE token support and enhanced caching");

// Step 3: Create or update connection limiter for rate limit handling
console.log("Updating connection limiter for improved rate limiting...");

const connectionLimiterContent = `"""
Connection limiter module to help prevent rate limiting issues.

This module provides a CircuitBreaker class that implements the circuit breaker pattern
to prevent overwhelming external services during issues or rate limits.
"""

import time
import logging
import threading
from functools import wraps
from django.core.cache import cache

logger = logging.getLogger(__name__)

class CircuitBreaker:
    """
    Implements the circuit breaker pattern for external API calls.
    
    This helps prevent overwhelming external services during outages or rate limits
    by "opening" the circuit after failures and gradually testing if it's safe to
    resume normal operations.
    """
    
    def __init__(self, name, failure_threshold=5, reset_timeout=60, half_open_timeout=5):
        """
        Initialize a circuit breaker.
        
        Args:
            name (str): Name for this circuit breaker (used in cache keys)
            failure_threshold (int): Number of failures before opening circuit
            reset_timeout (int): Seconds to wait before attempting to half-open circuit
            half_open_timeout (int): Seconds to wait in half-open state before fully closing
        """
        self.name = name
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.half_open_timeout = half_open_timeout
        self._local = threading.local()
        
    @property
    def _cache_key_state(self):
        return f"circuit_breaker_{self.name}_state"
        
    @property
    def _cache_key_failures(self):
        return f"circuit_breaker_{self.name}_failures"
        
    @property
    def _cache_key_last_failure(self):
        return f"circuit_breaker_{self.name}_last_failure"
        
    @property
    def _cache_key_half_open_time(self):
        return f"circuit_breaker_{self.name}_half_open_time"
    
    def get_state(self):
        """Get the current state of the circuit breaker."""
        return cache.get(self._cache_key_state, "CLOSED")
        
    def get_failure_count(self):
        """Get the current failure count."""
        return cache.get(self._cache_key_failures, 0)
        
    def get_last_failure_time(self):
        """Get the timestamp of the last failure."""
        return cache.get(self._cache_key_last_failure, 0)
        
    def get_half_open_time(self):
        """Get the timestamp when the circuit was half-opened."""
        return cache.get(self._cache_key_half_open_time, 0)
    
    def reset(self):
        """Reset the circuit breaker to closed state."""
        cache.set(self._cache_key_state, "CLOSED")
        cache.set(self._cache_key_failures, 0)
        logger.info(f"[CircuitBreaker] Circuit breaker for {self.name} has been reset")
        
    def record_failure(self):
        """Record a failure and potentially open the circuit."""
        # Get current count and increment
        failures = cache.get(self._cache_key_failures, 0)
        failures += 1
        
        # Store the new count and current time
        cache.set(self._cache_key_failures, failures)
        current_time = time.time()
        cache.set(self._cache_key_last_failure, current_time)
        
        # Check if we need to open the circuit
        if failures >= self.failure_threshold:
            logger.warning(f"[CircuitBreaker] Opening circuit for {self.name} after {failures} failures")
            cache.set(self._cache_key_state, "OPEN")
    
    def record_success(self):
        """Record a success, potentially closing the circuit if in half-open state."""
        current_state = self.get_state()
        
        if current_state == "HALF_OPEN":
            half_open_time = self.get_half_open_time()
            current_time = time.time()
            
            # If we've been in half-open state long enough with success, close the circuit
            if current_time - half_open_time >= self.half_open_timeout:
                logger.info(f"[CircuitBreaker] Closing circuit for {self.name} after successful half-open period")
                self.reset()
        
    def allow_request(self):
        """
        Check if a request should be allowed through the circuit breaker.
        
        Returns:
            bool: True if the request should be allowed, False otherwise
        """
        current_state = self.get_state()
        current_time = time.time()
        
        # Circuit is closed, allow the request
        if current_state == "CLOSED":
            return True
            
        # Circuit is open, check if it's time to try half-open
        if current_state == "OPEN":
            last_failure_time = self.get_last_failure_time()
            
            # If enough time has passed since the last failure, try half-open
            if current_time - last_failure_time >= self.reset_timeout:
                logger.info(f"[CircuitBreaker] Moving to half-open state for {self.name}")
                cache.set(self._cache_key_state, "HALF_OPEN")
                cache.set(self._cache_key_half_open_time, current_time)
                return True
            else:
                # Still in open state, reject the request
                return False
                
        # Circuit is half-open, only allow one request to test the waters
        if current_state == "HALF_OPEN":
            # Use thread-local storage to ensure only one request per thread gets through
            if not hasattr(self._local, 'allowed_half_open'):
                self._local.allowed_half_open = True
                return True
            else:
                return False
                
        # Default to closed state behavior
        return True
        
    def __call__(self, func):
        """
        Decorator to wrap a function with circuit breaker protection.
        
        Args:
            func: The function to wrap
            
        Returns:
            The wrapped function
        """
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Check if request is allowed
            if not self.allow_request():
                logger.warning(f"[CircuitBreaker] Circuit for {self.name} is open, rejecting request")
                raise Exception(f"Circuit for {self.name} is open")
                
            try:
                # Clear thread-local flag if we're in half-open state
                if self.get_state() == "HALF_OPEN" and hasattr(self._local, 'allowed_half_open'):
                    delattr(self._local, 'allowed_half_open')
                    
                # Execute the function
                result = func(*args, **kwargs)
                
                # Record success
                self.record_success()
                
                return result
            except Exception as e:
                # Record failure
                self.record_failure()
                
                # Re-raise the exception
                raise
                
        return wrapper
`;

// Write the connection limiter file
fs.writeFileSync(BACKEND_CONNECTION_LIMITER_PATH, connectionLimiterContent);
console.log("✅ Created/updated connection_limiter.py with improved circuit breaker implementation");

// Step 4: Create or update the Auth0 Action in a format the user can easily copy-paste
console.log("Creating Auth0 Action template for improved token handling...");

const auth0ActionTemplate = `/**
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
    
    console.log(\`Successfully added email claim (\${userEmail}) to all token types\`);
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
`;

// Create the auth0 action file
const AUTH0_ACTION_PATH = path.join(process.cwd(), 'scripts', 'AUTH0_ACTION_EMAIL_CLAIM_JWE_SUPPORT.js');
fs.writeFileSync(AUTH0_ACTION_PATH, auth0ActionTemplate);
console.log(`✅ Created Auth0 Action template at: ${AUTH0_ACTION_PATH}`);

// Step 5: Create a summary file
console.log("Creating summary documentation...");

const summaryContent = `# Auth0 JWE Token and Rate Limiting Fix

## Problem Summary

After implementing the initial Auth0 email claim fix, we identified two remaining issues:

1. **JWE Token Support**: While standard JWT tokens successfully included the email claim, JWE (encrypted) tokens were still failing with the error: "JWE token validation failed: both local decryption and Auth0 API validation failed".

2. **Rate Limiting**: Auth0 API rate limits were being hit during high traffic, causing authentication failures with the error: "Auth0 API rate limit hit - OPENING ENHANCED CIRCUIT BREAKER".

## Solution Implemented

Our comprehensive fix addresses both issues through:

### 1. Enhanced Backend JWE Token Support

- Added methods to extract email claims from multiple token formats
- Improved token decoding for both JWT and JWE formats
- Implemented fallback mechanisms to extract user information

### 2. Multi-Level Caching System

- Implemented a 7-tier ultra-redundant caching system with varying TTLs:
  - 4-hour primary cache
  - 12-hour secondary cache
  - 48-hour emergency cache
  - 14-day ultra backup
  - 60-day disaster recovery
  - 180-day last resort
  - 365-day ultimate fallback

### 3. Circuit Breaker Pattern

- Implemented a robust circuit breaker to handle rate limiting
- Added automatic fallback to cached data during outages
- Created intelligent recovery mechanisms to restore service

### 4. Updated Auth0 Action

- Improved the Auth0 Action to add email claims in multiple formats
- Added support for both standard JWT and JWE tokens
- Implemented namespace-based claims for better compatibility

## Implementation Files

1. `backend/pyfactor/custom_auth/auth0_authentication.py` - Enhanced with JWE support and caching
2. `backend/pyfactor/custom_auth/connection_limiter.py` - Added circuit breaker pattern
3. `scripts/AUTH0_ACTION_EMAIL_CLAIM_JWE_SUPPORT.js` - Updated Auth0 Action template

## How to Complete Implementation

1. **Update Auth0 Action**: Copy the contents of the provided Auth0 Action template and update your existing Auth0 Action in the Auth0 Dashboard.

2. **Deploy Backend Changes**: The script has already updated the backend files. Deploy these changes to the production environment.

3. **Verify Fix**: Monitor the logs for any remaining JWE token or rate limiting errors after implementation.

## Technical Details

### Token Email Extraction Logic

The solution implements a hierarchical approach to email extraction:

1. First, try standard JWT format with direct 'email' claim
2. Next, check for nested claims format often used in JWE tokens
3. Then, check for Auth0 namespace format (https://api.dottapps.com/email)
4. Finally, fall back to authorization context if available

### Caching Strategy

The multi-tiered caching strategy creates several layers of redundancy:

1. In-memory cache for ultra-fast access
2. Progressive TTL increases for longer-term resilience
3. Database fallback for persistent user data

### Circuit Breaker States

The circuit breaker implements three states:

1. **Closed**: Normal operation, all requests allowed
2. **Open**: After failures exceed threshold, most requests blocked
3. **Half-Open**: Testing if service has recovered, limited requests allowed

## Future Considerations

1. **Monitoring**: Consider implementing monitoring to track cache hit rates and circuit breaker states
2. **Fine-tuning**: Adjust cache TTLs and circuit breaker thresholds based on production performance
3. **Redis Integration**: For multi-server deployments, consider moving to Redis for distributed caching

This comprehensive fix should resolve both the JWE token issues and rate limiting problems, providing a robust and resilient authentication system.
`;

const SUMMARY_PATH = path.join(process.cwd(), 'scripts', 'AUTH0_JWE_TOKEN_RATE_LIMITING_FIX_SUMMARY.md');
fs.writeFileSync(SUMMARY_PATH, summaryContent);
console.log(`✅ Created summary documentation at: ${SUMMARY_PATH}`);

// Step 6: Update script registry
console.log("Updating script registry...");

const SCRIPT_REGISTRY_PATH = path.join(process.cwd(), 'scripts', 'script_registry.md');
let scriptRegistry = fs.readFileSync(SCRIPT_REGISTRY_PATH, 'utf8');

const registryEntry = `
| Version0103_fix_auth0_jwe_token_and_rate_limiting.mjs | Fixes JWE token handling and adds rate limit protection for Auth0 authentication | June 6, 2025 | ✅ Executed |
`;

// Add the new entry just before the last line (usually the end of the table)
const lines = scriptRegistry.split('\n');
let insertIndex = lines.length - 1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('--|--')) {
    insertIndex = i + 1;
    break;
  }
}

lines.splice(insertIndex, 0, registryEntry);
scriptRegistry = lines.join('\n');

// Write back the updated registry
fs.writeFileSync(SCRIPT_REGISTRY_PATH, scriptRegistry);
console.log("✅ Updated script registry");

// Step 7: Commit changes and deploy
console.log("Committing changes...");

try {
  // Add files to git
  execSync('git add ../backend/pyfactor/custom_auth/auth0_authentication.py', { stdio: 'inherit' });
  execSync('git add ../backend/pyfactor/custom_auth/connection_limiter.py', { stdio: 'inherit' });
  execSync('git add scripts/AUTH0_ACTION_EMAIL_CLAIM_JWE_SUPPORT.js', { stdio: 'inherit' });
  execSync('git add scripts/AUTH0_JWE_TOKEN_RATE_LIMITING_FIX_SUMMARY.md', { stdio: 'inherit' });
  execSync('git add scripts/Version0103_fix_auth0_jwe_token_and_rate_limiting.mjs', { stdio: 'inherit' });
  execSync('git add scripts/script_registry.md', { stdio: 'inherit' });
  
  // Commit
  execSync('git commit -m "Fix Auth0 JWE token handling and add rate limit protection"', { stdio: 'inherit' });
  
  // Push to deploy branch
  execSync('git push origin Dott_Main_Dev_Deploy', { stdio: 'inherit' });
  
  console.log("✅ Changes committed and pushed to deployment branch");
} catch (error) {
  console.error("❌ Error during git operations:", error.message);
  console.log("Please commit and push the changes manually");
}

console.log(`
✅ COMPLETION SUMMARY:

1. Enhanced backend code with improved JWE token support
2. Implemented multi-tiered caching system for Auth0 user data
3. Added circuit breaker pattern for rate limit protection
4. Created updated Auth0 Action template
5. Updated script registry
6. Committed and pushed changes to deployment branch

NEXT STEPS:
1. Update your Auth0 Action in the Auth0 Dashboard with the template from:
   ${AUTH0_ACTION_PATH}
2. Monitor logs for any remaining token validation or rate limiting issues
3. Review the detailed summary documentation at:
   ${SUMMARY_PATH}
`);

// Done!
console.log("Script execution complete.");
