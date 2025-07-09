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
    const { 
      tenantId, 
      taxType, 
      serviceType, 
      price, 
      basePrice,
      complexityMultiplier,
      discountPercentage,
      isDeveloping,
      period, 
      dueDate,
      formType,
      formCount 
    } = body;
    
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
        base_price: basePrice,
        complexity_multiplier: complexityMultiplier || 1.0,
        discount_percentage: discountPercentage || 0,
        is_developing_country: isDeveloping || false,
        period,
        due_date: dueDate,
        form_type: formType,
        form_count: formCount,
        status: 'payment_pending',
        user_email: userResult.user.email,
        created_at: new Date().toISOString()
      })
    });
    
    if (!backendResponse.ok) {
      throw new Error('Failed to create filing record');
    }
    
    // Determine payment method based on user's country
    let paymentMethod = 'stripe';
    try {
      const businessResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/business/`, {
        headers: {
          'X-Tenant-ID': tenantId,
          'X-User-Email': userResult.user.email
        }
      });
      
      if (businessResponse.ok) {
        const businessData = await businessResponse.json();
        if (businessData.country === 'KE') {
          paymentMethod = 'mpesa';
        }
      }
    } catch (error) {
      console.log('[api/taxes/filing/initiate] Using default payment method');
    }
    
    // Create payment session for the filing fee
    const paymentResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payments/create-filing-session/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-User-Email': userResult.user.email
      },
      body: JSON.stringify({
        filing_id: filingId,
        amount: price * 100, // Convert to cents
        description: `${taxType === 'sales' ? 'Sales' : taxType === 'payroll' ? 'Payroll' : 'Income'} Tax Filing - ${serviceType === 'fullService' ? 'Full Service' : 'Self Service'}`,
        metadata: {
          tenant_id: tenantId,
          filing_id: filingId,
          tax_type: taxType,
          service_type: serviceType,
          is_developing: isDeveloping,
          discount_percentage: discountPercentage
        },
        success_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/tax-filing/success?filing_id=${filingId}`,
        cancel_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/tax-filing/cancel`,
        payment_method: paymentMethod
      })
    });
    
    if (!paymentResponse.ok) {
      throw new Error('Failed to create payment session');
    }
    
    const paymentData = await paymentResponse.json();
    
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