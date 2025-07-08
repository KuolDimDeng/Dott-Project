'use client';

import React, { useState, useEffect } from 'react';
import { UserGroupIcon, PlusIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
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
        const employeesWithDefaults = data.employees.map(emp => ({
          ...emp,
          includeInPayroll: emp.status === 'active',
          hoursWorked: emp.defaultHours || 0
        }));
        setEmployees(employeesWithDefaults);
        updatePayrollData('employees', employeesWithDefaults);
        updateSelectedCount(employeesWithDefaults);
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

  const handleProceed = () => {
    if (selectedCount === 0) {
      alert('Please select at least one employee to include in payroll');
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

  const activeCount = employees.filter(emp => emp.status === 'active').length;
  const onLeaveCount = employees.filter(emp => emp.status === 'leave').length;
  const newCount = employees.filter(emp => emp.isNew).length;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <UserGroupIcon className="h-6 w-6 text-blue-600 mr-2" />
          Review Your Team
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Confirm which employees to include in this payroll period
        </p>
      </div>

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

      {/* Employee List */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="space-y-3">
          {employees.map((employee) => (
            <div key={employee.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  {/* Employee Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-medium text-blue-600">
                        {employee.initials}
                      </span>
                    </div>
                  </div>

                  {/* Employee Details */}
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{employee.name}</h4>
                    <p className="text-sm text-gray-500">{employee.position}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {employee.salaryType === 'monthly' 
                        ? `${formatCurrency(employee.salary)}/month`
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

                {/* Actions */}
                <div className="flex items-center space-x-4">
                  {employee.salaryType === 'hourly' && (
                    <div className="mr-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Hours Worked
                        <FieldTooltip 
                          content="Enter the total hours worked for this pay period. Include regular and overtime hours."
                        />
                      </label>
                      <input
                        type="number"
                        value={employee.hoursWorked}
                        onChange={(e) => handleHoursChange(employee.id, e.target.value)}
                        disabled={!employee.includeInPayroll}
                        className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
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
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Include in payroll</span>
                  </label>
                </div>
              </div>
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
            <p className="text-2xl font-semibold text-blue-900">{newCount}</p>
          </div>
          <div>
            <p className="text-sm text-blue-700">On Leave</p>
            <p className="text-2xl font-semibold text-blue-900">{onLeaveCount}</p>
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
    </div>
  );
}