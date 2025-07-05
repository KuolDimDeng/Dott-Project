import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    // Get session cookie
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie || !sidCookie.value) {
      logger.error('[SmartInsights Packages API] No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Call backend packages endpoint
    const response = await fetch(`${BACKEND_URL}/api/smart-insights/packages/`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // If backend doesn't have this endpoint yet, return default packages
      if (response.status === 404) {
        return NextResponse.json({
          results: [
            {
              id: 'starter',
              name: 'Starter Pack',
              credits: 50,
              price: 6.50,
              description: 'Perfect for trying out Smart Insights'
            },
            {
              id: 'growth',
              name: 'Growth Pack',
              credits: 200,
              price: 23.40,
              description: 'Great for regular business insights'
            },
            {
              id: 'professional',
              name: 'Professional Pack',
              credits: 500,
              price: 65.00,
              description: 'Best value for power users'
            },
            {
              id: 'enterprise',
              name: 'Enterprise Pack',
              credits: 1000,
              price: 130.00,
              description: 'Maximum credits for enterprise needs'
            }
          ]
        });
      }
      
      const errorData = await response.json();
      logger.error('[SmartInsights Packages API] Backend error:', errorData);
      return NextResponse.json(
        { 
          error: errorData.error || errorData.detail || 'Failed to fetch packages',
          details: errorData 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    logger.error('[SmartInsights Packages API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}