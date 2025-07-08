import { NextResponse } from 'next/server';
import { getSecureSession } from '@/utils/sessionUtils-v2';
import { standardSecurityHeaders } from '@/utils/responseHeaders';

export async function GET(request) {
  try {
    // Verify session
    const session = await getSecureSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401, 
        headers: standardSecurityHeaders 
      });
    }
    
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400, headers: standardSecurityHeaders }
      );
    }
    
    // Try to get filing readiness from backend, fallback to basic status
    let filingReadiness = null;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com'}/api/taxes/filing-readiness/?tenant_id=${tenantId}`,
        {
          method: 'GET',
          headers: {
            'Cookie': request.headers.get('cookie') || ''
          },
          credentials: 'include',
          timeout: 5000
        }
      );
      
      if (response.ok) {
        filingReadiness = await response.json();
      }
    } catch (backendError) {
      console.warn('[Filing Readiness API] Backend not available:', backendError.message);
    }
    
    // Fallback: check if tax settings exist to determine basic readiness
    if (!filingReadiness) {
      try {
        const settingsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com'}/api/taxes/settings/?tenant_id=${tenantId}`,
          {
            method: 'GET',
            headers: {
              'Cookie': request.headers.get('cookie') || ''
            },
            credentials: 'include',
            timeout: 5000
          }
        );
        
        const hasSettings = settingsResponse.ok;
        const nextQuarter = new Date();
        nextQuarter.setMonth(nextQuarter.getMonth() + 3 - (nextQuarter.getMonth() % 3));
        nextQuarter.setDate(15);
        
        filingReadiness = {
          salesTax: {
            ready: hasSettings,
            nextDeadline: hasSettings ? nextQuarter.toISOString() : null,
            requirements: hasSettings ? [] : ['Complete tax settings first']
          },
          payrollTax: {
            ready: hasSettings,
            nextDeadline: hasSettings ? nextQuarter.toISOString() : null,
            requirements: hasSettings ? [] : ['Complete tax settings first']
          },
          incomeTax: {
            ready: hasSettings,
            nextDeadline: hasSettings ? new Date(nextQuarter.getFullYear() + 1, 3, 15).toISOString() : null,
            requirements: hasSettings ? [] : ['Complete tax settings first']
          }
        };
      } catch (fallbackError) {
        console.warn('[Filing Readiness API] Fallback failed:', fallbackError.message);
        
        // Final fallback - return not ready status
        filingReadiness = {
          salesTax: { ready: false, requirements: ['Complete tax settings first'] },
          payrollTax: { ready: false, requirements: ['Complete tax settings first'] },
          incomeTax: { ready: false, requirements: ['Complete tax settings first'] }
        };
      }
    }
    
    return NextResponse.json(filingReadiness, { headers: standardSecurityHeaders });
    
  } catch (error) {
    console.error('[Filing Readiness API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get filing readiness' },
      { status: 500, headers: standardSecurityHeaders }
    );
  }
}