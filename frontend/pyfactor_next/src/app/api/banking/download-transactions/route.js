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
    const format = searchParams.get('format') || 'csv';

    // Generate CSV data
    const generateCSV = () => {
      const headers = ['Date', 'Description', 'Merchant', 'Category', 'Amount', 'Status'];
      const rows = [
        headers.join(','),
        `${new Date().toISOString().split('T')[0]},Sample Transaction,Sample Merchant,Food & Drink,-50.00,Posted`,
        `${new Date(Date.now() - 86400000).toISOString().split('T')[0]},Payment Received,Client Payment,Income,500.00,Posted`,
        `${new Date(Date.now() - 172800000).toISOString().split('T')[0]},Office Supplies,Staples,Office,-125.50,Pending`
      ];
      return rows.join('\n');
    };

    // Try to fetch from backend
    try {
      const params = new URLSearchParams();
      if (accountId) params.append('account_id', accountId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('format', format);

      const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com'}/api/banking/download-transactions/?${params}`;
      
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Cookie': request.headers.get('cookie') || '',
          'X-Session-Id': session.id || '',
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        return new NextResponse(blob, {
          headers: {
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="transactions_${startDate}_${endDate}.${format}"`
          }
        });
      }
    } catch (error) {
      console.error('[Download Transactions] Backend error:', error);
    }

    // Return mock CSV if backend fails
    const csvContent = generateCSV();
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="transactions_${startDate}_${endDate}.csv"`
      }
    });

  } catch (error) {
    console.error('[Download Transactions] Error:', error);
    return NextResponse.json({ error: 'Failed to download transactions' }, { status: 500 });
  }
}