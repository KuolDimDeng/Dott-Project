import { logger } from '@/utils/logger';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  const requestId = Math.random().toString(36).substring(7);
  logger.info(`[JobsDataCustomers] 👥 === API ROUTE START [${requestId}] ===`);
  logger.info(`[JobsDataCustomers] 👥 [${requestId}] Timestamp:`, new Date().toISOString());
  logger.info(`[JobsDataCustomers] 👥 [${requestId}] Method:`, request.method);
  logger.info(`[JobsDataCustomers] 👥 [${requestId}] URL:`, request.url);
  
  // Log all headers for debugging
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = key.toLowerCase() === 'cookie' ? value.substring(0, 100) + '...' : value;
  });
  logger.info(`[JobsDataCustomers] 👥 [${requestId}] Request headers:`, headers);
  
  // Log all cookies for debugging
  const cookieHeader = request.headers.get('cookie');
  logger.info(`[JobsDataCustomers] 👥 [${requestId}] Cookie header:`, cookieHeader ? cookieHeader.substring(0, 100) + '...' : 'none');
  
  // Parse cookies to see session data
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const sessionCookie = cookies.find(c => c.startsWith('session=') || c.startsWith('sid='));
    logger.info(`[JobsDataCustomers] 👥 [${requestId}] Session cookie found:`, sessionCookie ? 'Yes' : 'No');
  }

  try {
    const backendUrl = `${BACKEND_URL}/api/jobs/data/customers/`;
    logger.info(`[JobsDataCustomers] 👥 [${requestId}] Making request to backend:`, backendUrl);
    logger.info(`[JobsDataCustomers] 👥 [${requestId}] Backend request starting at:`, new Date().toISOString());

    // Simple proxy - just forward the cookies
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': cookieHeader || '',
        'X-Request-ID': requestId,
      },
      credentials: 'include',
    });

    logger.info(`[JobsDataCustomers] 👥 [${requestId}] Backend response received at:`, new Date().toISOString());
    logger.info(`[JobsDataCustomers] 👥 [${requestId}] Backend response status:`, response.status);
    logger.info(`[JobsDataCustomers] 👥 [${requestId}] Backend response headers:`, Object.fromEntries(response.headers));

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[JobsDataCustomers] 👥 [${requestId}] Backend error:`, { 
        status: response.status,
        statusText: response.statusText,
        error: errorText.substring(0, 500)
      });
      
      return NextResponse.json(
        { error: `Backend error: ${response.status}`, details: errorText.substring(0, 200) },
        { status: response.status }
      );
    }

    const data = await response.json();
    logger.info(`[JobsDataCustomers] 👥 [${requestId}] Backend data received:`, {
      type: typeof data,
      isArray: Array.isArray(data),
      count: Array.isArray(data) ? data.length : data.results?.length || 0,
      hasResults: 'results' in data,
      sampleData: Array.isArray(data) && data.length > 0 ? data[0] : data.results?.[0] || 'No data'
    });
    logger.info(`[JobsDataCustomers] 👥 [${requestId}] === API ROUTE END ===`);

    return NextResponse.json(data);

  } catch (error) {
    logger.error('[JobsDataCustomers] 👥 Error:', error);
    logger.error('[JobsDataCustomers] 👥 Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}