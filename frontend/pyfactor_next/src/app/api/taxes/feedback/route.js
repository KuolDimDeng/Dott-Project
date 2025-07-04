import { NextResponse } from 'next/server';
import { getSecureSession } from '@/utils/sessionUtils-v2';
import { standardSecurityHeaders } from '@/utils/responseHeaders';

export async function POST(request) {
  try {
    // Verify session
    const session = await getSecureSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401, 
        headers: standardSecurityHeaders 
      });
    }
    
    const {
      tenantId,
      businessInfo,
      feedbackType,
      details,
      inaccurateFields,
      suggestedSources,
      displayedRates,
      aiConfidenceScore
    } = await request.json();
    
    if (!tenantId || !feedbackType || !details) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: standardSecurityHeaders }
      );
    }
    
    // Forward to backend
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/taxes/feedback/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify({
        businessInfo,
        feedbackType,
        details,
        inaccurateFields,
        suggestedSources,
        displayedRates,
        aiConfidenceScore
      })
    });
    
    if (!backendResponse.ok) {
      throw new Error('Backend request failed');
    }
    
    const data = await backendResponse.json();
    
    return NextResponse.json(data, { headers: standardSecurityHeaders });
    
  } catch (error) {
    console.error('[Tax Feedback API] Error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: standardSecurityHeaders }
    );
  }
}