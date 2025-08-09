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
    const statementType = searchParams.get('type') || 'balance-sheet';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    // Build query params
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    // Determine endpoint based on statement type
    let endpoint;
    switch(statementType) {
      case 'balance-sheet':
        endpoint = '/api/balance-sheet/';
        break;
      case 'income-statement':
        endpoint = '/api/profit-and-loss/';
        break;
      case 'cash-flow':
        endpoint = '/api/cash-flow/';
        break;
      default:
        endpoint = '/api/balance-sheet/';
    }
    
    // Fetch from Django backend
    const response = await fetch(`${API_BASE_URL}${endpoint}?${params}`, {
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `sid=${sessionId.value}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error('[FinancialStatements API] Backend error:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch financial statements' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Transform the data based on statement type
    if (statementType === 'balance-sheet') {
      return NextResponse.json({
        asOf: endDate || new Date().toISOString().split('T')[0],
        assets: data.assets || {
          current: {
            cash: 0,
            accountsReceivable: 0,
            inventory: 0,
            prepaidExpenses: 0,
            totalCurrent: 0
          },
          nonCurrent: {
            propertyPlantEquipment: 0,
            accumulatedDepreciation: 0,
            intangibleAssets: 0,
            totalNonCurrent: 0
          },
          totalAssets: 0
        },
        liabilities: data.liabilities || {
          current: {
            accountsPayable: 0,
            accruedExpenses: 0,
            shortTermDebt: 0,
            totalCurrent: 0
          },
          nonCurrent: {
            longTermDebt: 0,
            deferredTaxLiabilities: 0,
            totalNonCurrent: 0
          },
          totalLiabilities: 0
        },
        equity: data.equity || {
          commonStock: 0,
          retainedEarnings: 0,
          totalEquity: 0
        },
        totalLiabilitiesAndEquity: data.totalLiabilitiesAndEquity || 0
      });
    } else if (statementType === 'income-statement') {
      return NextResponse.json({
        period: { startDate, endDate },
        revenue: data.revenue || {
          salesRevenue: 0,
          serviceRevenue: 0,
          otherRevenue: 0,
          totalRevenue: 0
        },
        costOfGoodsSold: data.costOfGoodsSold || 0,
        grossProfit: data.grossProfit || 0,
        operatingExpenses: data.operatingExpenses || {
          salariesAndWages: 0,
          rent: 0,
          utilities: 0,
          depreciation: 0,
          marketing: 0,
          administrative: 0,
          totalOperating: 0
        },
        operatingIncome: data.operatingIncome || 0,
        otherIncome: data.otherIncome || 0,
        interestExpense: data.interestExpense || 0,
        incomeBeforeTax: data.incomeBeforeTax || 0,
        taxExpense: data.taxExpense || 0,
        netIncome: data.netIncome || 0
      });
    } else if (statementType === 'cash-flow') {
      return NextResponse.json({
        period: { startDate, endDate },
        operatingActivities: data.operatingActivities || {
          netIncome: 0,
          adjustments: {
            depreciation: 0,
            changesInWorkingCapital: 0,
            accountsReceivable: 0,
            inventory: 0,
            accountsPayable: 0
          },
          netCashFromOperating: 0
        },
        investingActivities: data.investingActivities || {
          purchaseOfEquipment: 0,
          saleOfAssets: 0,
          netCashFromInvesting: 0
        },
        financingActivities: data.financingActivities || {
          proceedsFromLoans: 0,
          repaymentOfLoans: 0,
          dividendsPaid: 0,
          netCashFromFinancing: 0
        },
        netChangeInCash: data.netChangeInCash || 0,
        beginningCash: data.beginningCash || 0,
        endingCash: data.endingCash || 0
      });
    } else if (statementType === 'ratios') {
      return NextResponse.json({
        liquidity: data.liquidity || {
          currentRatio: 0,
          quickRatio: 0,
          cashRatio: 0
        },
        profitability: data.profitability || {
          grossMargin: 0,
          operatingMargin: 0,
          netMargin: 0,
          returnOnAssets: 0,
          returnOnEquity: 0
        },
        leverage: data.leverage || {
          debtToEquity: 0,
          debtToAssets: 0,
          interestCoverage: 0
        },
        efficiency: data.efficiency || {
          assetTurnover: 0,
          inventoryTurnover: 0,
          receivablesTurnover: 0
        }
      });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[FinancialStatements API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial statements' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    const response = await fetch(`${API_BASE_URL}/financial-statements/generate/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `sid=${sessionId.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[FinancialStatements API] Generate error:', error);
      return NextResponse.json(
        { error: 'Failed to generate statements' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[FinancialStatements API] Generate error:', error);
    return NextResponse.json(
      { error: 'Failed to generate statements' },
      { status: 500 }
    );
  }
}