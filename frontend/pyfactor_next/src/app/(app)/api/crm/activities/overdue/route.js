import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { logger } from '@/utils/logger';

/**
 * API route to handle CRM overdue activities
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/crm/activities/overdue/`,
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
      logger.warn('Backend API request failed, using mock data for CRM overdue activities');
    } catch (fetchError) {
      // Log the fetch error but continue with mock data
      logger.error('Error fetching from backend CRM overdue activities API:', fetchError);
    }
    
    // Return mock data as fallback
    return NextResponse.json([
      { id: 4, type: 'task', subject: 'Update customer details', due_date: '2025-03-22T17:00:00Z', status: 'in_progress' },
      { id: 5, type: 'call', subject: 'Check in with Smith Co', due_date: '2025-03-21T11:00:00Z', status: 'not_started' }
    ]);
    
  } catch (error) {
    logger.error('Error in CRM overdue activities API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 