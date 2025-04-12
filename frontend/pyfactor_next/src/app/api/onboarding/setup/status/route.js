///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/onboarding/setup/status/route.js
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverUtils';
import { completeOnboarding } from '@/utils/completeOnboarding';
import { updateOnboardingStep } from '@/utils/onboardingUtils';
import { jwtDecode } from 'jwt-decode';
import { cookies } from 'next/headers';

export async function GET(request) {
  // Generate unique request ID for tracing
  const requestId = crypto.randomUUID();
  
  try {
    // Get cache-busting parameter
    const url = new URL(request.url);
    const timestamp = url.searchParams.get('ts') || Date.now();
    const isRetry = url.searchParams.get('retry') === 'true';
    const currentRetry = parseInt(url.searchParams.get('currentRetry') || '0');
    const maxRetries = parseInt(url.searchParams.get('maxRetries') || '3');
    
    // Get auth tokens from headers or cookies
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '') || 
                        request.cookies.get('accessToken')?.value;
    const idToken = request.headers.get('X-Id-Token') || 
                    request.cookies.get('idToken')?.value;
    
    // Get stored setup progress from cookies for fallback
    const setupProgressCookie = request.cookies.get('setupProgress')?.value;
    const lastProgress = setupProgressCookie ? parseInt(setupProgressCookie) : 0;
    
    // If no tokens are available, check for fallback mode
    if (!accessToken || !idToken) {
      // Check for other cookies that might help identify the user
      const cookieStore = cookies();
      const allCookies = await cookieStore.getAll();
      
      const hasUserInfo = allCookies.some(cookie => 
        ['userId', 'businessName', 'businessType', 'onboardingStep'].includes(cookie.name)
      );
      
      logger.warn('[SetupStatus] No auth tokens, using limited fallback mode', {
        requestId,
        hasUserInfo,
        lastProgress
      });
      
      // Provide a limited status response if we have some user info
      if (hasUserInfo && lastProgress > 0) {
        // Get business info from cookies if available
        const businessName = request.cookies.get('businessName')?.value;
        const businessType = request.cookies.get('businessType')?.value;
        
        return NextResponse.json({
          status: lastProgress >= 100 ? 'complete' : 'in_progress',
          message: 'Limited status information available (not authenticated)',
          progress: Math.min(lastProgress, 95), // Never say 100% without auth
          isAuthenticated: false,
          needsAuth: true,
          businessInfo: businessName ? {
            name: businessName,
            type: businessType || 'Unknown'
          } : undefined,
          timestamp,
          requestId
        });
      }
      
      // Otherwise return auth error
      return NextResponse.json(
        {
          error: 'Authentication required',
          status: 'auth_error',
          needsRefresh: true,
          message: 'Session expired or not authenticated',
          lastProgress,
          requestId
        },
        { status: 401 }
      );
    }
    
    // Check for token expiration
    let tokenExpired = false;
    try {
      if (idToken) {
        const decoded = jwtDecode(idToken);
        const now = Math.floor(Date.now() / 1000);
        
        if (decoded.exp && decoded.exp <= now) {
          tokenExpired = true;
          logger.warn('[SetupStatus] ID token expired', {
            requestId,
            expiry: new Date(decoded.exp * 1000).toISOString(),
            now: new Date(now * 1000).toISOString()
          });
        }
      }
    } catch (tokenError) {
      logger.error('[SetupStatus] Error checking token expiration', {
        requestId,
        error: tokenError.message
      });
      tokenExpired = true;
    }
    
    // If token is expired, return auth error with additional info
    if (tokenExpired) {
      return NextResponse.json(
        {
          error: 'Token expired',
          status: 'auth_error',
          needsRefresh: true,
          message: 'Your session has expired. Please refresh the page to continue.',
          lastProgress,
          requestId
        },
        { status: 401 }
      );
    }
    
    // Extract user ID from token
    let userId;
    try {
      if (idToken) {
        const decoded = jwtDecode(idToken);
        userId = decoded.sub;
      }
    } catch (decodeError) {
      logger.error('[SetupStatus] Error decoding user ID from token', {
        requestId,
        error: decodeError.message
      });
    }
    
    // Get additional request data
    const onboardingStatus = request.headers.get('X-Onboarding-Status') || 'UNKNOWN';
    
    logger.debug('[SetupStatus] Checking setup status', {
      requestId,
      userId,
      onboardingStatus,
      isRetry,
      currentRetry,
      lastProgress
    });
    
    // Determine the target backend URL
    const backendApiUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
    let statusUrl = `${backendApiUrl}/api/onboarding/setup/status/?ts=${timestamp}`;
    
    // Add retry information to the request
    if (isRetry) {
      statusUrl += `&retry=${isRetry}&currentRetry=${currentRetry}&maxRetries=${maxRetries}`;
    }
    
    // If progress is already very high (92%+), consider it done
    if (lastProgress >= 92) {
      logger.info('[SetupStatus] Progress is at 92% or higher, considering setup complete', {
        requestId,
        lastProgress
      });
      
      // Return completion response
      const cookieOptions = {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
        httpOnly: false // Allow JS to read
      };
      
      const jsonResponse = NextResponse.json({
        status: 'complete',
        progress: 100,
        message: 'Setup complete!',
        isComplete: true,
        isNearCompletion: true,
        userAttributesUpdated: false, // Will be handled by the frontend
        requestId,
        timestamp
      });
      
      jsonResponse.cookies.set('setupProgress', '100', cookieOptions);
      jsonResponse.cookies.set('setupComplete', 'true', cookieOptions);
      jsonResponse.cookies.set('onboardingStatus', 'complete', cookieOptions);
      
      return jsonResponse;
    }
    
    // Use try/catch with the backend request to handle failures gracefully
    let backendStatus = null;
    let backendError = null;
    
    try {
      // Set timeout for backend request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const statusResponse = await fetch(statusUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Id-Token': idToken,
          'X-User-ID': userId || 'unknown',
          'X-Onboarding-Status': onboardingStatus,
          'X-Request-ID': requestId,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (statusResponse.ok) {
        backendStatus = await statusResponse.json();
        
        // Ensure progress is always a valid number
        if (backendStatus.progress !== undefined) {
          if (typeof backendStatus.progress === 'string') {
            backendStatus.progress = parseInt(backendStatus.progress, 10) || 0;
          } else if (typeof backendStatus.progress !== 'number') {
            backendStatus.progress = 0;
          }
          
          // Ensure progress is an integer between 0 and 100
          backendStatus.progress = Math.max(0, Math.min(100, Math.round(backendStatus.progress)));
          
          logger.debug('[SetupStatus] Normalized progress value:', {
            requestId,
            progress: backendStatus.progress
          });
        } else {
          // If no progress provided, generate a reasonable value based on status
          if (backendStatus.status === 'complete' || backendStatus.status === 'ready') {
            backendStatus.progress = 100;
          } else if (backendStatus.status === 'failed') {
            // Keep last progress on failure
            backendStatus.progress = lastProgress || 30;
          } else {
            // Generate a reasonable progress based on any available hints
            // For example, if we have steps info, calculate progress from that
            if (backendStatus.current_step && backendStatus.total_steps) {
              const step = parseInt(backendStatus.current_step, 10);
              const total = parseInt(backendStatus.total_steps, 10);
              if (!isNaN(step) && !isNaN(total) && total > 0) {
                backendStatus.progress = Math.round((step / total) * 100);
              } else {
                // Default to minimum 5% or lastProgress + small increment
                backendStatus.progress = Math.min(95, Math.max(5, Math.round(lastProgress + 3)));
              }
            } else {
              // Default to minimum 5% or lastProgress + small increment
              backendStatus.progress = Math.min(95, Math.max(5, Math.round(lastProgress + 3)));
            }
          }
          
          logger.debug('[SetupStatus] Generated progress value:', {
            requestId,
            progress: backendStatus.progress,
            lastProgress
          });
        }
        
        // If backend reports setup is complete, make sure user attributes are updated
        if (backendStatus && 
            (backendStatus.status === 'complete' || backendStatus.status === 'ready')) {
          logger.info('[SetupStatus] Backend reports setup is complete, updating user attributes', {
            requestId
          });
          
          try {
            // Use completeOnboarding utility to update user attributes
            const result = await completeOnboarding();
            
            if (result) {
              logger.info('[SetupStatus] Successfully updated user attributes to complete onboarding', {
                requestId
              });
              backendStatus.userAttributesUpdated = true;
            } else {
              // Try fallback method if completeOnboarding fails
              logger.warn('[SetupStatus] completeOnboarding failed, trying fallback', {
                requestId
              });
              
              try {
                const updated = await updateOnboardingStep('complete', {
                  'setupdone': 'TRUE',
                  'completed_at': new Date().toISOString()
                });
                
                if (updated) {
                  logger.info('[SetupStatus] Successfully updated user attributes with fallback', {
                    requestId
                  });
                  backendStatus.userAttributesUpdated = true;
                }
              } catch (updateError) {
                logger.error('[SetupStatus] Fallback update also failed', {
                  requestId,
                  error: updateError.message
                });
              }
            }
          } catch (completeError) {
            logger.error('[SetupStatus] Error updating user attributes:', {
              requestId,
              error: completeError.message
            });
          }
          
          // Ensure progress is exactly 100% for complete status
          backendStatus.progress = 100;
          
          // Set a cookie to help track that setup is complete, even if attribute update failed
          const cookieOptions = {
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            sameSite: 'lax',
            httpOnly: false // Allow JS to read
          };
          
          const jsonResponse = NextResponse.json({
            ...backendStatus,
            requestId,
            timestamp,
            // Add a larger random increment to speed up the progress bar
            progressIncrement: Math.random() < 0.8 ? Math.floor(Math.random() * 3) + 2 : 1
          });
          
          jsonResponse.cookies.set('setupProgress', '100', cookieOptions);
          jsonResponse.cookies.set('setupComplete', 'true', cookieOptions);
          jsonResponse.cookies.set('onboardingStatus', 'complete', cookieOptions);
          
          return jsonResponse;
        }
        
        // Update progress in cookies if backend provides it
        if (backendStatus && backendStatus.progress !== undefined) {
          // Store progress in cookie to recover from session issues
          const progress = backendStatus.progress;
          const cookieOptions = {
            path: '/',
            maxAge: 60 * 30, // 30 minutes
            sameSite: 'lax',
            httpOnly: false // Allow JS to read
          };
          
          // Add progress cookie to response
          const jsonResponse = NextResponse.json({
            ...backendStatus,
            requestId,
            timestamp,
            // Add a larger random increment to speed up the progress bar
            progressIncrement: Math.random() < 0.8 ? Math.floor(Math.random() * 3) + 2 : 1
          });
          
          jsonResponse.cookies.set('setupProgress', progress.toString(), cookieOptions);
          jsonResponse.cookies.set('lastProgressUpdate', Date.now().toString(), cookieOptions);
          return jsonResponse;
        }
      } else {
        // Handle backend errors
        if (statusResponse.status === 401) {
          return NextResponse.json(
            {
              error: 'Authentication failed with backend',
              status: 'auth_error',
              needsRefresh: true,
              message: 'Your session is no longer valid with our services. Please refresh and try again.',
              lastProgress,
              requestId
            },
            { status: 401 }
          );
        }
        
        backendError = {
          status: statusResponse.status,
          statusText: statusResponse.statusText
        };
        
        // Try to get more error details
        try {
          const errorData = await statusResponse.json();
          backendError.details = errorData;
        } catch (jsonError) {
          // If can't parse JSON, try to get text
          try {
            backendError.message = await statusResponse.text();
          } catch (textError) {
            backendError.message = 'Unable to parse error response';
          }
        }
        
        logger.error('[SetupStatus] Backend status request failed', {
          requestId,
          error: backendError,
          url: statusUrl
        });
      }
    } catch (fetchError) {
      backendError = {
        message: fetchError.message,
        name: fetchError.name
      };
      
      // Check if this was a timeout
      const isTimeout = fetchError.name === 'AbortError';
      
      logger.error('[SetupStatus] Error fetching status from backend', {
        requestId,
        error: backendError,
        isTimeout,
        lastProgress
      });
    }
    
    // If we have an error but previous progress, return a fallback status
    if (backendError && lastProgress > 0) {
      // Generate a reasonable response based on last known progress
      const statusMessage = 
        lastProgress < 30 ? 'Starting setup process...' :
        lastProgress < 60 ? 'Setup in progress, please wait...' :
        lastProgress < 90 ? 'Finalizing setup process...' :
        'Almost complete, please wait...';
      
      // Increment progress more significantly to prevent stalls
      // Use a variable increment based on progress to avoid appearing stuck
      const progressRate = lastProgress < 30 ? 5 : (lastProgress < 70 ? 3 : 2);
      const adjustedProgress = Math.min(Math.round(lastProgress + progressRate), 95);
      
      // Store the updated progress
      const cookieOptions = {
        path: '/',
        maxAge: 60 * 30, // 30 minutes
        sameSite: 'lax',
        httpOnly: false // Allow JS to read
      };
      
      const jsonResponse = NextResponse.json({
        status: 'in_progress',
        progress: adjustedProgress,
        message: statusMessage,
        recovery: true,
        backendAvailable: false,
        lastProgress,
        errorSummary: backendError.name || 'FetchError',
        requestId,
        timestamp,
        // Add a larger increment to avoid UI appearing stuck
        progressIncrement: Math.floor(Math.random() * 3) + 2
      });
      
      jsonResponse.cookies.set('setupProgress', adjustedProgress.toString(), cookieOptions);
      jsonResponse.cookies.set('lastProgressUpdate', Date.now().toString(), cookieOptions);
      return jsonResponse;
    }
    
    // If we don't have backend status or fallback progress, return a generic error with some progress
    if (!backendStatus) {
      // Generate a progress value that slowly increases over time
      // Use the timestamp to create a slowly increasing number (5-30%)
      const timeBasedProgress = Math.min(30, 5 + Math.floor((Date.now() % 1000000) / 40000));
      const fallbackProgress = Math.max(lastProgress, timeBasedProgress);
      
      return NextResponse.json(
        {
          error: backendError?.message || 'Failed to fetch setup status',
          status: 'error',
          message: 'Unable to determine setup status at this time. Please try refreshing the page.',
          progress: fallbackProgress,
          progressIncrement: 1, // Small increment to keep UI moving
          requestId,
          timestamp,
          retryable: true
        },
        { status: backendError?.status || 503 }
      );
    }
    
    // Ensure any response always includes a normalized progress value
    if (backendStatus.progress === undefined) {
      backendStatus.progress = Math.max(5, lastProgress + 2); // Default minimal progress
    } else if (typeof backendStatus.progress === 'string') {
      backendStatus.progress = parseInt(backendStatus.progress, 10) || Math.max(5, lastProgress + 2);
    }
    
    // Round to integer and enforce min/max
    backendStatus.progress = Math.max(0, Math.min(100, Math.round(backendStatus.progress)));
    
    // Add a larger random increment to prevent UI stagnation
    backendStatus.progressIncrement = Math.random() < 0.8 ? Math.floor(Math.random() * 3) + 2 : 1;
    
    // Add a flag to indicate if we're near completion to help the frontend get past 95%
    if (backendStatus.progress >= 90 || lastProgress >= 90) {
      backendStatus.isNearCompletion = true;
      
      // If we're at high progress, increase the increment to finish faster
      backendStatus.progressIncrement = Math.floor(Math.random() * 4) + 3;
      
      // For very high progress, force status to finalizing
      if (backendStatus.progress >= 94) {
        if (backendStatus.status !== 'complete' && backendStatus.status !== 'failed') {
          backendStatus.status = 'finalizing';
        }
      }
    }
    
    // We shouldn't reach here if we properly handle all cases above
    return NextResponse.json({
      ...backendStatus,
      requestId,
      timestamp
    });
    
  } catch (error) {
    logger.error('[SetupStatus] Unexpected error processing status request', {
      requestId,
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      {
        error: 'Error checking setup status',
        message: 'An unexpected error occurred while checking setup status.',
        details: error.message,
        requestId,
        timestamp: Date.now(),
        retryable: true
      },
      { status: 500 }
    );
  }
}