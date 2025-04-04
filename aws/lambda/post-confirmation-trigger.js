/**
 * AWS Lambda function for Cognito Post Confirmation Trigger
 * This function is triggered after a user confirms their email address
 * and creates the corresponding user record in the backend database.
 */

// Import AWS SDK for fetching backend URL from parameter store if needed
const https = require('https');
const http = require('http');
const url = require('url');

// Get backend API URL from environment variables with fallback options
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8000';

/**
 * Makes an HTTP/HTTPS request to the backend API
 * @param {String} requestUrl - Full URL to make the request to
 * @param {String} method - HTTP method (GET, POST, etc.)
 * @param {Object} data - Request payload
 * @param {Number} retryCount - Current retry attempt
 * @returns {Promise<Object>} - Response data
 */
function makeHttpRequest(requestUrl, method, data, retryCount = 0) {
  return new Promise((resolve, reject) => {
    // Parse the URL to determine if it's HTTP or HTTPS
    const parsedUrl = url.parse(requestUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Lambda-Source': 'post-confirmation',
        'User-Agent': 'AWS-Lambda/Cognito-PostConfirmation'
      },
      timeout: 5000 // 5 second timeout
    };

    console.log(`[REQUEST] Making ${method} request to ${requestUrl}`);
    
    const req = protocol.request(options, (res) => {
      let responseBody = '';
      
      // Log the status code for debugging
      console.log(`[RESPONSE] Status Code: ${res.statusCode}`);
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        console.log(`[RESPONSE BODY] ${responseBody.substring(0, 500)}${responseBody.length > 500 ? '...(truncated)' : ''}`);
        
        // Check if response is successful
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = JSON.parse(responseBody);
            resolve(parsedData);
          } catch (error) {
            console.log('[ERROR] Failed to parse response body:', error);
            resolve({ success: false, body: responseBody });
          }
        } else {
          console.log(`[ERROR] Request failed with status code ${res.statusCode}`);
          
          // Retry logic for server errors or temporary issues
          if ((res.statusCode >= 500 || res.statusCode === 429) && retryCount < 2) {
            const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            console.log(`[RETRY] Will retry in ${retryDelay}ms (attempt ${retryCount + 1}/3)`);
            
            setTimeout(() => {
              makeHttpRequest(requestUrl, method, data, retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, retryDelay);
          } else {
            // Don't reject - we want to continue the Cognito flow regardless
            resolve({ 
              success: false, 
              error: `Request failed with status ${res.statusCode}`,
              body: responseBody
            });
          }
        }
      });
    });
    
    // Handle request errors
    req.on('error', (error) => {
      console.log('[ERROR] Request error:', error);
      
      // Retry network errors
      if (retryCount < 2) {
        const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`[RETRY] Will retry in ${retryDelay}ms (attempt ${retryCount + 1}/3)`);
        
        setTimeout(() => {
          makeHttpRequest(requestUrl, method, data, retryCount + 1)
            .then(resolve)
            .catch(reject);
        }, retryDelay);
      } else {
        // Don't reject - we want to continue the Cognito flow regardless
        resolve({ 
          success: false, 
          error: `Network error: ${error.message}`
        });
      }
    });
    
    // Send the request data
    if (data) {
      const stringData = JSON.stringify(data);
      console.log(`[REQUEST BODY] ${stringData.substring(0, 500)}${stringData.length > 500 ? '...(truncated)' : ''}`);
      req.write(stringData);
    }
    
    req.end();
  });
}

/**
 * Lambda handler function
 * @param {Object} event - The event object from Cognito
 * @param {Object} context - The context object
 * @param {Function} callback - Callback function
 */
exports.handler = async (event, context, callback) => {
  console.log('Cognito Post Confirmation event:', JSON.stringify(event, null, 2));
  
  // Extract user attributes from the event
  const { userName, request } = event;
  const { userAttributes } = request;
  
  try {
    // Only process events for sign-up confirmation
    if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
      console.log(`[INFO] Not processing event with trigger source: ${event.triggerSource}`);
      return event;
    }
    
    // Check for required data
    if (!userAttributes.email || !userAttributes.sub) {
      console.log('[ERROR] Missing required user attributes:', { email: userAttributes.email, cognitoId: userAttributes.sub });
      // Still return the event to complete the Cognito flow, but log the error
      return event;
    }
    
    // Prepare the payload for our backend API
    const payload = {
      email: userAttributes.email,
      cognitoId: userAttributes.sub,
      userRole: userAttributes['custom:role'] || 'OWNER', // Default to OWNER role
      firstName: userAttributes.given_name || '',
      lastName: userAttributes.family_name || '',
      business_id: userAttributes['custom:business_id'] || '',
      business_name: userAttributes['custom:business_name'] || '',
      is_already_verified: true // Mark as already verified
    };
    
    // API endpoint for user creation
    const apiEndpoint = `${BACKEND_API_URL}/api/auth/signup`;
    
    console.log('[INFO] Sending user data to backend:', { 
      email: userAttributes.email,
      cognitoId: userAttributes.sub,
      apiEndpoint
    });
    
    try {
      // Make the request to our backend but don't throw on error
      const response = await makeHttpRequest(apiEndpoint, 'POST', payload);
      
      if (response.success === false) {
        console.log('[WARNING] Backend user creation returned an error, but proceeding with Cognito flow');
      } else {
        console.log('[SUCCESS] Backend API response:', response);
      }
    } catch (apiError) {
      // Log the error but don't throw - we want to complete the Cognito flow regardless
      console.log('[ERROR] Backend API request failed:', apiError);
      console.log('[INFO] Continuing Cognito flow despite backend error');
    }
    
    // Always return the event to complete the Cognito flow even if our API failed
    return event;
  } catch (error) {
    // Log the error but don't throw - we want to complete the Cognito flow regardless
    console.log('[CRITICAL ERROR] Error in Lambda execution:', error);
    console.log('[INFO] Continuing Cognito flow despite critical error');
    
    // Always return the event to complete the Cognito flow
    return event;
  }
}; 