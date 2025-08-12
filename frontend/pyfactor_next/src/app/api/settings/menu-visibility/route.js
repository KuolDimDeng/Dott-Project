import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('sid')?.value || cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Temporary solution: Return default menu settings
    // TODO: Replace with actual backend call when endpoint is implemented
    const defaultMenuSettings = [
      {
        key: 'dashboard',
        label: 'Dashboard',
        is_visible: true,
        default_visible: true,
        requires_admin: false,
        submenus: []
      },
      {
        key: 'pos',
        label: 'POS',
        is_visible: true,
        default_visible: true,
        requires_admin: false,
        submenus: []
      },
      {
        key: 'sales',
        label: 'Sales',
        is_visible: true,
        default_visible: true,
        requires_admin: false,
        submenus: [
          { key: 'invoices', label: 'Invoices', is_visible: true, default_visible: true },
          { key: 'quotes', label: 'Quotes', is_visible: true, default_visible: true },
          { key: 'customers', label: 'Customers', is_visible: true, default_visible: true }
        ]
      },
      {
        key: 'inventory',
        label: 'Inventory',
        is_visible: true,
        default_visible: true,
        requires_admin: false,
        submenus: [
          { key: 'catalog', label: 'Products', is_visible: true, default_visible: true },
          { key: 'services', label: 'Services', is_visible: true, default_visible: true },
          { key: 'warehouse_tracker', label: 'Stock Adjustments', is_visible: true, default_visible: true }
        ]
      },
      {
        key: 'jobs',
        label: 'Jobs',
        is_visible: true,
        default_visible: true,
        requires_admin: false,
        submenus: [
          { key: 'jobs_list', label: 'All Jobs', is_visible: true, default_visible: true },
          { key: 'job_costing', label: 'Job Costing', is_visible: true, default_visible: true }
        ]
      },
      {
        key: 'payments',
        label: 'Payments',
        is_visible: true,
        default_visible: true,
        requires_admin: false,
        submenus: [
          { key: 'invoice_payment', label: 'Invoice Payment', is_visible: true, default_visible: true },
          { key: 'vendor_payment', label: 'Vendor Payment', is_visible: true, default_visible: true }
        ]
      },
      {
        key: 'hr',
        label: 'HR',
        is_visible: true,
        default_visible: true,
        requires_admin: true,
        submenus: [
          { key: 'teams', label: 'Employees', is_visible: true, default_visible: true },
          { key: 'timesheets', label: 'Timesheets', is_visible: true, default_visible: true }
        ]
      },
      {
        key: 'accounting',
        label: 'Accounting',
        is_visible: true,
        default_visible: true,
        requires_admin: true,
        submenus: [
          { key: 'chart_of_accounts', label: 'Chart of Accounts', is_visible: true, default_visible: true },
          { key: 'journal_entries', label: 'Journal Entries', is_visible: true, default_visible: true }
        ]
      },
      {
        key: 'reports',
        label: 'Reports',
        is_visible: true,
        default_visible: true,
        requires_admin: false,
        submenus: []
      }
    ];

    return NextResponse.json({
      menu_settings: defaultMenuSettings,
      business_features: ['pos', 'jobs'],
      business_type: 'general'
    });
  } catch (error) {
    console.error('[Menu Visibility API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('sid')?.value || cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Temporary solution: Just return success
    // TODO: Replace with actual backend call when endpoint is implemented
    console.log('[Menu Visibility API] Menu settings update requested:', body);

    return NextResponse.json({
      success: true,
      message: 'Menu settings saved successfully'
    });
  } catch (error) {
    console.error('[Menu Visibility API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}