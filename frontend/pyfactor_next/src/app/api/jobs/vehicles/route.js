import { logger } from '@/utils/logger';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  logger.info('[JobsVehicles] 🚗 === API CALL START ===');

  try {
    const backendUrl = `${BACKEND_URL}/api/jobs/vehicles/`;
    logger.info('[JobsVehicles] 🚗 Making request to:', backendUrl);

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

    logger.info('[JobsVehicles] 🚗 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[JobsVehicles] 🚗 Backend error:', { 
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
    logger.info('[JobsVehicles] 🚗 Success, count:', Array.isArray(data) ? data.length : data.results?.length || 0);

    return NextResponse.json(data);

  } catch (error) {
    logger.error('[JobsVehicles] 🚗 Error:', error);
    logger.error('[JobsVehicles] 🚗 Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  logger.info('[JobsVehicles] 🚗 === CREATE VEHICLE START ===');

  try {
    const body = await request.json();
    logger.info('[JobsVehicles] 🚗 Request body:', body);

    const backendUrl = `${BACKEND_URL}/api/jobs/vehicles/`;
    logger.info('[JobsVehicles] 🚗 Making POST request to:', backendUrl);

    // Simple proxy - just forward the cookies
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    logger.info('[JobsVehicles] 🚗 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[JobsVehicles] 🚗 Backend error:', { 
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
    logger.info('[JobsVehicles] 🚗 Vehicle created successfully:', data);

    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    logger.error('[JobsVehicles] 🚗 Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}