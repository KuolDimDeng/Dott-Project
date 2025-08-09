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
    
    // Fetch from Django backend
    const response = await fetch(`${API_BASE_URL}/journal-entries/`, {
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `sid=${sessionId.value}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error('[JournalEntries API] Backend error:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch journal entries' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Transform the data to match frontend expectations
    const entries = Array.isArray(data) ? data : (data.entries || data.results || []);
    
    const transformedEntries = entries.map(entry => ({
      id: entry.id,
      date: entry.date,
      reference: entry.reference || entry.entry_number,
      description: entry.description || entry.memo,
      status: entry.status || 'draft',
      total: parseFloat(entry.total_amount || entry.total || 0),
      lines: (entry.lines || entry.journal_lines || []).map(line => ({
        id: line.id,
        account: `${line.account?.account_number || ''} - ${line.account?.name || line.account_name || ''}`,
        accountId: line.account_id || line.account,
        description: line.description || '',
        debit: parseFloat(line.debit_amount || line.debit || 0),
        credit: parseFloat(line.credit_amount || line.credit || 0)
      }))
    }));
    
    return NextResponse.json({ entries: transformedEntries });
  } catch (error) {
    console.error('[JournalEntries API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journal entries' },
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
    
    // Transform to backend format
    const backendData = {
      date: body.date,
      reference: body.reference,
      description: body.description,
      status: body.status || 'draft',
      lines: body.lines.map(line => ({
        account_id: line.accountId,
        description: line.description || '',
        debit_amount: parseFloat(line.debit || 0),
        credit_amount: parseFloat(line.credit || 0)
      }))
    };
    
    const response = await fetch(`${API_BASE_URL}/journal-entries/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `sid=${sessionId.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(backendData)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[JournalEntries API] Create error:', error);
      return NextResponse.json(
        { error: 'Failed to create journal entry' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[JournalEntries API] Create error:', error);
    return NextResponse.json(
      { error: 'Failed to create journal entry' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Transform to backend format
    const backendData = {
      date: body.date,
      reference: body.reference,
      description: body.description,
      status: body.status || 'draft',
      lines: body.lines.map(line => ({
        account_id: line.accountId,
        description: line.description || '',
        debit_amount: parseFloat(line.debit || 0),
        credit_amount: parseFloat(line.credit || 0)
      }))
    };
    
    const response = await fetch(`${API_BASE_URL}/journal-entries/${id}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `sid=${sessionId.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(backendData)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[JournalEntries API] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update journal entry' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[JournalEntries API] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update journal entry' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }
    
    const response = await fetch(`${API_BASE_URL}/journal-entries/${id}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `sid=${sessionId.value}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[JournalEntries API] Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete journal entry' },
        { status: response.status }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[JournalEntries API] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete journal entry' },
      { status: 500 }
    );
  }
}