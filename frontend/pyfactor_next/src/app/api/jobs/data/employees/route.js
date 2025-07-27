import { getSession } from '@/utils/auth';
import { logger } from '@/utils/logger';

export async function GET(request) {
  logger.info('[JobsDataEmployees] 👷 === API CALL START ===');

  try {
    const session = await getSession();
    logger.info('[JobsDataEmployees] 👷 Session check:', { 
      hasSession: !!session, 
      sessionId: session?.sessionId 
    });

    if (!session?.token) {
      logger.error('[JobsDataEmployees] 👷 No session token found');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.dottapps.com'}/api/jobs/data/employees/`;
    logger.info('[JobsDataEmployees] 👷 Making request to:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info('[JobsDataEmployees] 👷 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[JobsDataEmployees] 👷 Backend error:', { 
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
    logger.info('[JobsDataEmployees] 👷 Backend response data:', { 
      dataType: typeof data, 
      isArray: Array.isArray(data),
      count: Array.isArray(data) ? data.length : 'not array'
    });

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('[JobsDataEmployees] 👷 Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}