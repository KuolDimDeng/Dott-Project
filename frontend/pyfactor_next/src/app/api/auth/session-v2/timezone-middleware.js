// Timezone Detection Middleware for Session API
// Handles timezone detection for existing users on login

export async function handleTimezoneDetection(user, request) {
  try {
    // Check if user has timezone set
    if (!user.timezone || user.timezone === 'UTC') {
      // Try to get timezone from request headers or client
      const clientTimezone = getClientTimezone(request);
      
      if (clientTimezone && clientTimezone !== 'UTC') {
        console.log('[TimezoneMiddleware] Auto-detecting timezone for existing user:', user.email);
        
        // Update user timezone in backend
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
        const sessionToken = getSessionToken(request);
        
        if (sessionToken) {
          try {
            const response = await fetch(`${API_BASE_URL}/api/users/me/`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Session ${sessionToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ timezone: clientTimezone })
            });
            
            if (response.ok) {
              console.log('[TimezoneMiddleware] Updated timezone for user:', user.email, '→', clientTimezone);
              // Update user object for this session
              user.timezone = clientTimezone;
            }
          } catch (error) {
            console.error('[TimezoneMiddleware] Error updating timezone:', error);
          }
        }
      }
    }
  } catch (error) {
    console.error('[TimezoneMiddleware] Error in timezone detection:', error);
  }
  
  return user;
}

// Helper function to get client timezone from request
function getClientTimezone(request) {
  try {
    // Try to get from URL params (if passed from client)
    const url = new URL(request.url);
    const timezoneParam = url.searchParams.get('timezone');
    if (timezoneParam) {
      return timezoneParam;
    }
    
    // Try to get from headers
    const timezoneHeader = request.headers.get('X-Timezone');
    if (timezoneHeader) {
      return timezoneHeader;
    }
    
    // Default fallback
    return null;
  } catch (error) {
    return null;
  }
}

// Helper function to get session token from request
function getSessionToken(request) {
  try {
    const cookies = request.headers.get('cookie');
    if (cookies) {
      const sessionMatch = cookies.match(/(?:^|;)\s*sid=([^;]*)/);
      return sessionMatch ? sessionMatch[1] : null;
    }
    return null;
  } catch (error) {
    return null;
  }
}