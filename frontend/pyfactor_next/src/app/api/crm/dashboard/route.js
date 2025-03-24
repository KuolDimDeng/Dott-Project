import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import { logger } from '@/utils/logger';
import { apiService } from '@/services/apiService';

/**
 * API route to fetch CRM dashboard data from the backend
 * This aggregates data from multiple CRM endpoints
 */
export async function GET(request) {
  try {
    // Get auth token from session
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Make parallel requests to backend API endpoints
    const [
      customersResponse, 
      leadsResponse, 
      opportunitiesResponse, 
      dealsResponse,
      activitiesUpcomingResponse,
      activitiesOverdueResponse,
      campaignsResponse
    ] = await Promise.all([
      fetch(`${process.env.BACKEND_API_URL}/crm/dashboard/customers/`, {
        headers: { Authorization: authHeader }
      }),
      fetch(`${process.env.BACKEND_API_URL}/crm/dashboard/leads/`, {
        headers: { Authorization: authHeader }
      }),
      fetch(`${process.env.BACKEND_API_URL}/crm/dashboard/opportunities/`, {
        headers: { Authorization: authHeader }
      }),
      fetch(`${process.env.BACKEND_API_URL}/crm/dashboard/deals/`, {
        headers: { Authorization: authHeader }
      }),
      fetch(`${process.env.BACKEND_API_URL}/crm/activities/upcoming/`, {
        headers: { Authorization: authHeader }
      }),
      fetch(`${process.env.BACKEND_API_URL}/crm/activities/overdue/`, {
        headers: { Authorization: authHeader }
      }),
      fetch(`${process.env.BACKEND_API_URL}/crm/dashboard/campaigns/`, {
        headers: { Authorization: authHeader }
      })
    ]);
    
    // Check if any request failed
    if (!customersResponse.ok || !leadsResponse.ok || !opportunitiesResponse.ok || 
        !dealsResponse.ok || !activitiesUpcomingResponse.ok || 
        !activitiesOverdueResponse.ok || !campaignsResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch CRM dashboard data' }, { status: 500 });
    }
    
    // Parse response data
    const [
      customers, 
      leads, 
      opportunities, 
      deals,
      activitiesUpcoming,
      activitiesOverdue,
      campaigns
    ] = await Promise.all([
      customersResponse.json(),
      leadsResponse.json(),
      opportunitiesResponse.json(),
      dealsResponse.json(),
      activitiesUpcomingResponse.json(),
      activitiesOverdueResponse.json(),
      campaignsResponse.json()
    ]);
    
    // Return aggregated dashboard data
    return NextResponse.json({
      customers,
      leads,
      opportunities,
      deals,
      activities: {
        upcoming: activitiesUpcoming,
        overdue: activitiesOverdue
      },
      campaigns
    });
    
  } catch (error) {
    logger.error('Error in CRM dashboard API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}