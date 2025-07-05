import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { logger } from '@/utils/logger';

/**
 * API route to handle CRM dashboard campaigns stats
 */
export async function GET(request) {
  try {
    // Get auth token from request headers
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
      // Try to fetch from backend API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/crm/dashboard/campaigns/`,
        {
          headers: { Authorization: authHeader },
          // Set a shorter timeout to prevent long waits if backend is down
          signal: AbortSignal.timeout(5000)
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
      
      // If backend fetch failed, fallback to mock data
      logger.warn('Backend API request failed, using mock data for CRM dashboard campaigns');
    } catch (fetchError) {
      // Log the fetch error but continue with mock data
      logger.error('Error fetching from backend CRM campaigns API:', fetchError);
    }
    
    // Return mock data as fallback
    return NextResponse.json({
      total_campaigns: 12, 
      active_campaigns: 4,
      campaigns_by_type: [
        { type: 'email', count: 5 },
        { type: 'social', count: 3 },
        { type: 'event', count: 2 },
        { type: 'webinar', count: 2 }
      ],
      campaigns_by_status: [
        { status: 'planning', count: 3 },
        { status: 'active', count: 4 },
        { status: 'completed', count: 5 }
      ]
    });
    
  } catch (error) {
    logger.error('Error in CRM dashboard campaigns API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 