'use client';

import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import StandardSpinner from '@/components/ui/StandardSpinner';
import timesheetApi from '@/utils/api/timesheetApi';
import { logger } from '@/utils/logger';

function Step2_ReviewTimesheets({ wizardData, updateWizardData, onNext, onPrevious }) {
  const [loading, setLoading] = useState(true);
  const [timesheets, setTimesheets] = useState([]);
  const [approving, setApproving] = useState(false);
  
  useEffect(() => {
    loadTimesheets();
  }, []);

  const loadTimesheets = async () => {
    try {
      setLoading(true);
      
      // Get timesheets for selected employees in the pay period
      const employeeIds = wizardData.selectedEmployees;
      const timesheetPromises = employeeIds.map(empId => 
        timesheetApi.getEmployeeTimesheets({
          employee_id: empId,
          start_date: wizardData.payPeriod.start,
          end_date: wizardData.payPeriod.end
        })
      );
      
      const results = await Promise.all(timesheetPromises);
      const allTimesheets = results.flat();
      
      // Group timesheets by employee
      const groupedTimesheets = wizardData.employees
        .filter(emp => wizardData.selectedEmployees.includes(emp.id))
        .map(employee => {
          const empTimesheets = allTimesheets.filter(ts => ts.employee === employee.id);
          const totalHours = empTimesheets.reduce((sum, ts) => sum + (ts.total_hours || 0), 0);
          const hasUnapproved = empTimesheets.some(ts => ts.status !== 'approved');
          
          return {
            employee,
            timesheets: empTimesheets,
            totalHours,
            hasUnapproved,
            needsTimesheet: employee.compensation_type === 'WAGE' && empTimesheets.length === 0
          };
        });
      
      setTimesheets(groupedTimesheets);
      updateWizardData({ timesheets: groupedTimesheets });
      
    } catch (error) {
      logger.error('Error loading timesheets:', error);
      toast.error('Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTimesheet = async (timesheetId) => {
    try {
      setApproving(true);
      await timesheetApi.approveTimesheet(timesheetId);
      toast.success('Timesheet approved');
      await loadTimesheets();
    } catch (error) {
      logger.error('Error approving timesheet:', error);
      toast.error('Failed to approve timesheet');
    } finally {
      setApproving(false);
    }
  };

  const canProceed = () => {
    // Check if all wage employees have approved timesheets
    const wageEmployees = timesheets.filter(ts => ts.employee.compensation_type === 'WAGE');
    return wageEmployees.every(ts => !ts.needsTimesheet && !ts.hasUnapproved);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'submitted':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'draft':
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
    }
  };

  const handleContinue = () => {
    if (!canProceed()) {
      toast.error('All hourly employees must have approved timesheets before proceeding');
      return;
    }
    onNext();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <StandardSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Review & Approve Timesheets</h3>
        <p className="mt-1 text-sm text-gray-500">
          Ensure all employee timesheets are approved before processing payroll
        </p>
      </div>

      {/* Timesheet List */}
      <div className="space-y-4">
        {timesheets.map(({ employee, timesheets: empTimesheets, totalHours, hasUnapproved, needsTimesheet }) => (
          <div key={employee.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{employee.full_name}</h4>
                <p className="text-sm text-gray-500">
                  {employee.compensation_type === 'SALARY' ? 'Salary' : 'Hourly'} • 
                  {employee.department || 'No Department'}
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{totalHours.toFixed(2)} hours</p>
                {employee.compensation_type === 'WAGE' && (
                  <p className="text-sm text-gray-500">
                    ${((totalHours * (employee.wage_per_hour || 0))).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {/* Timesheet Status */}
            {needsTimesheet ? (
              <div className="mt-3 p-3 bg-red-50 rounded-lg flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-sm text-red-700">No timesheet submitted for this pay period</span>
              </div>
            ) : empTimesheets.length > 0 ? (
              <div className="mt-3 space-y-2">
                {empTimesheets.map(timesheet => (
                  <div key={timesheet.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center">
                      {getStatusIcon(timesheet.status)}
                      <span className="ml-2 text-sm text-gray-700">
                        Week of {format(parseISO(timesheet.period_start), 'MMM d')}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {timesheet.total_hours || 0} hours
                      </span>
                    </div>
                    
                    {timesheet.status === 'submitted' && (
                      <button
                        onClick={() => handleApproveTimesheet(timesheet.id)}
                        disabled={approving}
                        className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : employee.compensation_type === 'SALARY' ? (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">Salary employee - timesheets not required</p>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-yellow-50 rounded-lg p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Approval Required</h3>
            <div className="mt-1 text-sm text-yellow-700">
              {timesheets.filter(ts => ts.hasUnapproved).length} employees have unapproved timesheets
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <ArrowLeftIcon className="inline h-4 w-4 mr-2" />
          Back
        </button>
        
        <button
          onClick={handleContinue}
          disabled={!canProceed()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Calculate
          <ArrowRightIcon className="inline h-4 w-4 ml-2" />
        </button>
      </div>
    </div>
  );
}

export default Step2_ReviewTimesheets;