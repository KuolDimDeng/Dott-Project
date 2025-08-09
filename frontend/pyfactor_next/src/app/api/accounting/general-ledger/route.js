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
    const accountId = searchParams.get('account_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    // Build query params
    const params = new URLSearchParams();
    if (accountId) params.append('account_id', accountId);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    // Fetch from Django backend
    const response = await fetch(`${API_BASE_URL}/api/finance/general-ledger/?${params}`, {
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `sid=${sessionId.value}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error('[GeneralLedger API] Backend error:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch general ledger' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Transform the data to match frontend expectations
    const entries = Array.isArray(data) ? data : (data.entries || data.results || []);
    
    const transformedEntries = entries.map(entry => ({
      id: entry.id,
      date: entry.date || entry.transaction_date,
      account: `${entry.account?.account_number || ''} - ${entry.account?.name || entry.account_name || ''}`,
      accountCode: entry.account?.account_number || entry.account_code,
      description: entry.description || entry.memo || '',
      reference: entry.reference || entry.journal_reference || '',
      journalId: entry.journal_entry_id || entry.journal_id,
      debit: parseFloat(entry.debit_amount || entry.debit || 0),
      credit: parseFloat(entry.credit_amount || entry.credit || 0),
      balance: parseFloat(entry.balance || entry.running_balance || 0),
      type: entry.debit_amount > 0 ? 'debit' : 'credit'
    }));
    
    // Calculate stats
    const stats = {
      totalDebits: transformedEntries.reduce((sum, e) => sum + e.debit, 0),
      totalCredits: transformedEntries.reduce((sum, e) => sum + e.credit, 0),
      transactionCount: transformedEntries.length,
      openingBalance: transformedEntries[0]?.balance || 0,
      closingBalance: transformedEntries[transformedEntries.length - 1]?.balance || 0
    };
    
    return NextResponse.json({ 
      entries: transformedEntries,
      stats 
    });
  } catch (error) {
    console.error('[GeneralLedger API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch general ledger' },
      { status: 500 }
    );
  }
}