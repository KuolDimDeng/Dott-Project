import { NextResponse } from 'next/server';
import { getSession } from '@/utils/sessionManager-v2-enhanced';

export async function GET(request) {
  console.log('[Tax Usage API] GET request received');
  
  try {
    // Verify session
    const session = await getSession();
    if (!session?.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }
    
    // Fetch usage information from backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/taxes/api-usage/?tenant_id=${tenantId}`,
      {
        method: 'GET',
        headers: {
          'Cookie': request.headers.get('cookie') || ''
        },
        credentials: 'include'
      }
    );
    
    if (!response.ok) {
      console.error('[Tax Usage API] Backend error:', response.status);
      // Return default limits if backend doesn't have the endpoint yet
      return NextResponse.json({
        monthlyUsage: 0,
        monthlyLimit: 5,
        resetsAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
      });
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      monthlyUsage: data.monthly_usage || 0,
      monthlyLimit: data.monthly_limit || 5,
      resetsAt: data.resets_at || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
      planType: data.plan_type || 'free'
    });
    
  } catch (error) {
    console.error('[Tax Usage API] Error:', error);
    // Return default limits on error
    return NextResponse.json({
      monthlyUsage: 0,
      monthlyLimit: 5,
      resetsAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
    });
  }
}