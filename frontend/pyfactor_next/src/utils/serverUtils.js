// This file is server-side only - do not import in client components
import { cookies, headers } from 'next/headers';
import { logger } from './serverLogger';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

export async function validateServerSession(providedTokens) {
  try {
    let accessToken, idToken;
    let onboardingStep, onboardedStatus, tenantId;
    
    if (providedTokens?.accessToken && providedTokens?.idToken) {
      // Use provided tokens if available
      accessToken = providedTokens.accessToken;
      idToken = providedTokens.idToken;
      logger.debug('[ServerUtils] Using provided tokens');
    } else {
      // First try to get tokens from the request headers
      logger.debug('[ServerUtils] Looking for tokens in request headers');
      
      try {
        const headersList = await headers();
        const authHeader = await headersList.get('authorization') || await headersList.get('Authorization');
        const idTokenHeader = await headersList.get('x-id-token') || await headersList.get('X-Id-Token');
        const tenantIdHeader = await headersList.get('x-tenant-id') || await headersList.get('X-Tenant-ID');
        
        // Extract tokens from Authorization header (Bearer token)
        if (authHeader && authHeader.startsWith('Bearer ')) {
          accessToken = authHeader.substring(7);
          logger.debug('[ServerUtils] Found access token in Authorization header');
        }
        
        // Get ID token from header
        if (idTokenHeader) {
          idToken = idTokenHeader;
          logger.debug('[ServerUtils] Found ID token in X-Id-Token header');
        }
        
        // Get tenant ID from header
        if (tenantIdHeader) {
          tenantId = tenantIdHeader;
          logger.debug('[ServerUtils] Found tenant ID in X-Tenant-ID header');
        }
      } catch (headerError) {
        logger.error('[ServerUtils] Error extracting headers:', headerError);
      }

      // Fall back to cookies if no tokens in headers
      if (!accessToken || !idToken) {
        logger.debug('[ServerUtils] Tokens not found in headers, checking cookies as fallback');
        
        try {
          // Get cookies using the Next.js cookies() function
          const cookieStore = await cookies();
          const cookiesList = await cookieStore.getAll();
          const cookieObj = {};
          
          // Convert cookies to a more accessible format
          cookiesList.forEach(cookie => {
            cookieObj[cookie.name] = cookie.value;
          });
          
          // Extract values from cookies
          accessToken = accessToken || cookieObj['accessToken'];
          idToken = idToken || cookieObj['idToken'];
          onboardingStep = cookieObj['onboardingStep'];
          onboardedStatus = cookieObj['onboardedStatus'];
          tenantId = tenantId || cookieObj['tenantId'] || cookieObj['businessid'];
          
          // If standard tokens not found, look for Cognito format cookies
          if (!accessToken || !idToken) {
            logger.debug('[ServerUtils] Standard tokens not found, checking Cognito format');
            
            // Get Cognito client ID from env
            const cognitoClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || 
                                   process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID;
            
            if (cognitoClientId) {
              // Find the LastAuthUser
              const lastAuthUserKey = `CognitoIdentityServiceProvider.${cognitoClientId}.LastAuthUser`;
              const lastAuthUser = cookieObj[lastAuthUserKey];
              
              if (lastAuthUser) {
                logger.debug(`[ServerUtils] Found LastAuthUser: ${lastAuthUser}`);
                
                // Try to find access token and ID token
                Object.keys(cookieObj).forEach(key => {
                  if (key.includes(cognitoClientId) && key.includes(lastAuthUser)) {
                    if (key.endsWith('.accessToken')) {
                      accessToken = accessToken || cookieObj[key];
                      logger.debug('[ServerUtils] Found Cognito accessToken');
                    } else if (key.endsWith('.idToken')) {
                      idToken = idToken || cookieObj[key];
                      logger.debug('[ServerUtils] Found Cognito idToken');
                    }
                  }
                });
              }
            }
          }
          
          logger.debug('[ServerUtils] Using tokens from sources', {
            fromHeaders: {
              hasAccessToken: !!accessToken,
              hasIdToken: !!idToken,
              hasTenantId: !!tenantId
            },
            fromCookies: {
              hasAccessToken: !!cookieObj['accessToken'],
              hasIdToken: !!cookieObj['idToken'],
              hasTenantId: !!cookieObj['tenantId']
            },
            finalValues: {
              hasAccessToken: !!accessToken,
              hasIdToken: !!idToken,
              hasTenantId: !!tenantId
            }
          });
        } catch (cookieError) {
          logger.error('[ServerUtils] Error extracting cookies:', cookieError);
        }
      }
    }

    if (!accessToken || !idToken) {
      logger.warn('[ServerUtils] No valid session tokens found in headers, cookies or parameters');
      return { verified: false };
    }

    // Verify tokens
    const verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      tokenUse: 'access',
      clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
    });

    try {
      const verifiedToken = await verifier.verify(accessToken);
      logger.debug('[ServerUtils] Token verified successfully');
      
      // Extract user information from ID token
      const idTokenDecoded = parseJwt(idToken);
      const userId = idTokenDecoded?.sub;
      const email = idTokenDecoded?.email;
      const attributes = {};
      
      // Extract tenant ID from ID token if not already set
      if (!tenantId && idTokenDecoded) {
        // Try to get tenant ID from token claims
        const tokenTenantId = idTokenDecoded['custom:tenant_ID'] || 
                             idTokenDecoded['custom:businessid'] || 
                             idTokenDecoded['custom:tenantId'] || 
                             idTokenDecoded['custom:tenant_id'];
        
        if (tokenTenantId) {
          tenantId = tokenTenantId;
          logger.debug(`[ServerUtils] Found tenant ID in token claims: ${tenantId}`);
        }
      }
      
      // Extract custom attributes
      if (idTokenDecoded) {
        Object.keys(idTokenDecoded).forEach(key => {
          if (key.startsWith('custom:')) {
            attributes[key] = idTokenDecoded[key];
          }
        });
      }
      
      return {
        verified: true,
        username: verifiedToken.username || verifiedToken.sub,
        sub: verifiedToken.sub,
        userId: userId,
        email: email,
        tokens: {
          accessToken,
          idToken
        },
        user: {
          userId: userId,
          email: email,
          attributes: attributes || {}
        },
        onboardingStep,
        onboardedStatus,
        tenantId
      };
    } catch (verifyError) {
      logger.error('[ServerUtils] Token verification failed:', verifyError);
      // Return a structured response with tokens but failed verification flag
      // This way, clients can still use the tokens even if verification fails
      return { 
        verified: false, 
        error: verifyError.message,
        tokens: { accessToken, idToken },
        // Include partial user information from tokens to aid in debugging
        user: {
          attributes: {}
        }
      };
    }
  } catch (error) {
    logger.error('[ServerUtils] Session validation failed:', error);
    return { 
      verified: false, 
      error: error.message 
    };
  }
}

