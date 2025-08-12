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
    
    const transformedAccounts = accounts.map(account => {
      // First check the account name for specific overrides
      const accountName = (account.name || account.account_name || '').toLowerCase();
      let accountType = 'asset'; // default
      
      // Override based on specific account names
      if (accountName.includes('sales revenue') || accountName === 'sales') {
        accountType = 'revenue';
      } else if (accountName.includes('sales tax payable') || accountName.includes('tax payable')) {
        accountType = 'liability';
      } else if (accountName.includes('cost of goods sold') || accountName === 'cogs') {
        accountType = 'expense';
      } else if (accountName.includes('inventory')) {
        accountType = 'asset';
      } else if (account.category?.name) {
        // Check various possible field names for account type
        accountType = account.category.name.toLowerCase();
      } else if (account.account_type) {
        accountType = account.account_type.toLowerCase();
      } else if (account.type) {
        accountType = account.type.toLowerCase();
      } else if (account.account_number || account.code) {
        // Infer type from account code ranges
        const code = parseInt(account.account_number || account.code);
        if (code >= 1000 && code < 2000) accountType = 'asset';
        else if (code >= 2000 && code < 3000) accountType = 'liability';
        else if (code >= 3000 && code < 4000) accountType = 'equity';
        else if (code >= 4000 && code < 5000) accountType = 'revenue';
        else if (code >= 5000 && code < 6000) accountType = 'expense';
        else if (code >= 6000 && code < 7000) accountType = 'expense'; // COGS is an expense
      }
      
      // Normalize account type names
      if (accountType === 'expenses') accountType = 'expense';
      if (accountType === 'revenues') accountType = 'revenue';
      if (accountType === 'liabilities') accountType = 'liability';
      if (accountType === 'assets') accountType = 'asset';
      if (accountType === 'cogs' || accountType === 'cost of goods sold' || accountType === 'cost_of_goods_sold') accountType = 'expense';
      
      return {
        id: account.id,
        code: account.account_number || account.code,
        name: account.name || account.account_name,
        type: accountType,
        description: account.description || '',
        normalBalance: account.normal_balance || (accountType === 'asset' || accountType === 'expense' ? 'debit' : 'credit'),
        currentBalance: parseFloat(account.balance || account.current_balance || 0),
        isActive: account.is_active !== false,
        parentAccount: account.parent_account || null,
        taxRate: account.tax_rate || null,
        notes: account.notes || ''
      };
    });
    
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