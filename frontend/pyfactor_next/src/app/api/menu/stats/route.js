import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET(request) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    
    // Mock data for now - replace with actual database queries
    const stats = {
      sales: {
        todaySales: '$2,450',
        openOrders: 5,
        pendingTransactions: 12,
        activeProducts: 234,
        totalCustomers: 1520,
        draftEstimates: 3,
        pendingOrders: 8,
        unpaidInvoices: 15,
        reportsAvailable: 25
      },
      inventory: {
        totalProducts: 456,
        lowStock: 23,
        outOfStock: 5,
        pendingOrders: 12,
        suppliers: 45,
        warehouses: 3,
        stockValue: '$125,000',
        reportsAvailable: 15
      },
      accounting: {
        unpaidInvoices: 25,
        overdueInvoices: 5,
        pendingBills: 18,
        bankAccounts: 4,
        unreconciledTransactions: 32,
        journalEntries: 156,
        fixedAssets: 12,
        reportsAvailable: 30
      }
    };
    
    return NextResponse.json(stats[section] || {});
  } catch (error) {
    console.error('Error fetching menu stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}