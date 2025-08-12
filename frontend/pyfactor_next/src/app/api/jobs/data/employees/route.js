import { logger } from '@/utils/logger';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  logger.info('[JobsDataEmployees] 👷 === API CALL START ===');

  try {
    const backendUrl = `${BACKEND_URL}/api/jobs/data/employees/`;
    logger.info('[JobsDataEmployees] 👷 Making request to:', backendUrl);

    // Simple proxy - just forward the cookies
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      credentials: 'include',
    });

    logger.info('[JobsDataEmployees] 👷 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[JobsDataEmployees] 👷 Backend error:', { 
        status: response.status,
        statusText: response.statusText,
        error: errorText.substring(0, 200)
      });
      
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    logger.info('[JobsDataEmployees] 👷 Success, count:', Array.isArray(data) ? data.length : data.results?.length || 0);

    return NextResponse.json(data);

  } catch (error) {
    logger.error('[JobsDataEmployees] 👷 Error:', error);
    logger.error('[JobsDataEmployees] 👷 Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}