'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession-v2';
import { useNotification } from '@/context/NotificationContext';
import { format, parseISO } from 'date-fns';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { 
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

export default function SupervisorApprovalInterface() {
  const { session } = useSession();
  const { notifySuccess, notifyError } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [pendingTimesheets, setPendingTimesheets] = useState([]);
  const [pendingTimeOffRequests, setPendingTimeOffRequests] = useState([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [timesheetEntries, setTimesheetEntries] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  
  useEffect(() => {
    if (session?.user) {
      fetchPendingApprovals();
    }
  }, [session]);
  
  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      
      // Fetch pending timesheets
      const timesheetResponse = await fetch('/api/hr/timesheets?status=SUBMITTED&requires_approval=true');
      if (timesheetResponse.ok) {
        const timesheetData = await timesheetResponse.json();
        setPendingTimesheets(timesheetData.results || []);
      }
      
      // Fetch pending time off requests
      const timeOffResponse = await fetch('/api/hr/time-off-requests?status=PENDING');
      if (timeOffResponse.ok) {
        const timeOffData = await timeOffResponse.json();
        setPendingTimeOffRequests(timeOffData.results || []);
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      notifyError('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTimesheetDetails = async (timesheetId) => {
    try {
      const response = await fetch(`/api/hr/timesheet-entries?timesheet_id=${timesheetId}`);
      if (response.ok) {
        const data = await response.json();
        setTimesheetEntries(data.results || []);
      }
    } catch (error) {
      console.error('Error fetching timesheet entries:', error);
    }
  };
  
  const handleTimesheetAction = async (timesheetId, action, reason = '') => {
    try {
      setProcessing(true);
      const response = await fetch(`/api/hr/timesheets/${timesheetId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: action.toUpperCase(),
          approval_notes: reason,
          approved_at: new Date().toISOString(),
          approved_by: session.user.id,
        }),
      });
      
      if (response.ok) {
        notifySuccess(`Timesheet ${action.toLowerCase()} successfully`);
        fetchPendingApprovals();
        setSelectedTimesheet(null);
      } else {
        notifyError(`Failed to ${action.toLowerCase()} timesheet`);
      }
    } catch (error) {
      console.error('Error processing timesheet:', error);
      notifyError(`Error ${action.toLowerCase()}ing timesheet`);
    } finally {
      setProcessing(false);
    }
  };
  
  const handleTimeOffAction = async (requestId, action, reason = '') => {
    try {
      setProcessing(true);
      const response = await fetch(`/api/hr/time-off-requests/${requestId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: action.toUpperCase(),
          approval_notes: reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: session.user.id,
        }),
      });
      
      if (response.ok) {
        notifySuccess(`Time off request ${action.toLowerCase()} successfully`);
        fetchPendingApprovals();
      } else {
        notifyError(`Failed to ${action.toLowerCase()} time off request`);
      }
    } catch (error) {
      console.error('Error processing time off request:', error);
      notifyError(`Error ${action.toLowerCase()}ing time off request`);
    } finally {
      setProcessing(false);
    }
  };
  
  const calculateTimesheetHours = (timesheet) => {
    return {
      regular: timesheet.total_regular_hours || 0,
      overtime: timesheet.total_overtime_hours || 0,
      sick: timesheet.total_sick_hours || 0,
      vacation: timesheet.total_vacation_hours || 0,
      holiday: timesheet.total_holiday_hours || 0,
      unpaid: timesheet.total_unpaid_hours || 0,
      total: timesheet.total_hours || 0
    };
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <StandardSpinner size="large" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Supervisor Approvals</h2>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 mr-1 text-yellow-500" />
            <span>{pendingTimesheets.length} Timesheets</span>
          </div>
          <div className="flex items-center">
            <CalendarIcon className="h-5 w-5 mr-1 text-blue-500" />
            <span>{pendingTimeOffRequests.length} Time Off Requests</span>
          </div>
        </div>
      </div>
      
      {/* Pending Timesheets */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ClockIcon className="h-5 w-5 mr-2 text-yellow-500" />
          Pending Timesheet Approvals
        </h3>
        
        {pendingTimesheets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2">No pending timesheet approvals</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingTimesheets.map((timesheet) => {
              const hours = calculateTimesheetHours(timesheet);
              const isExpanded = expandedCard === timesheet.id;
              
              return (
                <div key={timesheet.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <UserIcon className="h-8 w-8 text-gray-400" />
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {timesheet.employee_name || 'Unknown Employee'}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {format(parseISO(timesheet.period_start), 'MMM d')} - 
                          {format(parseISO(timesheet.period_end), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {hours.total.toFixed(1)} hours
                        </p>
                        <p className="text-xs text-gray-500">
                          Submitted {format(parseISO(timesheet.submitted_at), 'MMM d')}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => setExpandedCard(isExpanded ? null : timesheet.id)}
                        className="p-2 hover:bg-gray-200 rounded-full"
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Regular</p>
                          <p className="font-medium">{hours.regular.toFixed(1)}h</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Overtime</p>
                          <p className="font-medium">{hours.overtime.toFixed(1)}h</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Sick/Vacation</p>
                          <p className="font-medium">{(hours.sick + hours.vacation).toFixed(1)}h</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Holiday/Unpaid</p>
                          <p className="font-medium">{(hours.holiday + hours.unpaid).toFixed(1)}h</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => {
                            setSelectedTimesheet(timesheet);
                            fetchTimesheetDetails(timesheet.id);
                          }}
                          className="flex items-center px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View Details
                        </button>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleTimesheetAction(timesheet.id, 'REJECTED', 'Please review and resubmit')}
                            disabled={processing}
                            className="px-4 py-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 disabled:opacity-50"
                          >
                            <XMarkIcon className="h-4 w-4 inline mr-1" />
                            Reject
                          </button>
                          <button
                            onClick={() => handleTimesheetAction(timesheet.id, 'APPROVED')}
                            disabled={processing}
                            className="px-4 py-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 disabled:opacity-50"
                          >
                            <CheckCircleIcon className="h-4 w-4 inline mr-1" />
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Pending Time Off Requests */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
          Pending Time Off Requests
        </h3>
        
        {pendingTimeOffRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2">No pending time off requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingTimeOffRequests.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <UserIcon className="h-8 w-8 text-gray-400" />
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {request.employee_name || 'Unknown Employee'}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {request.request_type} - {request.total_days} days
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(parseISO(request.start_date), 'MMM d')} - 
                        {format(parseISO(request.end_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleTimeOffAction(request.id, 'REJECTED', 'Request denied')}
                      disabled={processing}
                      className="px-4 py-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 disabled:opacity-50"
                    >
                      <XMarkIcon className="h-4 w-4 inline mr-1" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleTimeOffAction(request.id, 'APPROVED')}
                      disabled={processing}
                      className="px-4 py-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 disabled:opacity-50"
                    >
                      <CheckCircleIcon className="h-4 w-4 inline mr-1" />
                      Approve
                    </button>
                  </div>
                </div>
                
                {request.notes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-700">
                      <strong>Notes:</strong> {request.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Timesheet Detail Modal */}
      {selectedTimesheet && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Timesheet Details</h3>
                <button
                  onClick={() => setSelectedTimesheet(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <div className="bg-green-50 rounded-lg overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-green-800 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase">Date</th>
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase">Regular</th>
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase">Overtime</th>
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase">Sick</th>
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase">Vacation</th>
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase">Holiday</th>
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase">Unpaid</th>
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-green-200">
                    {timesheetEntries.map((entry) => {
                      const dayTotal = (entry.regular_hours || 0) + (entry.overtime_hours || 0) + 
                                       (entry.sick_hours || 0) + (entry.vacation_hours || 0) + 
                                       (entry.holiday_hours || 0) + (entry.unpaid_hours || 0);
                      
                      return (
                        <tr key={entry.id} className="bg-green-50">
                          <td className="px-3 py-2 text-sm font-medium">
                            {format(parseISO(entry.date), 'EEE, MMM d')}
                          </td>
                          <td className="px-3 py-2 text-center text-sm">{entry.regular_hours || 0}</td>
                          <td className="px-3 py-2 text-center text-sm">{entry.overtime_hours || 0}</td>
                          <td className="px-3 py-2 text-center text-sm">{entry.sick_hours || 0}</td>
                          <td className="px-3 py-2 text-center text-sm">{entry.vacation_hours || 0}</td>
                          <td className="px-3 py-2 text-center text-sm">{entry.holiday_hours || 0}</td>
                          <td className="px-3 py-2 text-center text-sm">{entry.unpaid_hours || 0}</td>
                          <td className="px-3 py-2 text-center text-sm font-medium">{dayTotal.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedTimesheet(null)}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
                <button
                  onClick={() => handleTimesheetAction(selectedTimesheet.id, 'REJECTED', 'Please review and resubmit')}
                  disabled={processing}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  Reject Timesheet
                </button>
                <button
                  onClick={() => handleTimesheetAction(selectedTimesheet.id, 'APPROVED')}
                  disabled={processing}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Approve Timesheet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}