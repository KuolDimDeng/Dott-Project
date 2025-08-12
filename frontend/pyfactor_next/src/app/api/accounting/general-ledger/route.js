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
    
    // Try multiple possible endpoints - first try transactions, then journal entries, then general ledger
    let response = await fetch(`${API_BASE_URL}/api/finance/api/transactions/?${params}`, {
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `sid=${sessionId.value}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    // If transactions fails, try journal-entries endpoint
    if (!response.ok || response.status === 404) {
      response = await fetch(`${API_BASE_URL}/api/finance/journal-entries/?${params}`, {
        headers: {
          'Authorization': `Session ${sessionId.value}`,
          'Cookie': `sid=${sessionId.value}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
    }
    
    // If journal-entries fails, try general-ledger endpoint
    if (!response.ok || response.status === 404) {
      response = await fetch(`${API_BASE_URL}/api/finance/general-ledger/?${params}`, {
        headers: {
          'Authorization': `Session ${sessionId.value}`,
          'Cookie': `sid=${sessionId.value}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
    }
    
    if (!response.ok) {
      console.error('[GeneralLedger API] Backend error:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch general ledger' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Transform the data to match frontend expectations
    const entries = Array.isArray(data) ? data : (data.entries || data.results || data.lines || []);
    
    // Running balance calculation
    let runningBalance = 0;
    
    const transformedEntries = entries.map(entry => {
      // Handle journal entry line items format
      const isJournalLine = entry.journal_entry || entry.journal;
      
      let accountInfo = '';
      let accountCode = '';
      
      if (entry.account) {
        accountCode = entry.account.account_number || entry.account.code || '';
        accountInfo = `${accountCode} - ${entry.account.name || ''}`;
      } else if (entry.chart_of_account) {
        accountCode = entry.chart_of_account.account_number || '';
        accountInfo = `${accountCode} - ${entry.chart_of_account.name || ''}`;
      } else {
        accountCode = entry.account_code || entry.account_number || '';
        accountInfo = entry.account_name || '';
      }
      
      const debitAmount = parseFloat(entry.debit_amount || entry.debit || 0);
      const creditAmount = parseFloat(entry.credit_amount || entry.credit || 0);
      
      // Calculate running balance
      runningBalance += debitAmount - creditAmount;
      
      return {
        id: entry.id || entry.journal_entry_id,
        date: entry.date || entry.transaction_date || entry.created_at || 
              (isJournalLine ? entry.journal_entry?.date : null),
        account: accountInfo,
        accountCode: accountCode,
        description: entry.description || entry.memo || entry.narration || 
                    (isJournalLine ? entry.journal_entry?.description : ''),
        reference: entry.reference || entry.journal_reference || entry.reference_number ||
                  (isJournalLine ? entry.journal_entry?.reference : ''),
        journalId: entry.journal_entry_id || entry.journal_id || 
                  (isJournalLine ? entry.journal_entry?.id : null),
        debit: debitAmount,
        credit: creditAmount,
        balance: entry.balance || entry.running_balance || runningBalance,
        type: debitAmount > 0 ? 'debit' : 'credit'
      };
    });
    
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