// HR Employee Birthdays API Endpoint
// Fetches employee birthday events for calendar integration

import { NextResponse } from 'next/server';

// Mock employee birthday data (replace with actual database queries)
const mockEmployeeBirthdays = [
  {
    employeeId: 'emp-1',
    name: 'John Doe',
    date: '2025-07-15', // July 15th
    department: 'Engineering'
  },
  {
    employeeId: 'emp-2',
    name: 'Jane Smith',
    date: '2025-07-22', // July 22nd
    department: 'Marketing'
  },
  {
    employeeId: 'emp-3',
    name: 'Mike Johnson',
    date: '2025-08-03', // August 3rd
    department: 'Sales'
  }
];

// GET - Fetch employee birthdays
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const year = searchParams.get('year') || new Date().getFullYear();
    const month = searchParams.get('month'); // Optional: filter by specific month

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Validate the tenant ID
    // 2. Query the database for employees belonging to this tenant
    // 3. Extract birthday information and format for the current year
    // 4. Apply any date range filters
    
    console.log(`[HR Birthdays API] Fetching employee birthdays for tenant: ${tenantId}, year: ${year}`);

    // Filter birthdays by month if specified
    let filteredBirthdays = mockEmployeeBirthdays;
    if (month) {
      filteredBirthdays = mockEmployeeBirthdays.filter(birthday => {
        const birthdayMonth = new Date(birthday.date).getMonth() + 1;
        return birthdayMonth === parseInt(month);
      });
    }

    // Format birthdays for the specified year
    const formattedBirthdays = filteredBirthdays.map(birthday => {
      const birthdayDate = new Date(birthday.date);
      const thisYearBirthday = new Date(year, birthdayDate.getMonth(), birthdayDate.getDate());
      
      return {
        ...birthday,
        date: thisYearBirthday.toISOString().split('T')[0], // Format as YYYY-MM-DD
        age: year - birthdayDate.getFullYear() // Calculate age (if birth year was provided)
      };
    });

    return NextResponse.json({
      success: true,
      birthdays: formattedBirthdays,
      count: formattedBirthdays.length,
      year: parseInt(year),
      month: month ? parseInt(month) : null
    });

  } catch (error) {
    console.error('[HR Birthdays API] Error fetching employee birthdays:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee birthdays' },
      { status: 500 }
    );
  }
}

// POST - Add/Update employee birthday information
export async function POST(request) {
  try {
    const body = await request.json();
    const { tenantId, employeeId, name, birthDate, department } = body;

    if (!tenantId || !employeeId || !name || !birthDate) {
      return NextResponse.json(
        { error: 'Tenant ID, employee ID, name, and birth date are required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Validate the tenant ID and user permissions
    // 2. Check if the employee exists and belongs to the tenant
    // 3. Update the employee's birthday information in the database
    
    console.log(`[HR Birthdays API] Adding/updating birthday for employee ${employeeId} in tenant: ${tenantId}`);

    const updatedEmployee = {
      employeeId,
      name,
      date: birthDate,
      department: department || 'Not specified',
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      employee: updatedEmployee,
      message: 'Employee birthday information updated successfully'
    });

  } catch (error) {
    console.error('[HR Birthdays API] Error updating employee birthday:', error);
    return NextResponse.json(
      { error: 'Failed to update employee birthday information' },
      { status: 500 }
    );
  }
}