import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    logger.info(`[Public Invoice API] Fetching invoice ${id}`);
    
    // This is a public endpoint - no authentication required
    // But we should only return limited invoice data
    
    // Forward request to Django backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${id}/public`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      throw new Error(`Backend returned ${response.status}`);
    }
    
    const invoice = await response.json();
    
    // Only return necessary fields for payment
    const publicInvoice = {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      status: invoice.status,
      paid_date: invoice.paid_date,
      customer_name: invoice.customer_name,
      customer_email: invoice.customer_email,
      customer_phone: invoice.customer_phone,
      business_name: invoice.business_name,
      business_email: invoice.business_email,
      business_phone: invoice.business_phone,
      business_address: invoice.business_address,
      items: invoice.items,
      subtotal: invoice.subtotal,
      tax_amount: invoice.tax_amount,
      discount_amount: invoice.discount_amount,
      shipping_cost: invoice.shipping_cost,
      total_amount: invoice.total_amount,
      currency: invoice.currency || 'USD',
      notes: invoice.notes,
      terms: invoice.terms
    };
    
    logger.info('[Public Invoice API] Successfully fetched public invoice data');
    return NextResponse.json(publicInvoice);
    
  } catch (error) {
    logger.error('[Public Invoice API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}