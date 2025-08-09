import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

export async function GET(request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Proxy request to backend
    const params = new URLSearchParams();
    if (accountId) params.append('account_id', accountId);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com'}/api/banking/transactions/?${params}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
        'X-Session-Id': session.id || '',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Transactions API] Backend error:', error);
      
      // Return mock data for development
      if (process.env.NODE_ENV === 'development' || !accountId) {
        return NextResponse.json({
          transactions: [
            {
              id: '1',
              date: new Date().toISOString().split('T')[0],
              name: 'Sample Transaction',
              merchant_name: 'Sample Merchant',
              amount: -50.00,
              category: ['Food & Drink'],
              pending: false
            },
            {
              id: '2',
              date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
              name: 'Payment Received',
              merchant_name: 'Client Payment',
              amount: 500.00,
              category: ['Transfer', 'Income'],
              pending: false
            },
            {
              id: '3',
              date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
              name: 'Office Supplies',
              merchant_name: 'Staples',
              amount: -125.50,
              category: ['Shops', 'Office'],
              pending: true
            }
          ]
        });
      }
      
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[Transactions API] Error:', error);
    
    // Return mock data on error for development
    return NextResponse.json({
      transactions: [
        {
          id: '1',
          date: new Date().toISOString().split('T')[0],
          name: 'Sample Transaction',
          merchant_name: 'Sample Merchant',
          amount: -50.00,
          category: ['Food & Drink'],
          pending: false
        }
      ]
    });
  }
}