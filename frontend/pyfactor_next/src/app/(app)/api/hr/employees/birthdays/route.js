// Employee Birthdays API Endpoint
// Fetches employee birthdays from the database for calendar display

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

// GET - Fetch employee birthdays from database
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const month = searchParams.get('month'); // Optional: filter by month

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Build query parameters
    const queryParams = new URLSearchParams({
      tenant_id: tenantId,
      active: 'true' // Only get active employees
    });

    if (month) queryParams.append('birth_month', month);

    // Fetch employees from backend
    const response = await fetch(
      `${API_BASE_URL}/api/hr/employees?${queryParams}`,
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
      console.error('[Birthday API] Backend error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch employee data' },
        { status: response.status }
      );
    }

    const employees = await response.json();
    const currentYear = new Date().getFullYear();

    // Transform employee data to calendar birthday events
    const birthdayEvents = employees
      .filter(employee => employee.date_of_birth) // Only employees with birthdays
      .map(employee => {
        const birthDate = new Date(employee.date_of_birth);
        const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
        const nextYearBirthday = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate());
        
        // Calculate age
        const age = currentYear - birthDate.getFullYear();
        
        return {
          id: `birthday-${employee.id}-${currentYear}`,
          title: `🎂 ${employee.first_name} ${employee.last_name}'s Birthday`,
          start: thisYearBirthday.toISOString().split('T')[0],
          allDay: true,
          type: 'birthday',
          backgroundColor: '#F59E0B',
          borderColor: '#F59E0B',
          editable: false,
          extendedProps: {
            employeeId: employee.id,
            employeeName: `${employee.first_name} ${employee.last_name}`,
            department: employee.department,
            age: age,
            email: employee.email,
            recurring: true
          }
        };
      });

    // Add next year's birthdays for the current month if we're in December
    if (new Date().getMonth() === 11) { // December
      const nextYearEvents = employees
        .filter(employee => employee.date_of_birth)
        .filter(employee => {
          const birthMonth = new Date(employee.date_of_birth).getMonth();
          return birthMonth === 0; // January birthdays
        })
        .map(employee => {
          const birthDate = new Date(employee.date_of_birth);
          const nextYearBirthday = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate());
          const age = (currentYear + 1) - birthDate.getFullYear();
          
          return {
            id: `birthday-${employee.id}-${currentYear + 1}`,
            title: `🎂 ${employee.first_name} ${employee.last_name}'s Birthday`,
            start: nextYearBirthday.toISOString().split('T')[0],
            allDay: true,
            type: 'birthday',
            backgroundColor: '#F59E0B',
            borderColor: '#F59E0B',
            editable: false,
            extendedProps: {
              employeeId: employee.id,
              employeeName: `${employee.first_name} ${employee.last_name}`,
              department: employee.department,
              age: age,
              email: employee.email,
              recurring: true
            }
          };
        });
      
      birthdayEvents.push(...nextYearEvents);
    }

    return NextResponse.json(birthdayEvents);
  } catch (error) {
    console.error('[Birthday API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}