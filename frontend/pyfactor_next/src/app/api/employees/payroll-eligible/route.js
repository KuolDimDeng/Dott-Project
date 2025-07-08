import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function GET(request) {
  try {
    // Get session to verify authentication
    const sessionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/session-v2`, {
      headers: {
        'Cookie': request.headers.get('cookie') || ''
      }
    });

    if (!sessionResponse.ok) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const sessionData = await sessionResponse.json();
    if (!sessionData.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Fetch payroll-eligible employees from backend
    const response = await fetch(`${process.env.BACKEND_URL}/api/employees/payroll-eligible/`, {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      // Transform backend data to frontend format
      const employees = data.employees.map(emp => ({
        id: emp.id,
        name: emp.full_name || `${emp.first_name} ${emp.last_name}`.trim(),
        initials: emp.initials || (emp.first_name?.[0] || '') + (emp.last_name?.[0] || ''),
        position: emp.job_title || emp.position || 'Employee',
        status: emp.employment_status || 'active',
        salaryType: emp.pay_type || 'monthly',
        salary: emp.salary || 0,
        hourlyRate: emp.hourly_rate || 0,
        defaultHours: emp.default_hours_per_period || 40,
        country: emp.country || 'US',
        state: emp.state || '',
        isNew: emp.is_new_employee || false,
        includeInPayroll: emp.employment_status === 'active',
        hoursWorked: emp.default_hours_per_period || 40
      }));

      return NextResponse.json({
        employees,
        total: employees.length
      });
    } else {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.detail || 'Failed to fetch employees' },
        { status: response.status }
      );
    }

  } catch (error) {
    logger.error('Error fetching payroll-eligible employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}