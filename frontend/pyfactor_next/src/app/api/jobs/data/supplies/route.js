import { getSession } from '@/utils/auth';
import { logger } from '@/utils/logger';

export async function GET(request) {
  logger.info('[JobsDataSupplies] 📦 === API CALL START ===');

  try {
    const session = await getSession();
    logger.info('[JobsDataSupplies] 📦 Session check:', { 
      hasSession: !!session, 
      sessionId: session?.sessionId 
    });

    if (!session?.token) {
      logger.error('[JobsDataSupplies] 📦 No session token found');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.dottapps.com'}/api/jobs/data/supplies/`;
    logger.info('[JobsDataSupplies] 📦 Making request to:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info('[JobsDataSupplies] 📦 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[JobsDataSupplies] 📦 Backend error:', { 
        status: response.status,
        statusText: response.statusText,
        error: errorText 
      });
      
      return new Response(
        JSON.stringify({ 
          error: `Backend error: ${response.status} ${response.statusText}`,
          details: errorText 
        }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    logger.info('[JobsDataSupplies] 📦 Backend response data:', { 
      dataType: typeof data, 
      isArray: Array.isArray(data),
      count: Array.isArray(data) ? data.length : 'not array'
    });

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('[JobsDataSupplies] 📦 Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}