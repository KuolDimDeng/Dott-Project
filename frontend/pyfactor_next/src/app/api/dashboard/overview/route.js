import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

export async function GET(request) {
  try {
    // Get session
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters for date range
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    // Fetch dashboard data from backend
    const backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL;
    const response = await fetch(`${backendUrl}/api/dashboard/overview/?start_date=${startDate}&end_date=${endDate}`, {
      method: 'GET',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'X-Session-ID': session.sid,
      },
    });

    if (!response.ok) {
      // Return mock data for now if backend is not ready
      const mockData = {
        metrics: {
          revenue: 125430,
          revenueChange: 12.5,
          sales: 342,
          salesChange: 8.3,
          customers: 1205,
          customersChange: 15.2,
          profit: 45230,
          profitChange: -3.5
        },
        revenue: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          values: [95000, 102000, 98000, 115000, 122000, 125430]
        },
        recentTransactions: [
          {
            id: '1',
            type: 'invoice',
            number: 'INV-2024-001',
            customer_name: 'Acme Corp',
            amount: 2500,
            currency: 'USD',
            status: 'paid',
            date: new Date().toISOString()
          },
          {
            id: '2',
            type: 'expense',
            number: 'EXP-2024-042',
            vendor_name: 'Office Supplies Co',
            amount: 340,
            currency: 'USD',
            status: 'pending',
            date: new Date(Date.now() - 86400000).toISOString()
          }
        ],
        inventoryAlerts: [
          {
            id: '1',
            product_name: 'Widget A',
            current_stock: 5,
            reorder_level: 10,
            status: 'critical'
          }
        ],
        appointments: []
      };

      return NextResponse.json(mockData);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Dashboard overview error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}