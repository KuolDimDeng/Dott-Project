import { cookies } from 'next/headers';

/**
 * Banking API Proxy - Sync Transactions from Plaid
 * Fetches latest transactions from Plaid and stores them
 */
export async function POST(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return Response.json({ error: 'No session found' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    
    console.log('🎯 [Sync Transactions API] === START ===');
    console.log('🎯 [Sync Transactions API] Request body:', body);
    
    // Forward request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/banking/sync/transactions/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify({
        account_id: body.account_id,
        start_date: body.start_date,
        end_date: body.end_date
      }),
    });

    console.log('🎯 [Sync Transactions API] Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('🎯 [Sync Transactions API] Backend error:', response.status, errorData);
      return Response.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('🎯 [Sync Transactions API] Success response:', data);
    console.log('🎯 [Sync Transactions API] === END ===');
    
    return Response.json(data);
    
  } catch (error) {
    console.error('🎯 [Sync Transactions API] Proxy error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}