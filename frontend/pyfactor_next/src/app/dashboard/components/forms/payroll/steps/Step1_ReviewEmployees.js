'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon, 
  PlusIcon, 
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { logger } from '@/utils/logger';
import FieldTooltip from '@/components/ui/FieldTooltip';

export default function Step1_ReviewEmployees({ 
  payrollData, 
  updatePayrollData, 
  onNext, 
  isFirstStep 
}) {
  const [employees, setEmployees] = useState(payrollData.employees || []);
  const [loading, setLoading] = useState(!payrollData.employees?.length);
  const [selectedCount, setSelectedCount] = useState(0);
  const [payPeriod, setPayPeriod] = useState(null);
  const [stats, setStats] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    if (!payrollData.employees?.length) {
      loadEmployees();
    } else {
      updateSelectedCount(payrollData.employees);
    }
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/employees/payroll-eligible', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Store pay period and stats
        setPayPeriod(data.payPeriod);
        setStats(data.stats);
        
        // Employees already have timesheet data integrated
        const employeesWithPayrollStatus = data.employees.map(emp => ({
          ...emp,
          // Only include if they have approved timesheets OR are salary with no timesheet requirement
          includeInPayroll: emp.timesheet.timesheetStatus === 'approved' || 
                           (emp.compensationType === 'SALARY' && !emp.timesheet.hasTimesheet),
          // Use timesheet hours for hourly employees, default for salary
          hoursWorked: emp.compensationType === 'WAGE' 
            ? emp.timesheet.totalHours 
            : (emp.defaultHours || 40)
        }));
        
        setEmployees(employeesWithPayrollStatus);
        updatePayrollData('employees', employeesWithPayrollStatus);
        updatePayrollData('payPeriod', data.payPeriod);
        updatePayrollData('stats', data.stats);
        updateSelectedCount(employeesWithPayrollStatus);
      }
    } catch (error) {
      logger.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSelectedCount = (employeeList) => {
    const count = employeeList.filter(emp => emp.includeInPayroll).length;
    setSelectedCount(count);
  };

  const handleToggleEmployee = (employeeId) => {
    const updatedEmployees = employees.map(emp => 
      emp.id === employeeId 
        ? { ...emp, includeInPayroll: !emp.includeInPayroll }
        : emp
    );
    setEmployees(updatedEmployees);
    updatePayrollData('employees', updatedEmployees);
    updateSelectedCount(updatedEmployees);
  };

  const handleHoursChange = (employeeId, hours) => {
    const updatedEmployees = employees.map(emp => 
      emp.id === employeeId 
        ? { ...emp, hoursWorked: parseFloat(hours) || 0 }
        : emp
    );
    setEmployees(updatedEmployees);
    updatePayrollData('employees', updatedEmployees);
  };

  const copyFromLastPayroll = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payroll/copy-last', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees);
        updatePayrollData('employees', data.employees);
        updateSelectedCount(data.employees);
      }
    } catch (error) {
      logger.error('Error copying from last payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimesheetStatusIcon = (employee) => {
    const { timesheet } = employee;
    
    if (!timesheet.hasTimesheet) {
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
    } else if (timesheet.timesheetStatus === 'approved') {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    } else if (timesheet.timesheetStatus === 'pending') {
      return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
    return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
  };
  
  const getTimesheetStatusText = (employee) => {
    const { timesheet } = employee;
    
    if (!timesheet.hasTimesheet) {
      return 'No Timesheet';
    } else if (timesheet.timesheetStatus === 'approved') {
      return 'Approved';
    } else if (timesheet.timesheetStatus === 'pending') {
      return 'Pending Approval';
    }
    return 'Missing';
  };
  
  const canProceedToPayroll = () => {
    const selectedEmployees = employees.filter(emp => emp.includeInPayroll);
    const hasUnapprovedTimesheets = selectedEmployees.some(emp => 
      emp.compensationType === 'WAGE' && emp.timesheet.timesheetStatus !== 'approved'
    );
    return selectedCount > 0 && !hasUnapprovedTimesheets;
  };
  
  const getValidationMessage = () => {
    if (selectedCount === 0) {
      return 'Please select at least one employee to include in payroll';
    }
    
    const selectedEmployees = employees.filter(emp => emp.includeInPayroll);
    const unapprovedWageEmployees = selectedEmployees.filter(emp => 
      emp.compensationType === 'WAGE' && emp.timesheet.timesheetStatus !== 'approved'
    );
    
    if (unapprovedWageEmployees.length > 0) {
      return `${unapprovedWageEmployees.length} hourly employee(s) have unapproved timesheets. Please ensure all timesheets are approved before proceeding.`;
    }
    
    return '';
  };

  const handleProceed = () => {
    if (!canProceedToPayroll()) {
      alert(getValidationMessage());
      return;
    }
    onNext();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <StandardSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <UserGroupIcon className="h-6 w-6 text-blue-600 mr-2" />
          Review Employees & Timesheets
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Review timesheet data and confirm which employees to include in this payroll period
        </p>
        {payPeriod && (
          <p className="mt-1 text-sm text-blue-600">
            Pay Period: {new Date(payPeriod.startDate).toLocaleDateString()} - {new Date(payPeriod.endDate).toLocaleDateString()}
          </p>
        )}
      </div>
      
      {/* Timesheet Status Summary */}
      {stats && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-blue-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Timesheet Status Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-1" />
                <span className="text-lg font-bold text-green-600">{stats.withApprovedTimesheets}</span>
              </div>
              <p className="text-xs text-gray-600">Approved Timesheets</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <ClockIcon className="h-5 w-5 text-yellow-500 mr-1" />
                <span className="text-lg font-bold text-yellow-600">{stats.withPendingTimesheets}</span>
              </div>
              <p className="text-xs text-gray-600">Pending Approval</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <XCircleIcon className="h-5 w-5 text-red-500 mr-1" />
                <span className="text-lg font-bold text-red-600">{stats.missingTimesheets}</span>
              </div>
              <p className="text-xs text-gray-600">Missing Timesheets</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <span className="text-lg font-bold text-blue-600">{formatCurrency(stats.totalPayrollAmount)}</span>
              </div>
              <p className="text-xs text-gray-600">Ready for Payroll</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => window.location.href = '/dashboard/employees/add'}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add New Employee
        </button>
        <button
          onClick={copyFromLastPayroll}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
          Copy from Last Payroll
        </button>
      </div>

      {/* Employee List with Timesheet Data */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Employee Timesheet Review</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {employees.map((employee) => (
            <div key={employee.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {/* Employee Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-medium text-blue-600">
                        {employee.initials}
                      </span>
                    </div>
                  </div>

                  {/* Employee Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{employee.name}</h4>
                        <p className="text-sm text-gray-500">{employee.position}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {employee.compensationType === 'SALARY' 
                            ? `${formatCurrency(employee.salary)}/year (${formatCurrency(employee.hourlyRate)}/hour)`
                            : `${formatCurrency(employee.hourlyRate)}/hour`
                          }
                        </p>
                        {employee.isNew && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                            New Employee
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timesheet Status & Details */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {getTimesheetStatusIcon(employee)}
                          <span className="ml-2 text-sm font-medium text-gray-900">
                            {getTimesheetStatusText(employee)}
                          </span>
                        </div>
                        {employee.timesheet.hasTimesheet && (
                          <button
                            onClick={() => setSelectedEmployee(employee)}
                            className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            View Details
                          </button>
                        )}
                      </div>
                      
                      {employee.timesheet.hasTimesheet ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-gray-500">Total Hours:</span>
                            <span className="ml-1 font-medium">{employee.timesheet.totalHours.toFixed(1)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Regular:</span>
                            <span className="ml-1 font-medium">{employee.timesheet.regularHours.toFixed(1)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Overtime:</span>
                            <span className="ml-1 font-medium">{employee.timesheet.overtimeHours.toFixed(1)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Calculated Pay:</span>
                            <span className="ml-1 font-medium text-green-600">{formatCurrency(employee.timesheet.totalPay)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          {employee.compensationType === 'SALARY' 
                            ? 'Salary employee - timesheet not required'
                            : 'No timesheet submitted for this pay period'
                          }
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-4 ml-4">
                  {/* Manual Hours Override for Special Cases */}
                  {employee.compensationType === 'WAGE' && !employee.timesheet.hasTimesheet && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Manual Hours
                        <FieldTooltip 
                          content="Enter hours manually only if no timesheet is available. This should be rare."
                        />
                      </label>
                      <input
                        type="number"
                        value={employee.hoursWorked}
                        onChange={(e) => handleHoursChange(employee.id, e.target.value)}
                        disabled={!employee.includeInPayroll}
                        className="block w-20 px-2 py-1 text-xs rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                        step="0.5"
                        min="0"
                      />
                    </div>
                  )}

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={employee.includeInPayroll}
                      onChange={() => handleToggleEmployee(employee.id)}
                      disabled={employee.compensationType === 'WAGE' && employee.timesheet.timesheetStatus !== 'approved'}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Include in payroll</span>
                  </label>
                </div>
              </div>
              
              {/* Warning for unapproved timesheets */}
              {employee.compensationType === 'WAGE' && employee.timesheet.timesheetStatus !== 'approved' && employee.includeInPayroll && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-2" />
                  <span className="text-xs text-yellow-700">
                    This employee cannot be included in payroll until their timesheet is approved.
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-3">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-blue-700">Total Employees</p>
            <p className="text-2xl font-semibold text-blue-900">{employees.length}</p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Selected for Payroll</p>
            <p className="text-2xl font-semibold text-blue-900">{selectedCount}</p>
          </div>
          <div>
            <p className="text-sm text-blue-700">New This Period</p>
            <p className="text-2xl font-semibold text-blue-900">{employees.filter(e => e.isNew).length}</p>
          </div>
          <div>
            <p className="text-sm text-blue-700">On Leave</p>
            <p className="text-2xl font-semibold text-blue-900">{employees.filter(e => e.status === 'on_leave').length}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          {selectedCount === 0 && (
            <p className="text-red-600">Please select at least one employee to continue</p>
          )}
        </div>
        <button
          onClick={handleProceed}
          disabled={selectedCount === 0}
          className={`
            px-6 py-2 text-sm font-medium rounded-md
            ${selectedCount === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          Continue to Calculate Pay
        </button>
      </div>

      {/* Employee Timesheet Detail Modal */}
      {selectedEmployee && (
        <div className="absolute inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Timesheet Details - {selectedEmployee.name}
              </h3>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="mt-4">
              {/* Pay Period Info */}
              {payPeriod && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-blue-900">Pay Period</p>
                      <p className="text-sm text-blue-700">
                        {new Date(payPeriod.startDate).toLocaleDateString()} - {new Date(payPeriod.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center">
                      {getTimesheetStatusIcon(selectedEmployee)}
                      <span className="ml-2 text-sm font-medium">
                        {getTimesheetStatusText(selectedEmployee)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedEmployee.timesheet.hasTimesheet ? (
                <div className="space-y-6">
                  {/* Hours Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-700">Regular Hours</p>
                      <p className="text-2xl font-bold text-green-900">
                        {selectedEmployee.timesheet.regularHours.toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-sm text-yellow-700">Overtime Hours</p>
                      <p className="text-2xl font-bold text-yellow-900">
                        {selectedEmployee.timesheet.overtimeHours.toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-700">Sick Hours</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {selectedEmployee.timesheet.sickHours.toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-sm text-purple-700">Vacation Hours</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {selectedEmployee.timesheet.vacationHours.toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700">Holiday Hours</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {selectedEmployee.timesheet.holidayHours.toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-sm text-red-700">Unpaid Hours</p>
                      <p className="text-2xl font-bold text-red-900">
                        {selectedEmployee.timesheet.unpaidHours.toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-indigo-50 p-3 rounded-lg">
                      <p className="text-sm text-indigo-700">Total Hours</p>
                      <p className="text-2xl font-bold text-indigo-900">
                        {selectedEmployee.timesheet.totalHours.toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-lg">
                      <p className="text-sm text-green-700">Total Pay</p>
                      <p className="text-2xl font-bold text-green-900">
                        {formatCurrency(selectedEmployee.timesheet.totalPay)}
                      </p>
                    </div>
                  </div>

                  {/* Pay Calculation Breakdown */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Pay Calculation</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Regular: {selectedEmployee.timesheet.regularHours.toFixed(1)} hrs × {formatCurrency(selectedEmployee.hourlyRate)}</span>
                        <span>{formatCurrency(selectedEmployee.timesheet.regularHours * selectedEmployee.hourlyRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Overtime: {selectedEmployee.timesheet.overtimeHours.toFixed(1)} hrs × {formatCurrency(selectedEmployee.hourlyRate * 1.5)} (1.5x)</span>
                        <span>{formatCurrency(selectedEmployee.timesheet.overtimeHours * selectedEmployee.hourlyRate * 1.5)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sick: {selectedEmployee.timesheet.sickHours.toFixed(1)} hrs × {formatCurrency(selectedEmployee.hourlyRate)}</span>
                        <span>{formatCurrency(selectedEmployee.timesheet.sickHours * selectedEmployee.hourlyRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vacation: {selectedEmployee.timesheet.vacationHours.toFixed(1)} hrs × {formatCurrency(selectedEmployee.hourlyRate)}</span>
                        <span>{formatCurrency(selectedEmployee.timesheet.vacationHours * selectedEmployee.hourlyRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Holiday: {selectedEmployee.timesheet.holidayHours.toFixed(1)} hrs × {formatCurrency(selectedEmployee.hourlyRate)}</span>
                        <span>{formatCurrency(selectedEmployee.timesheet.holidayHours * selectedEmployee.hourlyRate)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Unpaid: {selectedEmployee.timesheet.unpaidHours.toFixed(1)} hrs</span>
                        <span>$0.00</span>
                      </div>
                      <div className="border-t border-gray-300 pt-2 flex justify-between font-medium">
                        <span>Total Pay</span>
                        <span>{formatCurrency(selectedEmployee.timesheet.totalPay)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Timesheet History */}
                  {selectedEmployee.timesheet.timesheets && selectedEmployee.timesheet.timesheets.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Timesheet History in Pay Period</h4>
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Week
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total Hours
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {selectedEmployee.timesheet.timesheets.map((ts, index) => (
                              <tr key={ts.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(ts.periodStart).toLocaleDateString()} - {new Date(ts.periodEnd).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    ts.status === 'APPROVED' 
                                      ? 'bg-green-100 text-green-800'
                                      : ts.status === 'SUBMITTED'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {ts.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {ts.totalHours.toFixed(1)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <XCircleIcon className="mx-auto h-12 w-12 text-red-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Timesheet Data</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedEmployee.compensationType === 'SALARY' 
                      ? 'This salary employee does not require timesheet submission.'
                      : 'This employee has not submitted a timesheet for this pay period.'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}