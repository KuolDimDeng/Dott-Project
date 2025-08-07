import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month';
    
    console.log('[CashFlow API] Fetching cash flow data for range:', range);
    
    try {
      // Try to fetch real cash flow data from backend
      const response = await fetch(`${API_BASE_URL}/api/analysis/cash-flow-data`, {
        headers: {
          'Authorization': `Session ${sessionId.value}`,
          'Cookie': `sid=${sessionId.value}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[CashFlow API] Backend data received:', data);
        
        // Transform backend data to match widget format
        if (data.cash_flow_data) {
          const transformedData = data.cash_flow_data.map(item => ({
            period: item.month || item.period || 'Unknown',
            month: item.month || item.period, // For compatibility
            inflow: item.total_income || item.inflow || 0,
            outflow: item.total_expenses || item.outflow || 0,
            netFlow: (item.total_income || 0) - (item.total_expenses || 0),
            balance: item.net_cash_flow || item.balance || 0
          }));
          
          // Calculate running balance
          let runningBalance = 0;
          transformedData.forEach(item => {
            runningBalance += item.netFlow;
            item.balance = runningBalance;
          });
          
          return NextResponse.json({ 
            success: true,
            data: transformedData 
          });
        }
      }
    } catch (backendError) {
      console.error('[CashFlow API] Backend fetch error:', backendError);
    }
    
    // If no real data, return empty array (no mock data)
    console.log('[CashFlow API] No real data available');
    return NextResponse.json({ 
      success: true,
      data: [],
      message: 'No cash flow data available. Add transactions to see your cash flow.'
    });
    
  } catch (error) {
    console.error('[CashFlow API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash flow data' },
      { status: 500 }
    );
  }
}