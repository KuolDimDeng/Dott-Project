import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Get session cookie
    const cookies = request.cookies;
    const sessionId = cookies.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Forward request to Django backend
    const response = await fetch(`${process.env.BACKEND_API_URL || 'https://api.dottapps.com'}/api/inventory/services/stats/`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      // If backend doesn't have this endpoint yet, return data from the main services endpoint
      const servicesResponse = await fetch(`${process.env.BACKEND_API_URL || 'https://api.dottapps.com'}/api/inventory/services/`, {
        method: 'GET',
        headers: {
          'Authorization': `Session ${sessionId.value}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (servicesResponse.ok) {
        const services = await servicesResponse.json();
        
        // Calculate stats from the services list
        const stats = {
          total: services.length || 0,
          active: services.filter(s => s.is_active !== false).length || 0,
          recurring: services.filter(s => s.is_recurring || s.recurring).length || 0,
          totalValue: services.reduce((sum, s) => sum + (parseFloat(s.price || s.rate || 0)), 0)
        };
        
        return NextResponse.json({ stats });
      }
      
      // If that also fails, return zeros
      return NextResponse.json({
        stats: {
          total: 0,
          active: 0,
          recurring: 0,
          totalValue: 0
        }
      });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Service Stats] Error:', error);
    return NextResponse.json(
      { 
        stats: {
          total: 0,
          active: 0,
          recurring: 0,
          totalValue: 0
        }
      },
      { status: 200 } // Return 200 with zeros instead of error
    );
  }
}