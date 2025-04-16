import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { logger } from '@/utils/logger';

/**
 * API route to handle CRM dashboard opportunities stats
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/crm/dashboard/opportunities/`,
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
      logger.warn('Backend API request failed, using mock data for CRM dashboard opportunities');
    } catch (fetchError) {
      // Log the fetch error but continue with mock data
      logger.error('Error fetching from backend CRM opportunities API:', fetchError);
    }
    
    // Return mock data as fallback
    return NextResponse.json({
      total_opportunities: 32, 
      total_value: 450000,
      opportunities_by_stage: [
        { stage: 'prospecting', count: 8, value: 120000 },
        { stage: 'qualification', count: 6, value: 80000 },
        { stage: 'proposal', count: 5, value: 150000 },
        { stage: 'negotiation', count: 3, value: 75000 },
        { stage: 'closed_won', count: 10, value: 25000 }
      ]
    });
    
  } catch (error) {
    logger.error('Error in CRM dashboard opportunities API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 