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
    
    // First, get the Chart of Accounts to calculate cash flow
    try {
      const accountsResponse = await fetch(`${API_BASE_URL}/api/finance/api/chart-of-accounts/`, {
        headers: {
          'Authorization': `Session ${sessionId.value}`,
          'Cookie': `sid=${sessionId.value}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        console.log('[CashFlow API] Chart of Accounts data received');
        
        // Calculate cash flow from Chart of Accounts
        const accounts = Array.isArray(accountsData) ? accountsData : (accountsData.accounts || []);
        
        // Calculate total cash and cash equivalents (asset accounts starting with 1000-1199)
        const cashAccounts = accounts.filter(a => {
          const code = parseInt(a.account_number || a.code || 0);
          const name = (a.name || '').toLowerCase();
          return (code >= 1000 && code < 1200) || 
                 name.includes('cash') || 
                 name.includes('bank');
        });
        
        const totalCash = cashAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
        
        // Calculate revenue (inflow)
        const revenueAccounts = accounts.filter(a => {
          const code = parseInt(a.account_number || a.code || 0);
          const name = (a.name || '').toLowerCase();
          return (code >= 4000 && code < 5000) || 
                 name.includes('revenue') || 
                 name.includes('sales') ||
                 name.includes('income');
        });
        
        const totalRevenue = Math.abs(revenueAccounts.reduce((sum, a) => sum + (a.balance || 0), 0));
        
        // Calculate expenses (outflow)
        const expenseAccounts = accounts.filter(a => {
          const code = parseInt(a.account_number || a.code || 0);
          const name = (a.name || '').toLowerCase();
          return (code >= 5000 && code < 6000) || 
                 name.includes('expense') || 
                 name.includes('cost');
        });
        
        const totalExpenses = Math.abs(expenseAccounts.reduce((sum, a) => sum + (a.balance || 0), 0));
        
        // Create cash flow data for the current period
        const currentMonth = new Date().toLocaleString('default', { month: 'short' });
        const cashFlowData = [{
          period: currentMonth,
          inflow: totalRevenue,
          outflow: totalExpenses,
          netFlow: totalRevenue - totalExpenses,
          balance: totalCash
        }];
        
        console.log('[CashFlow API] Calculated cash flow:', cashFlowData);
        
        return NextResponse.json({ 
          success: true,
          data: cashFlowData,
          summary: {
            totalCash,
            totalRevenue,
            totalExpenses,
            netFlow: totalRevenue - totalExpenses
          }
        });
      }
    } catch (error) {
      console.error('[CashFlow API] Error fetching Chart of Accounts:', error);
    }
    
    // Try alternative endpoint for cash flow data
    try {
      const response = await fetch(`${API_BASE_URL}/api/finance/api/cash-flow/`, {
        headers: {
          'Authorization': `Session ${sessionId.value}`,
          'Cookie': `sid=${sessionId.value}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[CashFlow API] Finance cash flow data received:', data);
        
        // Transform if needed
        if (data && (data.cash_flow || data.data)) {
          const cashFlowData = data.cash_flow || data.data || [];
          return NextResponse.json({ 
            success: true,
            data: cashFlowData 
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