import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * POST /api/taxes/calculate-customer-rate
 * Calculate tax rate based on customer's shipping/billing address
 */
export async function POST(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      console.error('[Calculate Customer Tax] No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { customerId, businessCountry } = body;
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }
    
    console.log('[Calculate Customer Tax] Fetching customer:', customerId);
    console.log('[Calculate Customer Tax] Business country:', businessCountry);
    
    // First, fetch the customer details
    const customerResponse = await fetch(`${BACKEND_URL}/api/crm/customers/${customerId}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!customerResponse.ok) {
      console.error('[Calculate Customer Tax] Failed to fetch customer');
      return NextResponse.json(
        { error: 'Failed to fetch customer details' },
        { status: customerResponse.status }
      );
    }
    
    const customer = await customerResponse.json();
    console.log('[Calculate Customer Tax] Customer data:', {
      shipping_country: customer.shipping_country,
      shipping_state: customer.shipping_state,
      shipping_county: customer.shipping_county,
      billing_country: customer.country,
      billing_state: customer.state,
      billing_county: customer.billing_county
    });
    
    // Use shipping address if available, otherwise billing address
    const customerCountry = customer.shipping_country || customer.country;
    const customerState = customer.shipping_state || customer.state;
    const customerCounty = customer.shipping_county || customer.billing_county;
    
    // Determine which address to use for tax calculation
    let country = customerCountry;
    let state = customerState;
    let county = customerCounty;
    let addressSource = 'customer';
    
    // If customer has no address, use business address for tax calculation
    if (!customerCountry) {
      console.log('[Calculate Customer Tax] Customer has no address, will use business address for tax');
      
      // We need to fetch business address - it should be passed from frontend
      const { businessState, businessCounty } = body;
      
      country = businessCountry;
      state = businessState || '';
      county = businessCounty || '';
      addressSource = 'business_default';
      
      console.log(`[Calculate Customer Tax] Using business address: ${country}, ${state}, ${county}`);
    }
    
    // IMPORTANT: International tax rule - no tax if customer is in different country
    if (customerCountry && businessCountry && customerCountry !== businessCountry) {
      console.log('[Calculate Customer Tax] International sale - no tax collected');
      console.log(`[Calculate Customer Tax] Business: ${businessCountry}, Customer: ${customerCountry}`);
      return NextResponse.json({
        tax_rate: 0,
        tax_percentage: 0,
        source: 'international',
        message: `International sale - Customer in ${customerCountry}, no tax collected`,
        jurisdiction: {
          country: customerCountry,
          country_name: customerCountry,
          state: customerState,
          county: customerCounty,
          international_sale: true
        },
        customer_name: customer.business_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email,
        address_type: 'international'
      });
    }
    
    if (!country) {
      console.log('[Calculate Customer Tax] No address available for tax calculation');
      return NextResponse.json({
        tax_rate: 0,
        source: 'no_address',
        message: 'No address available for tax calculation'
      });
    }
    
    // Build query parameters for tax calculation
    const queryParams = new URLSearchParams({
      country: country,
      ...(state && { state: state }),
      ...(county && { county: county })
    });
    
    console.log('[Calculate Customer Tax] Calculating tax for:', queryParams.toString());
    
    // Call the tax calculation endpoint
    const taxResponse = await fetch(
      `${BACKEND_URL}/api/taxes/calculate/?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Session ${sidCookie.value}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!taxResponse.ok) {
      console.error('[Calculate Customer Tax] Tax calculation failed');
      return NextResponse.json({
        tax_rate: 0,
        source: 'error',
        message: 'Failed to calculate tax rate'
      });
    }
    
    const taxData = await taxResponse.json();
    console.log('[Calculate Customer Tax] Tax calculation result:', taxData);
    
    // Return the tax rate with additional context
    return NextResponse.json({
      tax_rate: taxData.tax_rate || 0,
      tax_percentage: (taxData.tax_rate || 0) * 100,
      source: taxData.source || 'calculated',
      jurisdiction: {
        country: country,
        country_name: taxData.country_name || country,
        state: state,
        state_name: taxData.state_name || state,
        county: county,
        tax_authority: taxData.tax_authority
      },
      customer_name: customer.business_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email,
      address_type: addressSource === 'business_default' ? 'business_default' : 
                    (customer.shipping_country ? 'shipping' : 'billing'),
      message: addressSource === 'business_default' ? 
               'Customer has no address - using business location for tax' : 
               `Using customer's ${customer.shipping_country ? 'shipping' : 'billing'} address`
    });
    
  } catch (error) {
    console.error('[Calculate Customer Tax] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        tax_rate: 0,
        source: 'error'
      },
      { status: 500 }
    );
  }
}