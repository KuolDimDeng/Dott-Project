import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Get current session information including IP and location
 */
export async function GET(request) {
  try {
    // Get session token
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    
    if (!sessionToken) {
      return NextResponse.json({ 
        error: 'No active session' 
      }, { status: 401 });
    }
    
    // Get IP address and user agent from headers
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               request.headers.get('cf-connecting-ip') ||
               'unknown';
               
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const country = request.headers.get('cf-ipcountry') || 'unknown';
    
    // Get location data if available
    let location = null;
    
    // Try to get location from Cloudflare headers
    const latitude = request.headers.get('cf-latitude');
    const longitude = request.headers.get('cf-longitude');
    const city = request.headers.get('cf-city');
    const region = request.headers.get('cf-region');
    
    if (latitude && longitude) {
      location = {
        lat: parseFloat(latitude),
        lon: parseFloat(longitude),
        city: city || 'unknown',
        region: region || 'unknown',
        country: country
      };
    } else if (ip !== 'unknown') {
      // Fallback to IP geolocation service
      try {
        const geoResponse = await fetch(`https://ipapi.co/${ip.split(',')[0].trim()}/json/`, {
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          location = {
            lat: geoData.latitude,
            lon: geoData.longitude,
            city: geoData.city,
            region: geoData.region,
            country: geoData.country_name
          };
        }
      } catch (geoError) {
        console.error('[SessionInfo] Geolocation failed:', geoError);
      }
    }
    
    // Get backend session info
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    try {
      const sessionResponse = await fetch(`${apiUrl}/api/sessions/current/`, {
        headers: {
          'Authorization': `Session ${sessionToken.value}`,
          'X-Forwarded-For': ip,
          'User-Agent': userAgent
        }
      });
      
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        
        return NextResponse.json({
          ip: ip.split(',')[0].trim(), // First IP if multiple
          userAgent: userAgent,
          location: location,
          country: country,
          sessionInfo: {
            created_at: sessionData.created_at,
            last_activity: sessionData.last_activity,
            expires_at: sessionData.expires_at,
            is_active: sessionData.is_active
          }
        });
      }
    } catch (error) {
      console.error('[SessionInfo] Backend error:', error);
    }
    
    // Return basic info if backend fails
    return NextResponse.json({
      ip: ip.split(',')[0].trim(),
      userAgent: userAgent,
      location: location,
      country: country,
      sessionInfo: null
    });
    
  } catch (error) {
    console.error('[SessionInfo] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to get session info' 
    }, { status: 500 });
  }
}