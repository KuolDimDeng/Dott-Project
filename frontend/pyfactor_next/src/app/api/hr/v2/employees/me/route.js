import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  console.log('[EmployeeMeAPI] === GET /api/hr/v2/employees/me START ===');
  
  try {
    const cookieStore = cookies();
    const sid = cookieStore.get('sid');
    const tenantId = cookieStore.get('tenantId');
    
    console.log('[EmployeeMeAPI] Cookies:', {
      hasSid: !!sid,
      hasTenantId: !!tenantId,
      tenantIdValue: tenantId?.value
    });
    
    if (!sid) {
      console.error('[EmployeeMeAPI] No session cookie found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Session ${sid.value}`,
      'X-Session-ID': sid.value,
    };
    
    // Add tenant ID if available
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId.value;
      console.log('[EmployeeMeAPI] Added tenant ID:', tenantId.value);
    }
    
    const backendUrl = `${BACKEND_URL}/api/hr/employees/me/`;
    console.log('[EmployeeMeAPI] Fetching from:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    
    console.log('[EmployeeMeAPI] Backend response status:', response.status);
    console.log('[EmployeeMeAPI] Backend response headers:', Object.fromEntries(response.headers));
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('[EmployeeMeAPI] Backend error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        isHtml: errorData.includes('<!DOCTYPE') || errorData.includes('<html')
      });
      
      // Check if we got HTML instead of JSON (common auth redirect issue)
      if (errorData.includes('<!DOCTYPE') || errorData.includes('<html')) {
        console.error('[EmployeeMeAPI] Received HTML instead of JSON - likely auth redirect');
        return NextResponse.json(
          { error: 'Authentication failed - received HTML response' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch employee data', details: errorData },
        { status: response.status }
      );
    }
    
    const responseText = await response.text();
    console.log('[EmployeeMeAPI] Raw response:', responseText.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[EmployeeMeAPI] Failed to parse JSON:', parseError);
      console.error('[EmployeeMeAPI] Response was:', responseText.substring(0, 500));
      return NextResponse.json(
        { error: 'Invalid JSON response from backend' },
        { status: 500 }
      );
    }
    
    console.log('[EmployeeMeAPI] Employee data:', {
      hasData: !!data,
      id: data?.id,
      email: data?.email,
      userId: data?.user_id || data?.user
    });
    
    return NextResponse.json({ 
      success: true, 
      data: data 
    });
  } catch (error) {
    console.error('[EmployeeMeAPI] Error:', error);
    console.error('[EmployeeMeAPI] Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}