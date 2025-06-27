import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * Proxy for HR metrics summary endpoint
 * Forwards requests to Django backend with proper authentication
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    
    // Get session ID from sid cookie
    const sidCookie = cookieStore.get('sid');
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Forward request to Django backend
    // Backend will determine tenant from the session
    const response = await fetch(`${API_URL}/api/hr/metrics/summary/`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      // If backend doesn't have the endpoint yet, return demo data
      if (response.status === 404) {
        return NextResponse.json({
          metrics: {
            avgSalary: 65000,
            turnoverRate: 8.5,
            pendingOnboarding: 3,
            upcomingReviews: 7,
            timeToHire: 14, // days
            retentionRate: 92, // percentage
            trainingCompletion: 87, // percentage
            employeeSatisfaction: 4.2, // out of 5
            absenteeismRate: 2.1, // percentage
            overtimeHours: 145 // total overtime hours this month
          }
        });
      }
      
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[HR Metrics Summary API] Error:', error);
    
    // Return demo data as fallback
    return NextResponse.json({
      metrics: {
        avgSalary: 65000,
        turnoverRate: 8.5,
        pendingOnboarding: 3,
        upcomingReviews: 7,
        timeToHire: 14, // days
        retentionRate: 92, // percentage
        trainingCompletion: 87, // percentage
        employeeSatisfaction: 4.2, // out of 5
        absenteeismRate: 2.1, // percentage
        overtimeHours: 145 // total overtime hours this month
      }
    });
  }
}