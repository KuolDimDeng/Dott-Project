'use client';

import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, differenceInDays, parseISO, addDays } from 'date-fns';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import timesheetApi from '@/utils/api/timesheetApi';
import { logger } from '@/utils/logger';
import StandardSpinner from '@/components/ui/StandardSpinner';
import FieldTooltip from '@/components/ui/FieldTooltip';

/**
 * Enhanced Timesheet Component with Pay Period Support
 * Integrates with payroll settings to properly align timesheets with pay periods
 */
function EnhancedTimesheet({ employee, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payrollSettings, setPayrollSettings] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [timesheet, setTimesheet] = useState(null);
  const [entries, setEntries] = useState([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  // Load payroll settings and current period on mount
  useEffect(() => {
    loadPayrollSettingsAndPeriod();
  }, []);

  // Load timesheet when period changes
  useEffect(() => {
    if (currentPeriod && employee) {
      loadTimesheet();
    }
  }, [currentPeriod, employee]);

  const loadPayrollSettingsAndPeriod = async () => {
    try {
      const response = await api.get('/api/payroll/settings/');
      const settings = response.data;
      setPayrollSettings(settings);
      
      // Calculate current pay period based on settings
      const period = calculatePayPeriod(new Date(), settings);
      setCurrentPeriod(period);
    } catch (error) {
      logger.error('Error loading payroll settings:', error);
      toast.error('Failed to load payroll settings');
      
      // Default to weekly if settings fail
      const defaultPeriod = {
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 })
      };
      setCurrentPeriod(defaultPeriod);
    }
  };

  const calculatePayPeriod = (date, settings) => {
    if (!settings) return null;
    
    let periodStart, periodEnd;
    
    switch (settings.pay_frequency) {
      case 'DAILY':
        periodStart = new Date(date);
        periodEnd = new Date(date);
        break;
        
      case 'WEEKLY':
        periodStart = startOfWeek(date, { weekStartsOn: settings.pay_weekday || 1 });
        periodEnd = endOfWeek(date, { weekStartsOn: settings.pay_weekday || 1 });
        break;
        
      case 'BIWEEKLY':
        // For biweekly, we need a reference date
        // This is simplified - in production you'd track the actual cycle
        const weekStart = startOfWeek(date, { weekStartsOn: settings.pay_weekday || 1 });
        const weekNumber = Math.floor(differenceInDays(weekStart, new Date('2024-01-01')) / 14);
        periodStart = addWeeks(new Date('2024-01-01'), weekNumber * 2);
        periodEnd = addDays(periodStart, 13);
        
        // Adjust if current date is in the next period
        if (date > periodEnd) {
          periodStart = addDays(periodEnd, 1);
          periodEnd = addDays(periodStart, 13);
        }
        break;
        
      case 'SEMIMONTHLY':
        const day = date.getDate();
        const month = date.getMonth();
        const year = date.getFullYear();
        
        if (settings.pay_days && settings.pay_days.length === 2) {
          const [firstDay, secondDay] = settings.pay_days.sort((a, b) => a - b);
          
          if (day <= firstDay) {
            periodStart = new Date(year, month, 1);
            periodEnd = new Date(year, month, firstDay);
          } else if (day <= secondDay) {
            periodStart = new Date(year, month, firstDay + 1);
            periodEnd = new Date(year, month, secondDay);
          } else {
            periodStart = new Date(year, month, secondDay + 1);
            periodEnd = new Date(year, month + 1, 0); // Last day of month
          }
        } else {
          // Default to 1st-15th and 16th-end
          if (day <= 15) {
            periodStart = new Date(year, month, 1);
            periodEnd = new Date(year, month, 15);
          } else {
            periodStart = new Date(year, month, 16);
            periodEnd = new Date(year, month + 1, 0);
          }
        }
        break;
        
      case 'MONTHLY':
        periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
        periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        break;
        
      default:
        // Default to weekly
        periodStart = startOfWeek(date, { weekStartsOn: 1 });
        periodEnd = endOfWeek(date, { weekStartsOn: 1 });
    }
    
    return { start: periodStart, end: periodEnd };
  };

  const loadTimesheet = async () => {
    try {
      setLoading(true);
      
      // Get or create timesheet for the current period
      const response = await timesheetApi.getCurrentWeek({
        employee_id: employee.id,
        start_date: format(currentPeriod.start, 'yyyy-MM-dd'),
        end_date: format(currentPeriod.end, 'yyyy-MM-dd')
      });
      
      if (response) {
        setTimesheet(response);
        setIsReadOnly(response.status !== 'draft');
        
        // Initialize entries for the period
        const days = [];
        let currentDate = new Date(currentPeriod.start);
        
        while (currentDate <= currentPeriod.end) {
          const existingEntry = response.entries?.find(
            e => e.date === format(currentDate, 'yyyy-MM-dd')
          );
          
          days.push({
            date: format(currentDate, 'yyyy-MM-dd'),
            regular_hours: existingEntry?.regular_hours || 0,
            overtime_hours: existingEntry?.overtime_hours || 0,
            sick_hours: existingEntry?.sick_hours || 0,
            vacation_hours: existingEntry?.vacation_hours || 0,
            holiday_hours: existingEntry?.holiday_hours || 0,
            unpaid_hours: existingEntry?.unpaid_hours || 0,
            other_hours: existingEntry?.other_hours || 0,
            notes: existingEntry?.notes || ''
          });
          
          currentDate = addDays(currentDate, 1);
        }
        
        setEntries(days);
      }
    } catch (error) {
      logger.error('Error loading timesheet:', error);
      toast.error('Failed to load timesheet');
    } finally {
      setLoading(false);
    }
  };

  const navigatePeriod = (direction) => {
    if (!payrollSettings || !currentPeriod) return;
    
    let newDate;
    
    switch (payrollSettings.pay_frequency) {
      case 'DAILY':
        newDate = addDays(currentPeriod.start, direction);
        break;
      case 'WEEKLY':
        newDate = addWeeks(currentPeriod.start, direction);
        break;
      case 'BIWEEKLY':
        newDate = addWeeks(currentPeriod.start, direction * 2);
        break;
      case 'SEMIMONTHLY':
        newDate = addDays(currentPeriod.start, direction * 15);
        break;
      case 'MONTHLY':
        newDate = new Date(currentPeriod.start.getFullYear(), currentPeriod.start.getMonth() + direction, 1);
        break;
      default:
        newDate = addWeeks(currentPeriod.start, direction);
    }
    
    const newPeriod = calculatePayPeriod(newDate, payrollSettings);
    setCurrentPeriod(newPeriod);
  };

  const handleEntryChange = (index, field, value) => {
    if (isReadOnly) return;
    
    const updatedEntries = [...entries];
    updatedEntries[index] = {
      ...updatedEntries[index],
      [field]: parseFloat(value) || 0
    };
    setEntries(updatedEntries);
  };

  const calculateTotals = () => {
    return entries.reduce((totals, entry) => {
      return {
        regular: totals.regular + (entry.regular_hours || 0),
        overtime: totals.overtime + (entry.overtime_hours || 0),
        sick: totals.sick + (entry.sick_hours || 0),
        vacation: totals.vacation + (entry.vacation_hours || 0),
        holiday: totals.holiday + (entry.holiday_hours || 0),
        unpaid: totals.unpaid + (entry.unpaid_hours || 0),
        other: totals.other + (entry.other_hours || 0),
        total: totals.total + 
          (entry.regular_hours || 0) + 
          (entry.overtime_hours || 0) + 
          (entry.sick_hours || 0) + 
          (entry.vacation_hours || 0) + 
          (entry.holiday_hours || 0) + 
          (entry.other_hours || 0)
      };
    }, { regular: 0, overtime: 0, sick: 0, vacation: 0, holiday: 0, unpaid: 0, other: 0, total: 0 });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Prepare data for bulk update
      const data = {
        employee_id: employee.id,
        period_start: format(currentPeriod.start, 'yyyy-MM-dd'),
        period_end: format(currentPeriod.end, 'yyyy-MM-dd'),
        entries: entries
      };
      
      await timesheetApi.bulkUpdateEntries(data);
      
      toast.success('Timesheet saved successfully');
      await loadTimesheet(); // Reload to get updated data
    } catch (error) {
      logger.error('Error saving timesheet:', error);
      toast.error('Failed to save timesheet');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!timesheet) return;
    
    try {
      setSaving(true);
      
      // First save any pending changes
      await handleSave();
      
      // Then submit the timesheet
      await timesheetApi.submitTimesheet(timesheet.id);
      
      toast.success('Timesheet submitted for approval');
      await loadTimesheet(); // Reload to get updated status
    } catch (error) {
      logger.error('Error submitting timesheet:', error);
      toast.error('Failed to submit timesheet');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = () => {
    if (!timesheet) return null;
    
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', icon: DocumentTextIcon },
      submitted: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: ExclamationTriangleIcon },
      paid: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CurrencyDollarIcon }
    };
    
    const config = statusConfig[timesheet.status] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon className="h-4 w-4 mr-1" />
        {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <StandardSpinner size="lg" />
      </div>
    );
  }

  const totals = calculateTotals();
  const payPeriodText = `${format(currentPeriod.start, 'MMM dd')} - ${format(currentPeriod.end, 'MMM dd, yyyy')}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Timesheet for {employee.full_name}
            </h2>
            {getStatusBadge()}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Period Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigatePeriod(-1)}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <span className="text-lg font-medium text-gray-900">{payPeriodText}</span>
              <span className="text-sm text-gray-500">
                ({payrollSettings?.pay_frequency.replace('_', ' ').toLowerCase()})
              </span>
            </div>
            
            <button
              onClick={() => navigatePeriod(1)}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
            
            <button
              onClick={() => {
                const today = new Date();
                const period = calculatePayPeriod(today, payrollSettings);
                setCurrentPeriod(period);
              }}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
            >
              Current Period
            </button>
          </div>

          <button
            onClick={loadTimesheet}
            className="p-2 text-gray-400 hover:text-gray-500"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Timesheet Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Regular
                  <FieldTooltip content="Standard working hours" />
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overtime
                  <FieldTooltip content="Hours worked beyond regular hours" />
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sick
                  <FieldTooltip content="Sick leave hours" />
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vacation
                  <FieldTooltip content="Vacation/PTO hours" />
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Holiday
                  <FieldTooltip content="Company holiday hours" />
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unpaid
                  <FieldTooltip content="Unpaid time off" />
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Other
                  <FieldTooltip content="Other hours (specify in notes)" />
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry, index) => {
                const date = parseISO(entry.date);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const dayTotal = 
                  (entry.regular_hours || 0) + 
                  (entry.overtime_hours || 0) + 
                  (entry.sick_hours || 0) + 
                  (entry.vacation_hours || 0) + 
                  (entry.holiday_hours || 0) + 
                  (entry.other_hours || 0);
                
                return (
                  <tr key={entry.date} className={isWeekend ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {format(date, 'EEE, MMM dd')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.25"
                        value={entry.regular_hours}
                        onChange={(e) => handleEntryChange(index, 'regular_hours', e.target.value)}
                        disabled={isReadOnly}
                        className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.25"
                        value={entry.overtime_hours}
                        onChange={(e) => handleEntryChange(index, 'overtime_hours', e.target.value)}
                        disabled={isReadOnly}
                        className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.25"
                        value={entry.sick_hours}
                        onChange={(e) => handleEntryChange(index, 'sick_hours', e.target.value)}
                        disabled={isReadOnly}
                        className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.25"
                        value={entry.vacation_hours}
                        onChange={(e) => handleEntryChange(index, 'vacation_hours', e.target.value)}
                        disabled={isReadOnly}
                        className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.25"
                        value={entry.holiday_hours}
                        onChange={(e) => handleEntryChange(index, 'holiday_hours', e.target.value)}
                        disabled={isReadOnly}
                        className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.25"
                        value={entry.unpaid_hours}
                        onChange={(e) => handleEntryChange(index, 'unpaid_hours', e.target.value)}
                        disabled={isReadOnly}
                        className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.25"
                        value={entry.other_hours}
                        onChange={(e) => handleEntryChange(index, 'other_hours', e.target.value)}
                        disabled={isReadOnly}
                        className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-center font-medium text-gray-900">
                      {dayTotal.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <input
                        type="text"
                        value={entry.notes}
                        onChange={(e) => handleEntryChange(index, 'notes', e.target.value)}
                        disabled={isReadOnly}
                        className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        placeholder="Notes..."
                      />
                    </td>
                  </tr>
                );
              })}
              
              {/* Totals Row */}
              <tr className="bg-gray-100 font-medium">
                <td className="px-4 py-3 text-sm text-gray-900">
                  Period Totals
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-900">
                  {totals.regular.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-900">
                  {totals.overtime.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-900">
                  {totals.sick.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-900">
                  {totals.vacation.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-900">
                  {totals.holiday.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-900">
                  {totals.unpaid.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-900">
                  {totals.other.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-900">
                  {totals.total.toFixed(2)}
                </td>
                <td className="px-4 py-3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? (
              <>
                <StandardSpinner size="sm" className="inline mr-2" />
                Saving...
              </>
            ) : (
              'Save Draft'
            )}
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? (
              <>
                <StandardSpinner size="sm" className="inline mr-2" />
                Submitting...
              </>
            ) : (
              'Submit for Approval'
            )}
          </button>
        </div>
      )}

      {/* Pay Information */}
      {employee.compensation_type && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Pay Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Compensation Type:</span>
              <span className="ml-2 font-medium text-blue-900">
                {employee.compensation_type === 'SALARY' ? 'Salary' : 'Hourly'}
              </span>
            </div>
            {employee.compensation_type === 'HOURLY' && employee.wage_per_hour && (
              <div>
                <span className="text-blue-700">Hourly Rate:</span>
                <span className="ml-2 font-medium text-blue-900">
                  ${employee.wage_per_hour}/hr
                </span>
              </div>
            )}
            {employee.compensation_type === 'SALARY' && employee.salary && (
              <div>
                <span className="text-blue-700">Annual Salary:</span>
                <span className="ml-2 font-medium text-blue-900">
                  ${employee.salary.toLocaleString()}
                </span>
              </div>
            )}
            {totals.total > 0 && employee.wage_per_hour && (
              <div>
                <span className="text-blue-700">Estimated Gross Pay:</span>
                <span className="ml-2 font-medium text-blue-900">
                  ${((totals.regular * employee.wage_per_hour) + (totals.overtime * employee.wage_per_hour * (payrollSettings?.overtime_rate || 1.5))).toFixed(2)}
                </span>
              </div>
            )}
          </div>
          
          {payrollSettings?.processing_lead_time && (
            <p className="text-xs text-blue-700 mt-3">
              Note: Timesheets must be submitted {payrollSettings.processing_lead_time} days before the pay date for processing.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default EnhancedTimesheet;