// Helper function to parse JWT token without validation
function parseJwt(token) {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (e) {
    logger.error('[ServerUtils] Failed to parse JWT token:', e);
    return null;
  }
}

export async function getServerUserFromToken(token) {
  try {
    if (!token) {
      logger.error('[ServerUtils] No token provided for user extraction');
      return null;
    }
    
    // Parse the token - this is simplified and NOT proper verification
    // For real security, use the verifier from validateServerSession
    function parseJwt(token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
        return JSON.parse(jsonPayload);
      } catch (e) {
        logger.error('[ServerUtils] Error parsing JWT:', e);
        return null;
      }
    }
    
    const decodedToken = parseJwt(token);
    if (!decodedToken) {
      return null;
    }
    
    const username = decodedToken.username || decodedToken['cognito:username'] || decodedToken.sub;
    const email = decodedToken.email || null;
    const sub = decodedToken.sub;
    
    // Extract custom attributes if they exist
    const customAttributes = {};
    Object.keys(decodedToken).forEach(key => {
      if (key.startsWith('custom:')) {
        const customKey = key.replace('custom:', '');
        customAttributes[customKey] = decodedToken[key];
      }
    });
    
    return {
      username,
      email,
      sub,
      ...customAttributes,
      _raw: decodedToken
    };
  } catch (error) {
    logger.error('[ServerUtils] Error getting user from token:', error);
    return null;
  }
}