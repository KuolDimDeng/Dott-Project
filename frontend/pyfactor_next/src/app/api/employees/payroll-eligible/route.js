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

    // Get current pay period dates (assuming bi-weekly payroll)
    const today = new Date();
    const payPeriodEnd = new Date(today);
    payPeriodEnd.setDate(today.getDate() - (today.getDay() === 0 ? 7 : today.getDay())); // Last Sunday
    const payPeriodStart = new Date(payPeriodEnd);
    payPeriodStart.setDate(payPeriodEnd.getDate() - 13); // 2 weeks ago

    // Fetch payroll-eligible employees from backend
    const response = await fetch(`${process.env.BACKEND_URL}/api/employees/payroll-eligible/`, {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      // Fetch timesheet data for each employee
      const employeesWithTimesheets = await Promise.all(
        data.employees.map(async (emp) => {
          let timesheetData = {
            hasTimesheet: false,
            timesheetStatus: 'missing',
            totalHours: 0,
            regularHours: 0,
            overtimeHours: 0,
            sickHours: 0,
            vacationHours: 0,
            holidayHours: 0,
            unpaidHours: 0,
            totalPay: 0,
            timesheetId: null,
            weeksCovered: []
          };

          try {
            // Fetch timesheets for this employee in the pay period
            const timesheetResponse = await fetch(
              `${process.env.BACKEND_URL}/timesheets/timesheets/?employee_id=${emp.id}&period_start=${payPeriodStart.toISOString().split('T')[0]}&period_end=${payPeriodEnd.toISOString().split('T')[0]}`,
              {
                headers: {
                  'Cookie': request.headers.get('cookie') || '',
                  'Content-Type': 'application/json'
                }
              }
            );

            if (timesheetResponse.ok) {
              const timesheetResult = await timesheetResponse.json();
              const timesheets = timesheetResult.results || [];
              
              if (timesheets.length > 0) {
                // Calculate totals from all timesheets in the pay period
                let totalRegular = 0, totalOvertime = 0, totalSick = 0;
                let totalVacation = 0, totalHoliday = 0, totalUnpaid = 0;
                let allApproved = true;
                
                timesheets.forEach(ts => {
                  totalRegular += parseFloat(ts.total_regular_hours || 0);
                  totalOvertime += parseFloat(ts.total_overtime_hours || 0);
                  totalSick += parseFloat(ts.total_sick_hours || 0);
                  totalVacation += parseFloat(ts.total_vacation_hours || 0);
                  totalHoliday += parseFloat(ts.total_holiday_hours || 0);
                  totalUnpaid += parseFloat(ts.total_unpaid_hours || 0);
                  
                  if (ts.status !== 'APPROVED') {
                    allApproved = false;
                  }
                });

                const totalHours = totalRegular + totalOvertime + totalSick + totalVacation + totalHoliday + totalUnpaid;
                const hourlyRate = parseFloat(emp.compensation_type === 'SALARY' 
                  ? (emp.salary || 0) / 2080 // Annual salary / 2080 hours
                  : emp.wage_per_hour || 0);
                
                // Calculate total pay (overtime at 1.5x, sick/vacation/holiday at regular rate)
                const totalPay = (totalRegular * hourlyRate) + 
                                 (totalOvertime * hourlyRate * 1.5) + 
                                 (totalSick * hourlyRate) + 
                                 (totalVacation * hourlyRate) + 
                                 (totalHoliday * hourlyRate);

                timesheetData = {
                  hasTimesheet: true,
                  timesheetStatus: allApproved ? 'approved' : 'pending',
                  totalHours,
                  regularHours: totalRegular,
                  overtimeHours: totalOvertime,
                  sickHours: totalSick,
                  vacationHours: totalVacation,
                  holidayHours: totalHoliday,
                  unpaidHours: totalUnpaid,
                  totalPay,
                  timesheetId: timesheets[0]?.id,
                  weeksCovered: timesheets.length,
                  timesheets: timesheets.map(ts => ({
                    id: ts.id,
                    status: ts.status,
                    periodStart: ts.period_start,
                    periodEnd: ts.period_end,
                    totalHours: ts.total_hours || 0
                  }))
                };
              }
            }
          } catch (error) {
            logger.error(`Error fetching timesheet for employee ${emp.id}:`, error);
          }

          // Transform backend data to frontend format with timesheet integration
          return {
            id: emp.id,
            name: emp.full_name || `${emp.first_name} ${emp.last_name}`.trim(),
            initials: emp.initials || (emp.first_name?.[0] || '') + (emp.last_name?.[0] || ''),
            position: emp.job_title || emp.position || 'Employee',
            status: emp.employment_status || 'active',
            salaryType: emp.compensation_type === 'SALARY' ? 'monthly' : 'hourly',
            salary: emp.salary || 0,
            hourlyRate: emp.compensation_type === 'SALARY' 
              ? (emp.salary || 0) / 2080 
              : emp.wage_per_hour || 0,
            defaultHours: emp.default_hours_per_period || 40,
            country: emp.country || 'US',
            state: emp.state || '',
            isNew: emp.is_new_employee || false,
            includeInPayroll: emp.employment_status === 'active' && timesheetData.timesheetStatus === 'approved',
            // Use timesheet hours if available, otherwise fall back to defaults
            hoursWorked: timesheetData.hasTimesheet ? timesheetData.totalHours : (emp.default_hours_per_period || 40),
            compensationType: emp.compensation_type,
            // Add timesheet data
            timesheet: timesheetData
          };
        })
      );
      
      const employees = employeesWithTimesheets;

      // Calculate summary statistics
      const stats = {
        total: employees.length,
        withApprovedTimesheets: employees.filter(e => e.timesheet.timesheetStatus === 'approved').length,
        withPendingTimesheets: employees.filter(e => e.timesheet.timesheetStatus === 'pending').length,
        missingTimesheets: employees.filter(e => !e.timesheet.hasTimesheet).length,
        totalPayrollAmount: employees
          .filter(e => e.timesheet.timesheetStatus === 'approved')
          .reduce((sum, e) => sum + e.timesheet.totalPay, 0),
        totalHours: employees
          .filter(e => e.timesheet.timesheetStatus === 'approved')
          .reduce((sum, e) => sum + e.timesheet.totalHours, 0)
      };

      return NextResponse.json({
        employees,
        payPeriod: {
          startDate: payPeriodStart.toISOString().split('T')[0],
          endDate: payPeriodEnd.toISOString().split('T')[0],
          weeksInPeriod: 2
        },
        stats,
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