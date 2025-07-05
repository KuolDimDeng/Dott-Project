import { NextResponse } from 'next/server';
import { getServerUser } from '@/utils/getServerUser';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    console.log('[api/taxes/filing/initiate] Initiating tax filing');
    
    // Validate authentication
    const userResult = await getServerUser(request);
    if (!userResult.isAuthenticated || !userResult.user) {
      console.error('[api/taxes/filing/initiate] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { tenantId, taxType, serviceType, price, period, dueDate } = body;
    
    if (!tenantId || !taxType || !serviceType || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Generate filing ID
    const filingId = uuidv4();
    
    // Create filing record in backend
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/taxes/filing/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-User-Email': userResult.user.email
      },
      body: JSON.stringify({
        filing_id: filingId,
        tax_type: taxType,
        service_type: serviceType,
        price,
        period,
        due_date: dueDate,
        status: 'payment_pending',
        user_email: userResult.user.email,
        created_at: new Date().toISOString()
      })
    });
    
    if (!backendResponse.ok) {
      throw new Error('Failed to create filing record');
    }
    
    // Create Stripe payment session for the filing fee
    const stripeResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payments/create-filing-session/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify({
        filing_id: filingId,
        amount: price * 100, // Convert to cents
        description: `${taxType === 'sales' ? 'Sales' : taxType === 'payroll' ? 'Payroll' : 'Income'} Tax Filing - ${serviceType === 'fullService' ? 'Full Service' : 'Self Service'}`,
        metadata: {
          tenant_id: tenantId,
          filing_id: filingId,
          tax_type: taxType,
          service_type: serviceType
        },
        success_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/tax-filing/success?filing_id=${filingId}`,
        cancel_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/tax-filing/cancel`
      })
    });
    
    if (!stripeResponse.ok) {
      throw new Error('Failed to create payment session');
    }
    
    const paymentData = await stripeResponse.json();
    
    return NextResponse.json({
      success: true,
      filingId,
      paymentRequired: true,
      paymentUrl: paymentData.url,
      sessionId: paymentData.sessionId
    });
    
  } catch (error) {
    console.error('[api/taxes/filing/initiate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate tax filing' },
      { status: 500 }
    );
  }
}