import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { logger } from '@/utils/logger';

/**
 * API route to handle CRM upcoming activities
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/crm/activities/upcoming/`,
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
      logger.warn('Backend API request failed, using mock data for CRM upcoming activities');
    } catch (fetchError) {
      // Log the fetch error but continue with mock data
      logger.error('Error fetching from backend CRM upcoming activities API:', fetchError);
    }
    
    // Return mock data as fallback
    return NextResponse.json([
      { id: 1, type: 'call', subject: 'Follow-up call with ABC Corp', due_date: '2025-03-28T10:00:00Z', status: 'not_started' },
      { id: 2, type: 'meeting', subject: 'Demo for XYZ Inc', due_date: '2025-03-29T14:30:00Z', status: 'not_started' },
      { id: 3, type: 'email', subject: 'Send proposal to Johnson Ltd', due_date: '2025-03-27T12:00:00Z', status: 'in_progress' }
    ]);
    
  } catch (error) {
    logger.error('Error in CRM upcoming activities API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 