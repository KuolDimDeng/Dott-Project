import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ 
        error: 'No session found' 
      }, { status: 401 });
    }
    
    console.log('[RefreshBusinessInfo] Fetching fresh business info from backend...');
    
    // Call the backend user profile endpoint to get fresh data
    const response = await fetch(`${API_URL}/api/auth/profile`, {
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `session_token=${sessionId.value}`
      },
      cache: 'no-store' // Force fresh data
    });
    
    if (!response.ok) {
      console.error('[RefreshBusinessInfo] Backend request failed:', response.status);
      return NextResponse.json({ 
        error: 'Failed to fetch business info' 
      }, { status: response.status });
    }
    
    const data = await response.json();
    console.log('[RefreshBusinessInfo] Received backend data:', {
      businessName: data.businessName || data.business_name,
      tenantName: data.tenant?.name,
      hasBusiness: !!data.business_name || !!data.businessName || !!data.tenant?.name
    });
    
    // Extract business info from various possible locations
    const businessInfo = {
      businessName: data.businessName || data.business_name || data.tenant?.name || '',
      businessType: data.businessType || data.business_type || '',
      subscriptionPlan: data.subscription_plan || data.subscriptionPlan || 'free',
      tenantId: data.tenantId || data.tenant_id || data.tenant?.id,
      user: {
        firstName: data.user?.first_name || data.user?.given_name || '',
        lastName: data.user?.last_name || data.user?.family_name || '',
        name: data.user?.name || '',
        email: data.user?.email || data.email
      }
    };
    
    console.log('[RefreshBusinessInfo] Returning business info:', businessInfo);
    
    return NextResponse.json(businessInfo);
    
  } catch (error) {
    console.error('[RefreshBusinessInfo] Error:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error.message
    }, { status: 500 });
  }
}