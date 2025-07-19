import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

export async function POST(request) {
  try {
    const body = await request.json();
    const { package_id } = body;

    if (!package_id) {
      return NextResponse.json(
        { error: 'Package ID is required' },
        { status: 400 }
      );
    }

    // Get session cookie
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie || !sidCookie.value) {
      logger.error('[SmartInsights Purchase API] No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Call backend purchase endpoint
    const response = await fetch(`${BACKEND_URL}/api/smart-insights/purchase/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        package_id
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      // If backend doesn't have this endpoint yet, return mock response
      if (response.status === 404) {
        logger.info('[SmartInsights Purchase API] Backend endpoint not available yet');
        return NextResponse.json({
          message: 'Payment integration coming soon!',
          package_id,
          status: 'pending'
        });
      }
      
      logger.error('[SmartInsights Purchase API] Backend error:', responseData);
      return NextResponse.json(
        { 
          error: responseData.error || responseData.detail || 'Failed to process purchase',
          details: responseData 
        },
        { status: response.status }
      );
    }

    // Return the checkout URL or success response
    return NextResponse.json({
      checkout_url: responseData.checkout_url,
      session_id: responseData.session_id,
      package_id: responseData.package_id,
      credits: responseData.credits,
      price: responseData.price
    });

  } catch (error) {
    logger.error('[SmartInsights Purchase API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}