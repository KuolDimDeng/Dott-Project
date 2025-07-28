'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession-v2';
import { useNotification } from '@/context/NotificationContext';
import { format, startOfWeek, endOfWeek, addDays, parseISO } from 'date-fns';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { 
  ClockIcon, 
  CalendarIcon, 
  CheckCircleIcon,
  PlusIcon,
  MinusIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function InlineTimesheetManager() {
  const { session } = useSession();
  const { notifySuccess, notifyError } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState({});
  const [timesheetData, setTimesheetData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [timesheetHistory, setTimesheetHistory] = useState([]);
  const [activeSection, setActiveSection] = useState('entry'); // 'entry', 'submit', 'history', 'supervisor'
  const [employeeData, setEmployeeData] = useState(null);
  const [hourlyRate, setHourlyRate] = useState(0);
  const [noEmployeeRecord, setNoEmployeeRecord] = useState(false);
  
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  
  useEffect(() => {
    if (session?.user) {
      fetchEmployeeData();
    }
  }, [session]);
  
  useEffect(() => {
    if (employeeData?.id) {
      fetchCurrentWeekData();
      fetchTimesheetHistory();
    }
  }, [currentWeek, employeeData]);
  
  const fetchEmployeeData = async () => {
    console.log('🔧 [InlineTimesheetManager] === EMPLOYEE FETCH START ===');
    console.log('🔧 [InlineTimesheetManager] Session data:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      userRole: session?.user?.role,
      userTenantId: session?.user?.tenant_id,
      userBusinessId: session?.user?.business_id,
      userTenantIdAlt: session?.user?.tenantId,
      hasEmployee: !!session?.employee
    });
    
    // First check if session has employee data already
    if (session?.employee) {
      console.log('🔧 [InlineTimesheetManager] Using employee data from session:', session.employee);
      setEmployeeData(session.employee);
      
      // Calculate hourly rate from session data
      if (session.employee.hourly_rate) {
        setHourlyRate(session.employee.hourly_rate);
      } else if (session.employee.salary) {
        const hourlyRate = session.employee.salary / 2080; // 52 weeks * 40 hours
        setHourlyRate(hourlyRate);
      }
      
      // Auto-populate for salaried employees
      if (session.employee.salary > 0) {
        const autoEntries = {};
        for (let i = 0; i < 5; i++) { // Monday to Friday
          const date = format(addDays(weekStart, i), 'yyyy-MM-dd');
          autoEntries[date] = {
            regular: 8,
            overtime: 0,
            sick: 0,
            vacation: 0,
            holiday: 0,
            unpaid: 0
          };
        }
        setTimeEntries(prev => ({ ...autoEntries, ...prev }));
        console.log('🔧 [InlineTimesheetManager] Auto-populated hours for salaried employee');
      }
      return;
    }
    
    // Fallback to API call if no session employee data
    try {
      // Get all employees and find the one matching current user's email
      const response = await fetch('/api/hr/v2/employees/', {
        headers: {
          'X-Tenant-ID': session?.user?.tenantId || session?.user?.tenant_id,
        },
      });
      
      console.log('🔧 [InlineTimesheetManager] Employee API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔧 [InlineTimesheetManager] Employee API response data:', data);
        
        // Handle both data.data and data.results response formats
        const employees = data.data || data.results || data;
        
        // Find employee matching current user - be more specific with matching
        const userEmployee = employees.find(emp => {
          // Primary match: email AND tenant match
          const emailMatch = emp.email?.toLowerCase() === session?.user?.email?.toLowerCase();
          
          // Get tenant ID from various possible locations
          const userTenantId = session?.user?.tenant_id || session?.user?.business_id || session?.user?.tenantId;
          
          // Backend might not be returning business_id, so check both business_id and tenant_id
          const empBusinessId = emp.business_id || emp.tenant_id || emp.tenantId;
          const tenantMatch = !userTenantId || 
                            !empBusinessId ||  // If employee has no business_id, match by email only
                            String(empBusinessId) === String(userTenantId);
          
          console.log(`🔧 [InlineTimesheetManager] Checking employee ${emp.email}:`);
          console.log(`🔧 [InlineTimesheetManager]   - emailMatch=${emailMatch}`);
          console.log(`🔧 [InlineTimesheetManager]   - userTenantId=${userTenantId}`);
          console.log(`🔧 [InlineTimesheetManager]   - emp.business_id=${emp.business_id}`);
          console.log(`🔧 [InlineTimesheetManager]   - emp.tenant_id=${emp.tenant_id}`);
          console.log(`🔧 [InlineTimesheetManager]   - empBusinessId=${empBusinessId}`);
          console.log(`🔧 [InlineTimesheetManager]   - tenantMatch=${tenantMatch}`);
          
          return emailMatch && tenantMatch;
        });
        
        if (!userEmployee) {
          console.log('🔧 [InlineTimesheetManager] No employee record found for user:', session?.user?.email);
          console.log('🔧 [InlineTimesheetManager] User details:', {
            email: session?.user?.email,
            role: session?.user?.role,
            tenant_id: session?.user?.tenant_id,
            business_id: session?.user?.business_id
          });
          console.log('🔧 [InlineTimesheetManager] Available employees:', employees.map(e => ({ email: e.email, business_id: e.business_id })));
          
          // If user is an OWNER or ADMIN, they might not have an employee record
          if (session?.user?.role === 'OWNER' || session?.user?.role === 'ADMIN') {
            setNoEmployeeRecord(true);
            setLoading(false);
            return;
          }
          
          return;
        }
        
        console.log('🔧 [InlineTimesheetManager] === EMPLOYEE FOUND ===');
        console.log('🔧 [InlineTimesheetManager] Employee record:', {
          id: userEmployee.id,
          email: userEmployee.email,
          firstName: userEmployee.first_name,
          lastName: userEmployee.last_name,
          businessId: userEmployee.business_id,
          compensationType: userEmployee.compensation_type,
          isSupervisor: userEmployee.is_supervisor
        });
        setEmployeeData(userEmployee);
        
        // Calculate hourly rate
        if (userEmployee.compensation_type === 'SALARY') {
          const annualSalary = parseFloat(userEmployee.salary) || 0;
          const hourlyRate = annualSalary / 2080; // 52 weeks * 40 hours
          setHourlyRate(hourlyRate);
          console.log('🔧 [InlineTimesheetManager] Salaried employee - calculated hourly rate:', hourlyRate);
          
          // Auto-populate regular hours for salary employees (8 hours per day)
          const autoEntries = {};
          for (let i = 0; i < 5; i++) { // Monday to Friday
            const date = format(addDays(weekStart, i), 'yyyy-MM-dd');
            autoEntries[date] = {
              regular: 8,
              overtime: 0,
              sick: 0,
              vacation: 0,
              holiday: 0,
              unpaid: 0
            };
          }
          setTimeEntries(prev => ({ ...autoEntries, ...prev }));
          console.log('🔧 [InlineTimesheetManager] Auto-populated hours for salaried employee');
        } else {
          setHourlyRate(parseFloat(userEmployee.wage_per_hour) || 0);
          console.log('🔧 [InlineTimesheetManager] Wage employee - hourly rate:', userEmployee.wage_per_hour);
        }
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };
  
  const fetchCurrentWeekData = async () => {
    if (!employeeData?.id) {
      console.log('🔧 [InlineTimesheetManager] No employee data available yet');
      return;
    }
    
    console.log('🔧 [InlineTimesheetManager] Fetching timesheet for employee ID:', employeeData.id);
    try {
      setLoading(true);
      const response = await fetch(
        `/api/hr/timesheets?employee_id=${employeeData.id}&period_start=${format(weekStart, 'yyyy-MM-dd')}`,
        {
          headers: {
            'X-Tenant-ID': session?.user?.tenant_id || session?.user?.business_id || session?.user?.tenantId,
          },
        }
      );
      
      console.log('🔧 [InlineTimesheetManager] Timesheet API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔧 [InlineTimesheetManager] Timesheet data received:', data);
        
        if (data.results && data.results.length > 0) {
          const timesheet = data.results[0];
          setTimesheetData(timesheet);
          
          // Fetch timesheet entries if we have a timesheet
          if (timesheet.id) {
            await fetchTimesheetEntries(timesheet.id);
          }
        } else {
          console.log('🔧 [InlineTimesheetManager] No existing timesheet found');
          setTimesheetData(null);
        }
      } else {
        console.error('🔧 [InlineTimesheetManager] Failed to fetch timesheet:', response.status);
      }
    } catch (error) {
      console.error('Error fetching timesheet data:', error);
      notifyError('Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTimesheetEntries = async (timesheetId) => {
    try {
      const response = await fetch(`/api/hr/timesheet-entries?timesheet_id=${timesheetId}`, {
        headers: {
          'X-Tenant-ID': session?.user?.tenantId || session?.user?.tenant_id,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔧 [InlineTimesheetManager] Timesheet entries:', data);
        
        const entriesMap = {};
        if (data.results) {
          data.results.forEach(entry => {
            const date = format(parseISO(entry.date), 'yyyy-MM-dd');
            entriesMap[date] = {
              regular: entry.regular_hours || 0,
              overtime: entry.overtime_hours || 0,
              sick: entry.sick_hours || 0,
              vacation: entry.vacation_hours || 0,
              holiday: entry.holiday_hours || 0,
              unpaid: entry.unpaid_hours || 0,
              id: entry.id
            };
          });
        }
        setTimeEntries(entriesMap);
      }
    } catch (error) {
      console.error('Error fetching timesheet entries:', error);
    }
  };
  
  const fetchTimesheetHistory = async () => {
    if (!employeeData?.id) return;
    
    try {
      const response = await fetch(
        `/api/hr/timesheets?employee_id=${employeeData.id}&limit=5`,
        {
          headers: {
            'X-Tenant-ID': session?.user?.tenant_id || session?.user?.business_id || session?.user?.tenantId,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setTimesheetHistory(data.results || []);
      }
    } catch (error) {
      console.error('Error fetching timesheet history:', error);
    }
  };
  
  const handleHoursChange = (date, type, value) => {
    const numValue = parseFloat(value) || 0;
    setTimeEntries(prev => ({
      ...prev,
      [date]: {
        regular: 0,
        overtime: 0,
        sick: 0,
        vacation: 0,
        holiday: 0,
        unpaid: 0,
        ...prev[date],
        [type]: numValue
      }
    }));
  };
  
  const saveTimeEntries = async () => {
    try {
      const entries = Object.entries(timeEntries).map(([date, hours]) => ({
        date,
        regular_hours: hours.regular || 0,
        overtime_hours: hours.overtime || 0,
        sick_hours: hours.sick || 0,
        vacation_hours: hours.vacation || 0,
        holiday_hours: hours.holiday || 0,
        unpaid_hours: hours.unpaid || 0,
        timesheet_id: timesheetData?.id
      }));
      
      const response = await fetch('/api/hr/time-entries/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries })
      });
      
      if (response.ok) {
        notifySuccess('Time entries saved successfully');
        fetchCurrentWeekData();
      } else {
        notifyError('Failed to save time entries');
      }
    } catch (error) {
      console.error('Error saving time entries:', error);
      notifyError('Error saving time entries');
    }
  };
  
  const submitTimesheet = async () => {
    if (!timesheetData?.id) return;
    
    try {
      setSubmitting(true);
      const response = await fetch(`/api/hr/timesheets/${timesheetData.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        notifySuccess('Timesheet submitted successfully');
        fetchCurrentWeekData();
        fetchTimesheetHistory();
      } else {
        notifyError('Failed to submit timesheet');
      }
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      notifyError('Error submitting timesheet');
    } finally {
      setSubmitting(false);
    }
  };
  
  const getDaysOfWeek = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      days.push({
        date: format(date, 'yyyy-MM-dd'),
        dayName: format(date, 'EEE'),
        dayNumber: format(date, 'd'),
        isToday: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
      });
    }
    return days;
  };
  
  const calculateTotalHours = () => {
    let regular = 0;
    let overtime = 0;
    let sick = 0;
    let vacation = 0;
    let holiday = 0;
    let unpaid = 0;
    
    Object.values(timeEntries).forEach(entry => {
      regular += entry.regular || 0;
      overtime += entry.overtime || 0;
      sick += entry.sick || 0;
      vacation += entry.vacation || 0;
      holiday += entry.holiday || 0;
      unpaid += entry.unpaid || 0;
    });
    
    const totalPaidHours = regular + overtime + sick + vacation + holiday;
    const totalHours = totalPaidHours + unpaid;
    const totalPay = (regular * hourlyRate) + (overtime * hourlyRate * 1.5) + 
                     (sick * hourlyRate) + (vacation * hourlyRate) + (holiday * hourlyRate);
    
    return { 
      regular, 
      overtime, 
      sick, 
      vacation, 
      holiday, 
      unpaid, 
      totalPaidHours,
      totalHours,
      totalPay
    };
  };
  
  const getStatusBadge = (status) => {
    const statusConfig = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      SUBMITTED: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      APPROVED: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      REJECTED: { color: 'bg-red-100 text-red-800', label: 'Rejected' }
    };
    const config = statusConfig[status] || statusConfig.DRAFT;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };
  
  const isSupervisor = () => {
    return session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER' || 
           employeeData?.is_supervisor === true;
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <StandardSpinner size="large" />
      </div>
    );
  }
  
  if (noEmployeeRecord) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Employee Record Found</h3>
        <p className="text-gray-500">
          As a business owner, you don't have an employee timesheet record.
        </p>
        <p className="text-gray-500 mt-2">
          To track your own time, you'll need to create an employee record for yourself in the HR section.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveSection('entry')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'entry'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Enter Hours
          </button>
          <button
            onClick={() => setActiveSection('submit')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'submit'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Submit Timesheet
          </button>
          <button
            onClick={() => setActiveSection('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            History
          </button>
        </nav>
      </div>
      
      {/* Enter Hours Section */}
      {activeSection === 'entry' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <MinusIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentWeek(new Date())}
                className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Time Entry Grid */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-green-800">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Day
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                    Regular
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                    Overtime
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                    Sick
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                    Vacation
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                    Holiday
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                    Unpaid
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-green-50 divide-y divide-green-200">
                {getDaysOfWeek().map((day) => {
                  const entry = timeEntries[day.date] || { 
                    regular: 0, overtime: 0, sick: 0, vacation: 0, holiday: 0, unpaid: 0 
                  };
                  const dayTotal = (entry.regular || 0) + (entry.overtime || 0) + 
                                   (entry.sick || 0) + (entry.vacation || 0) + 
                                   (entry.holiday || 0) + (entry.unpaid || 0);
                  
                  return (
                    <tr key={day.date} className={day.isToday ? 'bg-green-100' : 'bg-green-50'}>
                      <td className="px-3 py-3 whitespace-nowrap bg-green-100">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{day.dayName}</div>
                          <div className="text-sm text-gray-600">{day.dayNumber}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={entry.regular || ''}
                          onChange={(e) => handleHoursChange(day.date, 'regular', e.target.value)}
                          className="w-16 px-2 py-1 text-center border border-green-300 rounded focus:ring-green-500 focus:border-green-500 bg-white"
                          disabled={timesheetData?.status !== 'DRAFT'}
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={entry.overtime || ''}
                          onChange={(e) => handleHoursChange(day.date, 'overtime', e.target.value)}
                          className="w-16 px-2 py-1 text-center border border-green-300 rounded focus:ring-green-500 focus:border-green-500 bg-white"
                          disabled={timesheetData?.status !== 'DRAFT'}
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={entry.sick || ''}
                          onChange={(e) => handleHoursChange(day.date, 'sick', e.target.value)}
                          className="w-16 px-2 py-1 text-center border border-green-300 rounded focus:ring-green-500 focus:border-green-500 bg-white"
                          disabled={timesheetData?.status !== 'DRAFT'}
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={entry.vacation || ''}
                          onChange={(e) => handleHoursChange(day.date, 'vacation', e.target.value)}
                          className="w-16 px-2 py-1 text-center border border-green-300 rounded focus:ring-green-500 focus:border-green-500 bg-white"
                          disabled={timesheetData?.status !== 'DRAFT'}
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={entry.holiday || ''}
                          onChange={(e) => handleHoursChange(day.date, 'holiday', e.target.value)}
                          className="w-16 px-2 py-1 text-center border border-green-300 rounded focus:ring-green-500 focus:border-green-500 bg-white"
                          disabled={timesheetData?.status !== 'DRAFT'}
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={entry.unpaid || ''}
                          onChange={(e) => handleHoursChange(day.date, 'unpaid', e.target.value)}
                          className="w-16 px-2 py-1 text-center border border-green-300 rounded focus:ring-green-500 focus:border-green-500 bg-white"
                          disabled={timesheetData?.status !== 'DRAFT'}
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center bg-green-100">
                        <span className="text-sm font-medium text-gray-900">
                          {dayTotal.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-green-800 text-white">
                <tr>
                  <td className="px-3 py-3 text-sm font-medium">Totals</td>
                  <td className="px-3 py-3 text-center text-sm font-medium">
                    {calculateTotalHours().regular.toFixed(1)}
                  </td>
                  <td className="px-3 py-3 text-center text-sm font-medium">
                    {calculateTotalHours().overtime.toFixed(1)}
                  </td>
                  <td className="px-3 py-3 text-center text-sm font-medium">
                    {calculateTotalHours().sick.toFixed(1)}
                  </td>
                  <td className="px-3 py-3 text-center text-sm font-medium">
                    {calculateTotalHours().vacation.toFixed(1)}
                  </td>
                  <td className="px-3 py-3 text-center text-sm font-medium">
                    {calculateTotalHours().holiday.toFixed(1)}
                  </td>
                  <td className="px-3 py-3 text-center text-sm font-medium">
                    {calculateTotalHours().unpaid.toFixed(1)}
                  </td>
                  <td className="px-3 py-3 text-center text-sm font-bold">
                    {calculateTotalHours().totalHours.toFixed(1)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-3 text-sm font-medium">Rate/Hour</td>
                  <td className="px-3 py-3 text-center text-sm font-medium" colSpan="6">
                    ${hourlyRate.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-center text-sm font-bold">
                    Total Pay: ${calculateTotalHours().totalPay.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {timesheetData?.status === 'DRAFT' && (
            <div className="flex justify-end">
              <button
                onClick={saveTimeEntries}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Hours
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Submit Timesheet Section */}
      {activeSection === 'submit' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Submit Weekly Timesheet</h3>
          
          {timesheetData ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Period</p>
                    <p className="font-medium">
                      {format(parseISO(timesheetData.period_start), 'MMM d')} - 
                      {format(parseISO(timesheetData.period_end), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className="mt-1">{getStatusBadge(timesheetData.status)}</div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-500">Regular Hours</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(timesheetData.total_regular_hours || 0).toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Overtime Hours</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(timesheetData.total_overtime_hours || 0).toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Hours</p>
                      <p className="text-2xl font-bold text-green-600">
                        {(timesheetData.total_hours || 0).toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {timesheetData.status === 'DRAFT' && (
                  <div className="border-t pt-4">
                    <button
                      onClick={submitTimesheet}
                      disabled={submitting || calculateTotalHours().total === 0}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Submitting...' : 'Submit for Approval'}
                    </button>
                  </div>
                )}
                
                {timesheetData.status === 'SUBMITTED' && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-center text-yellow-600">
                      <ClockIcon className="h-5 w-5 mr-2" />
                      <span>Awaiting approval</span>
                    </div>
                  </div>
                )}
                
                {timesheetData.status === 'APPROVED' && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-center text-green-600">
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      <span>Approved by supervisor</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-gray-500">No timesheet data available</p>
            </div>
          )}
        </div>
      )}
      
      {/* History Section */}
      {activeSection === 'history' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Timesheet History</h3>
          
          {timesheetHistory.length > 0 ? (
            <div className="space-y-3">
              {timesheetHistory.map((timesheet) => (
                <div key={timesheet.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {format(parseISO(timesheet.period_start), 'MMM d')} - 
                        {format(parseISO(timesheet.period_end), 'MMM d, yyyy')}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {(timesheet.total_hours || 0).toFixed(1)} hours
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(timesheet.status)}
                      {timesheet.submitted_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Submitted {format(parseISO(timesheet.submitted_at), 'MMM d')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-500">No timesheet history available</p>
            </div>
          )}
        </div>
      )}
      
    </div>
  );
}