// Payroll Schedule API Endpoint
// Fetches payroll processing dates from the database

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...auth0]/route';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

// GET - Fetch payroll schedule from database
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const year = searchParams.get('year') || new Date().getFullYear();
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
      year: year
    });

    if (month) queryParams.append('month', month);

    // Fetch payroll settings from backend
    const settingsResponse = await fetch(
      `${API_BASE_URL}/api/payroll/settings?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
          'X-Tenant-Id': tenantId
        }
      }
    );

    let payrollSettings = {};
    if (settingsResponse.ok) {
      payrollSettings = await settingsResponse.json();
    }

    // Fetch actual payroll runs from backend
    const payrollResponse = await fetch(
      `${API_BASE_URL}/api/payroll/runs?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
          'X-Tenant-Id': tenantId
        }
      }
    );

    let payrollRuns = [];
    if (payrollResponse.ok) {
      payrollRuns = await payrollResponse.json();
    }

    // Generate payroll schedule events
    const payrollEvents = [];

    // Add completed payroll runs
    payrollRuns.forEach(run => {
      payrollEvents.push({
        id: `payroll-run-${run.id}`,
        title: `✅ Payroll Processed - ${run.pay_period}`,
        start: run.pay_date,
        allDay: true,
        type: 'payroll',
        backgroundColor: '#10B981',
        borderColor: '#10B981',
        editable: false,
        extendedProps: {
          payrollId: run.id,
          payPeriod: run.pay_period,
          employeeCount: run.employee_count,
          totalAmount: run.total_amount,
          status: run.status,
          processedDate: run.processed_date
        }
      });
    });

    // Generate future payroll dates based on frequency
    const frequency = payrollSettings.pay_frequency || 'biweekly';
    const payDayOfWeek = payrollSettings.pay_day_of_week || 5; // Default Friday
    const payDayOfMonth = payrollSettings.pay_day_of_month || 15;
    
    const futurePayrollDates = generatePayrollSchedule(
      year,
      frequency,
      payDayOfWeek,
      payDayOfMonth,
      month
    );

    // Add future payroll dates that haven't been processed yet
    futurePayrollDates.forEach(payDate => {
      // Check if this date already has a processed payroll
      const isProcessed = payrollRuns.some(run => 
        run.pay_date === payDate.date
      );

      if (!isProcessed) {
        payrollEvents.push({
          id: `payroll-scheduled-${payDate.date}`,
          title: `💰 Payroll Processing - ${payDate.period}`,
          start: payDate.date,
          allDay: true,
          type: 'payroll',
          backgroundColor: '#10B981',
          borderColor: '#10B981',
          editable: false,
          extendedProps: {
            payPeriod: payDate.period,
            frequency: frequency,
            status: 'scheduled',
            reminder: true,
            reminderDays: 3
          }
        });
      }
    });

    // Add payroll deadline reminders (processing dates)
    if (payrollSettings.reminder_enabled) {
      futurePayrollDates.forEach(payDate => {
        const reminderDate = new Date(payDate.date);
        reminderDate.setDate(reminderDate.getDate() - (payrollSettings.reminder_days || 3));
        
        payrollEvents.push({
          id: `payroll-reminder-${payDate.date}`,
          title: `⏰ Payroll Processing Reminder`,
          start: reminderDate.toISOString().split('T')[0],
          allDay: true,
          type: 'payroll',
          backgroundColor: '#F59E0B',
          borderColor: '#F59E0B',
          editable: false,
          extendedProps: {
            isReminder: true,
            payDate: payDate.date,
            payPeriod: payDate.period,
            description: `Process payroll for ${payDate.period}`
          }
        });
      });
    }

    return NextResponse.json(payrollEvents);
  } catch (error) {
    console.error('[Payroll Schedule API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to generate payroll schedule based on frequency
function generatePayrollSchedule(year, frequency, dayOfWeek, dayOfMonth, filterMonth) {
  const dates = [];
  const startDate = new Date(year, filterMonth ? parseInt(filterMonth) - 1 : 0, 1);
  const endDate = new Date(year, filterMonth ? parseInt(filterMonth) : 11, 31);
  
  switch (frequency) {
    case 'weekly':
      let currentWeek = new Date(startDate);
      // Find first occurrence of the pay day
      while (currentWeek.getDay() !== dayOfWeek) {
        currentWeek.setDate(currentWeek.getDate() + 1);
      }
      
      while (currentWeek <= endDate) {
        dates.push({
          date: currentWeek.toISOString().split('T')[0],
          period: `Week of ${currentWeek.toLocaleDateString()}`
        });
        currentWeek.setDate(currentWeek.getDate() + 7);
      }
      break;
      
    case 'biweekly':
      let currentBiweek = new Date(startDate);
      // Find first occurrence of the pay day
      while (currentBiweek.getDay() !== dayOfWeek) {
        currentBiweek.setDate(currentBiweek.getDate() + 1);
      }
      
      while (currentBiweek <= endDate) {
        dates.push({
          date: currentBiweek.toISOString().split('T')[0],
          period: `Pay Period ending ${currentBiweek.toLocaleDateString()}`
        });
        currentBiweek.setDate(currentBiweek.getDate() + 14);
      }
      break;
      
    case 'semimonthly':
      // Usually 15th and last day of month
      for (let month = startDate.getMonth(); month <= endDate.getMonth(); month++) {
        // 15th of the month
        const mid = new Date(year, month, 15);
        if (mid >= startDate && mid <= endDate) {
          dates.push({
            date: mid.toISOString().split('T')[0],
            period: `1st Half ${mid.toLocaleDateString('default', { month: 'long', year: 'numeric' })}`
          });
        }
        
        // Last day of the month
        const lastDay = new Date(year, month + 1, 0);
        if (lastDay >= startDate && lastDay <= endDate) {
          dates.push({
            date: lastDay.toISOString().split('T')[0],
            period: `2nd Half ${lastDay.toLocaleDateString('default', { month: 'long', year: 'numeric' })}`
          });
        }
      }
      break;
      
    case 'monthly':
      for (let month = startDate.getMonth(); month <= endDate.getMonth(); month++) {
        let payDate = new Date(year, month, dayOfMonth);
        
        // If day doesn't exist in month (e.g., 31st in February), use last day
        if (payDate.getMonth() !== month) {
          payDate = new Date(year, month + 1, 0);
        }
        
        if (payDate >= startDate && payDate <= endDate) {
          dates.push({
            date: payDate.toISOString().split('T')[0],
            period: payDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })
          });
        }
      }
      break;
  }
  
  return dates;
}