// Tax Deadlines API Endpoint
// Fetches tax deadline events for calendar integration

import { NextResponse } from 'next/server';

// Mock tax deadline data (replace with actual database queries)
const mockTaxDeadlines = [
  {
    id: 'tax-1',
    title: 'Quarterly Sales Tax Filing',
    dueDate: '2025-07-31',
    type: 'sales_tax',
    description: 'Q2 2025 Sales Tax Filing',
    jurisdiction: 'California',
    amount: null,
    status: 'pending'
  },
  {
    id: 'tax-2',
    title: 'Payroll Tax Deposit',
    dueDate: '2025-08-15',
    type: 'payroll_tax',
    description: 'Monthly payroll tax deposit',
    jurisdiction: 'Federal',
    amount: null,
    status: 'pending'
  },
  {
    id: 'tax-3',
    title: 'Income Tax Quarterly Payment',
    dueDate: '2025-09-15',
    type: 'income_tax',
    description: 'Q3 2025 Estimated Income Tax Payment',
    jurisdiction: 'Federal',
    amount: null,
    status: 'pending'
  },
  {
    id: 'tax-4',
    title: 'Annual Business License Renewal',
    dueDate: '2025-12-31',
    type: 'business_license',
    description: 'Annual business license renewal',
    jurisdiction: 'City of San Francisco',
    amount: 150.00,
    status: 'pending'
  }
];

// GET - Fetch tax deadlines
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const year = searchParams.get('year') || new Date().getFullYear();
    const type = searchParams.get('type'); // Optional: filter by tax type
    const jurisdiction = searchParams.get('jurisdiction'); // Optional: filter by jurisdiction
    const upcoming = searchParams.get('upcoming'); // Optional: only show upcoming deadlines

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Validate the tenant ID
    // 2. Query the database for tax deadlines belonging to this tenant
    // 3. Consider the business location and applicable tax jurisdictions
    // 4. Apply filters for date range, type, jurisdiction, etc.
    
    console.log(`[Tax Deadlines API] Fetching tax deadlines for tenant: ${tenantId}, year: ${year}`);

    let filteredDeadlines = mockTaxDeadlines;

    // Filter by year
    filteredDeadlines = filteredDeadlines.filter(deadline => {
      const deadlineYear = new Date(deadline.dueDate).getFullYear();
      return deadlineYear === parseInt(year);
    });

    // Filter by type if specified
    if (type) {
      filteredDeadlines = filteredDeadlines.filter(deadline => deadline.type === type);
    }

    // Filter by jurisdiction if specified
    if (jurisdiction) {
      filteredDeadlines = filteredDeadlines.filter(deadline => 
        deadline.jurisdiction.toLowerCase().includes(jurisdiction.toLowerCase())
      );
    }

    // Filter for upcoming deadlines only if requested
    if (upcoming === 'true') {
      const today = new Date();
      filteredDeadlines = filteredDeadlines.filter(deadline => 
        new Date(deadline.dueDate) >= today
      );
    }

    // Sort by due date
    filteredDeadlines.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    return NextResponse.json({
      success: true,
      deadlines: filteredDeadlines,
      count: filteredDeadlines.length,
      filters: {
        year: parseInt(year),
        type,
        jurisdiction,
        upcoming: upcoming === 'true'
      }
    });

  } catch (error) {
    console.error('[Tax Deadlines API] Error fetching tax deadlines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax deadlines' },
      { status: 500 }
    );
  }
}

// POST - Create new tax deadline
export async function POST(request) {
  try {
    const body = await request.json();
    const { tenantId, title, dueDate, type, description, jurisdiction, amount } = body;

    if (!tenantId || !title || !dueDate || !type) {
      return NextResponse.json(
        { error: 'Tenant ID, title, due date, and type are required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Validate the tenant ID and user permissions
    // 2. Create the tax deadline in the database
    // 3. Set up reminders/notifications for the deadline
    
    const newDeadline = {
      id: `tax-${Date.now()}`,
      title,
      dueDate,
      type,
      description: description || '',
      jurisdiction: jurisdiction || 'Not specified',
      amount: amount || null,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    console.log(`[Tax Deadlines API] Creating tax deadline for tenant: ${tenantId}`, newDeadline);

    return NextResponse.json({
      success: true,
      deadline: newDeadline,
      message: 'Tax deadline created successfully'
    });

  } catch (error) {
    console.error('[Tax Deadlines API] Error creating tax deadline:', error);
    return NextResponse.json(
      { error: 'Failed to create tax deadline' },
      { status: 500 }
    );
  }
}

// PUT - Update tax deadline
export async function PUT(request) {
  try {
    const body = await request.json();
    const { deadlineId, tenantId, title, dueDate, type, description, jurisdiction, amount, status } = body;

    if (!deadlineId || !tenantId) {
      return NextResponse.json(
        { error: 'Deadline ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Validate the tenant ID and user permissions
    // 2. Check if the deadline exists and belongs to the tenant
    // 3. Update the deadline in the database
    
    const updatedDeadline = {
      id: deadlineId,
      title,
      dueDate,
      type,
      description,
      jurisdiction,
      amount,
      status,
      updatedAt: new Date().toISOString()
    };

    console.log(`[Tax Deadlines API] Updating tax deadline ${deadlineId} for tenant: ${tenantId}`, updatedDeadline);

    return NextResponse.json({
      success: true,
      deadline: updatedDeadline,
      message: 'Tax deadline updated successfully'
    });

  } catch (error) {
    console.error('[Tax Deadlines API] Error updating tax deadline:', error);
    return NextResponse.json(
      { error: 'Failed to update tax deadline' },
      { status: 500 }
    );
  }
}