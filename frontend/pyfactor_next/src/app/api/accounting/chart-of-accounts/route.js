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
    const response = await fetch(`${API_BASE_URL}/api/finance/api/chart-of-accounts/`, {
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `sid=${sessionId.value}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error('[ChartOfAccounts API] Backend error:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch chart of accounts' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Transform the data to match frontend expectations
    const accounts = Array.isArray(data) ? data : (data.accounts || data.results || []);
    
    const transformedAccounts = accounts.map(account => ({
      id: account.id,
      code: account.account_number || account.code,
      name: account.name || account.account_name,
      type: account.category?.name?.toLowerCase() || account.account_type || 'asset',
      description: account.description || '',
      normalBalance: account.normal_balance || 'debit',
      currentBalance: parseFloat(account.balance || account.current_balance || 0),
      isActive: account.is_active !== false,
      parentAccount: account.parent_account || null,
      taxRate: account.tax_rate || null,
      notes: account.notes || ''
    }));
    
    return NextResponse.json(transformedAccounts);
  } catch (error) {
    console.error('[ChartOfAccounts API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart of accounts' },
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
      account_number: body.code,
      name: body.name,
      account_type: body.type,
      description: body.description,
      normal_balance: body.normalBalance,
      balance: body.currentBalance || 0,
      is_active: body.isActive !== false,
      parent_account: body.parentAccount || null,
      tax_rate: body.taxRate || null,
      notes: body.notes || ''
    };
    
    const response = await fetch(`${API_BASE_URL}/api/finance/api/chart-of-accounts/`, {
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
      console.error('[ChartOfAccounts API] Create error:', error);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[ChartOfAccounts API] Create error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
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
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Transform to backend format
    const backendData = {
      account_number: body.code,
      name: body.name,
      account_type: body.type,
      description: body.description,
      normal_balance: body.normalBalance,
      balance: body.currentBalance || 0,
      is_active: body.isActive !== false,
      parent_account: body.parentAccount || null,
      tax_rate: body.taxRate || null,
      notes: body.notes || ''
    };
    
    const response = await fetch(`${API_BASE_URL}/api/finance/api/chart-of-accounts/${id}/`, {
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
      console.error('[ChartOfAccounts API] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update account' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[ChartOfAccounts API] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
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
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }
    
    const response = await fetch(`${API_BASE_URL}/api/finance/api/chart-of-accounts/${id}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `sid=${sessionId.value}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[ChartOfAccounts API] Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: response.status }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ChartOfAccounts API] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}