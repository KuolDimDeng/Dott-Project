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
    const reportType = searchParams.get('report_type');

    // Generate mock report data based on report type
    const generateMockReport = (type) => {
      const baseData = {
        summary: {
          total_income: 15000,
          total_expenses: 12000,
          net_cash_flow: 3000,
          starting_balance: 20000,
          ending_balance: 23000,
          avg_daily_balance: 21500,
          transaction_count: 156
        }
      };

      switch (type) {
        case 'cash-flow':
          return {
            ...baseData,
            monthly_data: [
              { date: new Date().toISOString(), income: 5000, expenses: 4000 },
              { date: new Date(Date.now() - 30 * 86400000).toISOString(), income: 5500, expenses: 4200 },
              { date: new Date(Date.now() - 60 * 86400000).toISOString(), income: 4500, expenses: 3800 }
            ],
            category_breakdown: [
              { category: 'Sales', amount: 10000, percentage: 66.7 },
              { category: 'Services', amount: 5000, percentage: 33.3 },
              { category: 'Rent', amount: -3000, percentage: 25 },
              { category: 'Payroll', amount: -6000, percentage: 50 },
              { category: 'Utilities', amount: -1500, percentage: 12.5 },
              { category: 'Supplies', amount: -1500, percentage: 12.5 }
            ],
            balance_trend: Array.from({ length: 30 }, (_, i) => ({
              date: new Date(Date.now() - i * 86400000).toISOString(),
              balance: 20000 + Math.random() * 5000
            }))
          };

        case 'balance-sheet':
          return {
            ...baseData,
            assets: {
              current: 25000,
              fixed: 15000,
              total: 40000
            },
            liabilities: {
              current: 5000,
              longTerm: 10000,
              total: 15000
            },
            equity: 25000
          };

        case 'income-statement':
          return {
            ...baseData,
            revenue: 15000,
            cost_of_goods: 6000,
            gross_profit: 9000,
            operating_expenses: 5000,
            operating_income: 4000,
            other_income: 500,
            other_expenses: 200,
            net_income: 4300
          };

        case 'expense-analysis':
          return {
            ...baseData,
            details: [
              { category: 'Payroll', amount: -6000, count: 4, average: -1500, percentage: 50 },
              { category: 'Rent', amount: -3000, count: 1, average: -3000, percentage: 25 },
              { category: 'Utilities', amount: -1500, count: 3, average: -500, percentage: 12.5 },
              { category: 'Supplies', amount: -1000, count: 8, average: -125, percentage: 8.3 },
              { category: 'Marketing', amount: -500, count: 2, average: -250, percentage: 4.2 }
            ],
            monthly_trend: Array.from({ length: 6 }, (_, i) => ({
              month: new Date(Date.now() - i * 30 * 86400000).toISOString(),
              total: 2000 + Math.random() * 1000
            }))
          };

        default:
          return baseData;
      }
    };

    // Try to fetch from backend
    try {
      const params = new URLSearchParams();
      if (accountId) params.append('account_id', accountId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (reportType) params.append('report_type', reportType);

      const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com'}/api/banking/reports/?${params}`;
      
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
          'X-Session-Id': session.id || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (error) {
      console.error('[Reports API] Backend error:', error);
    }

    // Return mock data if backend fails or for development
    return NextResponse.json(generateMockReport(reportType || 'cash-flow'));

  } catch (error) {
    console.error('[Reports API] Error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}