// Tax Deadlines API Endpoint
// Fetches tax deadlines and filing dates from the database

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

// GET - Fetch tax deadlines from database
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const year = searchParams.get('year') || new Date().getFullYear();
    const taxType = searchParams.get('type'); // Optional: filter by tax type

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Build query parameters
    const queryParams = new URLSearchParams({
      tenant_id: tenantId,
      year: year
    });

    if (taxType) queryParams.append('tax_type', taxType);

    // Fetch tax settings and deadlines from backend
    const response = await fetch(
      `${API_BASE_URL}/api/taxes/deadlines?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
          'X-Tenant-Id': tenantId
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Tax Deadlines API] Backend error:', errorData);
      
      // If no tax deadlines found, return empty array instead of error
      if (response.status === 404) {
        return NextResponse.json([]);
      }
      
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch tax deadlines' },
        { status: response.status }
      );
    }

    const taxDeadlines = await response.json();

    // Transform tax deadlines to calendar events
    const taxEvents = taxDeadlines.map(deadline => ({
      id: `tax-${deadline.id}`,
      title: `📋 ${deadline.tax_name} - ${deadline.form_type || 'Filing Due'}`,
      start: deadline.due_date,
      allDay: true,
      type: 'tax',
      backgroundColor: '#DC2626',
      borderColor: '#DC2626',
      editable: false,
      extendedProps: {
        taxType: deadline.tax_type,
        formType: deadline.form_type,
        description: deadline.description,
        filingFrequency: deadline.filing_frequency,
        jurisdiction: deadline.jurisdiction,
        penalty: deadline.late_penalty,
        reminder: true,
        reminderDays: deadline.reminder_days || 7
      }
    }));

    // Also fetch any custom tax reminders from tax settings
    const settingsResponse = await fetch(
      `${API_BASE_URL}/api/taxes/settings?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
          'X-Tenant-Id': tenantId
        }
      }
    );

    if (settingsResponse.ok) {
      const taxSettings = await settingsResponse.json();
      
      // Add quarterly estimated tax payment reminders if enabled
      if (taxSettings.quarterly_reminders) {
        const quarterlyDates = [
          { quarter: 'Q1', date: `${year}-04-15`, title: 'Q1 Estimated Tax Payment Due' },
          { quarter: 'Q2', date: `${year}-06-15`, title: 'Q2 Estimated Tax Payment Due' },
          { quarter: 'Q3', date: `${year}-09-15`, title: 'Q3 Estimated Tax Payment Due' },
          { quarter: 'Q4', date: `${year + 1}-01-15`, title: 'Q4 Estimated Tax Payment Due' }
        ];

        quarterlyDates.forEach(qDate => {
          taxEvents.push({
            id: `tax-quarterly-${qDate.quarter}-${year}`,
            title: `💰 ${qDate.title}`,
            start: qDate.date,
            allDay: true,
            type: 'tax',
            backgroundColor: '#DC2626',
            borderColor: '#DC2626',
            editable: false,
            extendedProps: {
              taxType: 'estimated',
              quarter: qDate.quarter,
              description: 'Quarterly estimated tax payment deadline',
              reminder: true,
              reminderDays: 7
            }
          });
        });
      }

      // Add sales tax filing reminders based on frequency
      if (taxSettings.sales_tax_frequency) {
        const salesTaxDates = generateSalesTaxDates(year, taxSettings.sales_tax_frequency);
        salesTaxDates.forEach(taxDate => {
          taxEvents.push({
            id: `tax-sales-${taxDate.period}-${year}`,
            title: `🛒 Sales Tax Filing - ${taxDate.period}`,
            start: taxDate.date,
            allDay: true,
            type: 'tax',
            backgroundColor: '#DC2626',
            borderColor: '#DC2626',
            editable: false,
            extendedProps: {
              taxType: 'sales',
              period: taxDate.period,
              frequency: taxSettings.sales_tax_frequency,
              description: 'Sales tax filing deadline',
              reminder: true,
              reminderDays: 5
            }
          });
        });
      }
    }

    return NextResponse.json(taxEvents);
  } catch (error) {
    console.error('[Tax Deadlines API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to generate sales tax filing dates based on frequency
function generateSalesTaxDates(year, frequency) {
  const dates = [];
  
  switch (frequency) {
    case 'monthly':
      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month + 1, 20); // Usually due on 20th of following month
        dates.push({
          period: new Date(year, month).toLocaleString('default', { month: 'long' }),
          date: date.toISOString().split('T')[0]
        });
      }
      break;
      
    case 'quarterly':
      const quarters = [
        { period: 'Q1', month: 3, day: 30 }, // April 30
        { period: 'Q2', month: 6, day: 31 }, // July 31
        { period: 'Q3', month: 9, day: 31 }, // October 31
        { period: 'Q4', month: 0, day: 31 }  // January 31 next year
      ];
      
      quarters.forEach(q => {
        const qYear = q.month === 0 ? year + 1 : year;
        dates.push({
          period: q.period,
          date: new Date(qYear, q.month, q.day).toISOString().split('T')[0]
        });
      });
      break;
      
    case 'annually':
      dates.push({
        period: 'Annual',
        date: new Date(year + 1, 0, 31).toISOString().split('T')[0] // January 31
      });
      break;
  }
  
  return dates;
}