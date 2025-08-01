'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession-v2';
import { PhosphorIcon } from '@phosphor-icons/react';
import { Clock, CalendarCheck, Plus, Warning } from '@phosphor-icons/react';

const EmployeeTimesheet = () => {
  const { session, loading: sessionLoading } = useSession();
  
  // State management
  const [currentTimesheet, setCurrentTimesheet] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('timesheet');
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [clockStatus, setClockStatus] = useState(null);

  // Debug logging
  useEffect(() => {
    console.log('🕐 [EmployeeTimesheet] Component mounted');
    console.log('🕐 [EmployeeTimesheet] Session:', {
      authenticated: session?.authenticated,
      userEmail: session?.user?.email,
      hasEmployee: !!session?.user?.employee
    });
  }, []);

  // Fetch current week timesheet
  const fetchCurrentTimesheet = async () => {
    try {
      console.log('🕐 [EmployeeTimesheet] Fetching current week timesheet');
      setLoading(true);
      
      const response = await fetch('/api/timesheets/v2/employee-timesheets/current_week', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🕐 [EmployeeTimesheet] Timesheet API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🕐 [EmployeeTimesheet] API error:', errorText);
        
        // Handle specific error cases
        if (response.status === 404) {
          setError('Employee record not found. Please contact your administrator to set up your employee profile.');
        } else if (response.status === 500) {
          setError('Server error loading timesheet. This might be because you don\'t have an employee record set up yet.');
        } else {
          setError(`Failed to fetch timesheet: ${response.status}`);
        }
        
        throw new Error(`Failed to fetch timesheet: ${response.status}`);
      }

      const timesheetData = await response.json();
      console.log('🕐 [EmployeeTimesheet] Received timesheet data:', {
        id: timesheetData.id,
        status: timesheetData.status,
        weekStarting: timesheetData.week_starting,
        weekEnding: timesheetData.week_ending,
        totalHours: timesheetData.total_hours,
        entriesCount: timesheetData.entries?.length,
        canEdit: ['draft', 'rejected'].includes(timesheetData.status)
      });

      setCurrentTimesheet(timesheetData);
      setTimeEntries(timesheetData.entries || []);
      setError(null);

    } catch (err) {
      console.error('🕐 [EmployeeTimesheet] Error fetching timesheet:', err);
      setError(err.message || 'Failed to load timesheet');
    } finally {
      setLoading(false);
    }
  };

  // Fetch time off requests
  const fetchTimeOffRequests = async () => {
    try {
      console.log('🕐 [EmployeeTimesheet] Fetching time off requests');
      
      const response = await fetch('/api/timesheets/v2/time-off-requests', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const requests = await response.json();
        console.log('🕐 [EmployeeTimesheet] Received time off requests:', requests);
        setTimeOffRequests(requests);
      }
    } catch (err) {
      console.error('🕐 [EmployeeTimesheet] Error fetching time off requests:', err);
    }
  };

  // Fetch clock status
  const fetchClockStatus = async () => {
    try {
      console.log('🕐 [EmployeeTimesheet] Fetching clock status');
      
      const response = await fetch('/api/timesheets/v2/clock-entries/status', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const status = await response.json();
        console.log('🕐 [EmployeeTimesheet] Clock status:', status);
        setClockStatus(status);
      }
    } catch (err) {
      console.error('🕐 [EmployeeTimesheet] Error fetching clock status:', err);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (!sessionLoading && session?.authenticated) {
      console.log('🕐 [EmployeeTimesheet] Session loaded, checking for employee record:', {
        hasEmployee: !!session?.user?.employee,
        userRole: session?.user?.role,
        userEmail: session?.user?.email
      });
      
      fetchCurrentTimesheet();
      fetchTimeOffRequests();
      fetchClockStatus();
    }
  }, [sessionLoading, session?.authenticated]);

  // Update time entry
  const updateTimeEntry = (entryId, field, value) => {
    console.log('🕐 [EmployeeTimesheet] Updating time entry:', { entryId, field, value });
    
    setTimeEntries(prev => prev.map(entry => 
      entry.id === entryId 
        ? { ...entry, [field]: parseFloat(value) || 0 }
        : entry
    ));
  };

  // Save timesheet entries
  const saveTimesheetEntries = async () => {
    if (!currentTimesheet) return;

    try {
      console.log('🕐 [EmployeeTimesheet] Saving timesheet entries');
      setSaving(true);

      const response = await fetch(`/api/timesheets/v2/employee-timesheets/${currentTimesheet.id}/update_entries`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries: timeEntries.map(entry => ({
            id: entry.id,
            regular_hours: entry.regular_hours || 0,
            overtime_hours: entry.overtime_hours || 0,
            sick_hours: entry.sick_hours || 0,
            vacation_hours: entry.vacation_hours || 0,
            unpaid_leave_hours: entry.unpaid_leave_hours || 0,
            notes: entry.notes || ''
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save timesheet');
      }

      const updatedTimesheet = await response.json();
      setCurrentTimesheet(updatedTimesheet);
      setTimeEntries(updatedTimesheet.entries || []);
      
      console.log('🕐 [EmployeeTimesheet] Timesheet saved successfully');
      
    } catch (err) {
      console.error('🕐 [EmployeeTimesheet] Error saving timesheet:', err);
      setError(err.message || 'Failed to save timesheet');
    } finally {
      setSaving(false);
    }
  };

  // Submit timesheet for approval
  const submitForApproval = async () => {
    if (!currentTimesheet) return;

    try {
      console.log('🕐 [EmployeeTimesheet] Submitting timesheet for approval');
      setSaving(true);

      const response = await fetch(`/api/timesheets/v2/employee-timesheets/${currentTimesheet.id}/submit_for_approval`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit timesheet');
      }

      const updatedTimesheet = await response.json();
      setCurrentTimesheet(updatedTimesheet);
      
      console.log('🕐 [EmployeeTimesheet] Timesheet submitted successfully');
      
    } catch (err) {
      console.error('🕐 [EmployeeTimesheet] Error submitting timesheet:', err);
      setError(err.message || 'Failed to submit timesheet');
    } finally {
      setSaving(false);
    }
  };

  // Clock in/out functions
  const handleClockIn = async () => {
    try {
      console.log('🕐 [EmployeeTimesheet] Clocking in');
      
      const response = await fetch('/api/timesheets/v2/clock-entries/clock_in', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_type: 'web',
          notes: 'Clocked in from timesheet'
        }),
      });

      if (response.ok) {
        await fetchClockStatus();
        await fetchCurrentTimesheet(); // Refresh timesheet
        console.log('🕐 [EmployeeTimesheet] Clocked in successfully');
      }
    } catch (err) {
      console.error('🕐 [EmployeeTimesheet] Error clocking in:', err);
    }
  };

  const handleClockOut = async () => {
    try {
      console.log('🕐 [EmployeeTimesheet] Clocking out');
      
      const response = await fetch('/api/timesheets/v2/clock-entries/clock_out', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_type: 'web',
          notes: 'Clocked out from timesheet'
        }),
      });

      if (response.ok) {
        await fetchClockStatus();
        await fetchCurrentTimesheet(); // Refresh timesheet
        console.log('🕐 [EmployeeTimesheet] Clocked out successfully');
      }
    } catch (err) {
      console.error('🕐 [EmployeeTimesheet] Error clocking out:', err);
    }
  };

  // Loading state
  if (sessionLoading || loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading timesheet...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    const isEmployeeError = error.includes('Employee record not found') || error.includes('employee record set up');
    
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className={`border rounded-lg p-4 ${
          isEmployeeError ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center">
            <Warning className={`h-5 w-5 mr-2 ${
              isEmployeeError ? 'text-blue-400' : 'text-red-400'
            }`} />
            <h3 className={`text-sm font-medium ${
              isEmployeeError ? 'text-blue-800' : 'text-red-800'
            }`}>
              {isEmployeeError ? 'Setup Required' : 'Error Loading Timesheet'}
            </h3>
          </div>
          <p className={`mt-2 text-sm ${
            isEmployeeError ? 'text-blue-700' : 'text-red-700'
          }`}>
            {error}
          </p>
          {isEmployeeError ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-blue-600">
                To use the timesheet feature, you need an employee profile set up. This is typically done by:
              </p>
              <ul className="text-sm text-blue-600 list-disc list-inside ml-4">
                <li>Your administrator or HR department</li>
                <li>Going to the HR section and creating your employee profile</li>
                <li>Being invited as an employee by your organization</li>
              </ul>
            </div>
          ) : (
            <button
              onClick={() => {
                setError(null);
                fetchCurrentTimesheet();
              }}
              className="mt-3 text-sm font-medium text-red-800 hover:text-red-900"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">My Timesheet</h1>
              {currentTimesheet && (
                <p className="text-sm text-gray-600 mt-1">
                  Week of {new Date(currentTimesheet.week_starting).toLocaleDateString()} - {new Date(currentTimesheet.week_ending).toLocaleDateString()}
                </p>
              )}
            </div>
            
            {/* Clock Status */}
            {clockStatus && (
              <div className="flex items-center space-x-4">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  clockStatus.is_clocked_in 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {clockStatus.is_clocked_in ? 'Clocked In' : 'Clocked Out'}
                </div>
                
                <button
                  onClick={clockStatus.is_clocked_in ? handleClockOut : handleClockIn}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    clockStatus.is_clocked_in
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  <Clock className="w-4 h-4 mr-2 inline-block" />
                  {clockStatus.is_clocked_in ? 'Clock Out' : 'Clock In'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('timesheet')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'timesheet'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Timesheet
            </button>
            <button
              onClick={() => setActiveTab('leave-requests')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'leave-requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Leave Requests
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'timesheet' && (
            <TimesheetTab
              timesheet={currentTimesheet}
              entries={timeEntries}
              onUpdateEntry={updateTimeEntry}
              onSave={saveTimesheetEntries}
              onSubmit={submitForApproval}
              saving={saving}
            />
          )}
          
          {activeTab === 'leave-requests' && (
            <LeaveRequestsTab
              requests={timeOffRequests}
              onRefresh={fetchTimeOffRequests}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Timesheet Tab Component
const TimesheetTab = ({ timesheet, entries, onUpdateEntry, onSave, onSubmit, saving }) => {
  console.log('🕐 [TimesheetTab] Rendering with full timesheet:', timesheet);
  console.log('🕐 [TimesheetTab] Summary:', {
    timesheetId: timesheet?.id,
    status: timesheet?.status,
    entriesCount: entries?.length,
    totalHours: timesheet?.total_hours,
    entries: entries?.map(e => ({
      date: e.date,
      regularHours: e.regular_hours,
      overtimeHours: e.overtime_hours
    }))
  });
  
  if (!timesheet) return null;

  const canEdit = ['draft', 'rejected'].includes(timesheet.status);
  const canSubmit = timesheet.status === 'draft' && timesheet.total_hours > 0;
  
  console.log('🕐 [TimesheetTab] Edit permissions:', {
    canEdit,
    canSubmit,
    status: timesheet.status,
    statusIsDraft: timesheet.status === 'draft',
    statusIsRejected: timesheet.status === 'rejected'
  });

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`p-4 rounded-lg ${
        timesheet.status === 'approved' ? 'bg-green-50 border border-green-200' :
        timesheet.status === 'submitted' ? 'bg-yellow-50 border border-yellow-200' :
        timesheet.status === 'rejected' ? 'bg-red-50 border border-red-200' :
        'bg-blue-50 border border-blue-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-sm font-medium ${
              timesheet.status === 'approved' ? 'text-green-800' :
              timesheet.status === 'submitted' ? 'text-yellow-800' :
              timesheet.status === 'rejected' ? 'text-red-800' :
              'text-blue-800'
            }`}>
              Status: {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
            </h3>
            {timesheet.supervisor_notes && (
              <p className="text-sm text-gray-600 mt-1">Notes: {timesheet.supervisor_notes}</p>
            )}
          </div>
          
          <div className="flex space-x-3">
            {canEdit && (
              <button
                onClick={onSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
            
            {canSubmit && (
              <button
                onClick={onSubmit}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                Submit for Approval
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Time Entries Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Day
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Regular Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Overtime Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sick Leave
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vacation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unpaid Leave
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.25"
                    value={entry.regular_hours || ''}
                    onChange={(e) => onUpdateEntry(entry.id, 'regular_hours', e.target.value)}
                    disabled={!canEdit}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.25"
                    value={entry.overtime_hours || ''}
                    onChange={(e) => onUpdateEntry(entry.id, 'overtime_hours', e.target.value)}
                    disabled={!canEdit}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.25"
                    value={entry.sick_hours || ''}
                    onChange={(e) => onUpdateEntry(entry.id, 'sick_hours', e.target.value)}
                    disabled={!canEdit}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.25"
                    value={entry.vacation_hours || ''}
                    onChange={(e) => onUpdateEntry(entry.id, 'vacation_hours', e.target.value)}
                    disabled={!canEdit}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.25"
                    value={entry.unpaid_leave_hours || ''}
                    onChange={(e) => onUpdateEntry(entry.id, 'unpaid_leave_hours', e.target.value)}
                    disabled={!canEdit}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={entry.notes || ''}
                    onChange={(e) => onUpdateEntry(entry.id, 'notes', e.target.value)}
                    disabled={!canEdit}
                    placeholder="Optional notes"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600">Total Regular Hours</p>
            <p className="text-lg font-semibold text-gray-900">{timesheet.total_regular_hours || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Overtime Hours</p>
            <p className="text-lg font-semibold text-gray-900">{timesheet.total_overtime_hours || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Hours</p>
            <p className="text-lg font-semibold text-gray-900">{timesheet.total_hours || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Leave Requests Tab Component
const LeaveRequestsTab = ({ requests, onRefresh }) => {
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Time Off Requests</h3>
        <button
          onClick={() => setShowNewRequestForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2 inline-block" />
          New Request
        </button>
      </div>

      {/* New Request Form */}
      {showNewRequestForm && (
        <NewTimeOffRequestForm
          onClose={() => setShowNewRequestForm(false)}
          onSuccess={() => {
            setShowNewRequestForm(false);
            onRefresh();
          }}
        />
      )}

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CalendarCheck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No time off requests found</p>
          </div>
        ) : (
          requests.map((request) => (
            <TimeOffRequestCard key={request.id} request={request} />
          ))
        )}
      </div>
    </div>
  );
};

// Time Off Request Card Component
const TimeOffRequestCard = ({ request }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-800 bg-green-100';
      case 'rejected': return 'text-red-800 bg-red-100';
      case 'pending': return 'text-yellow-800 bg-yellow-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h4 className="text-sm font-medium text-gray-900">
              {request.request_type.charAt(0).toUpperCase() + request.request_type.slice(1)} Leave
            </h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
            {request.total_days && ` (${request.total_days} days)`}
          </p>
          {request.reason && (
            <p className="text-sm text-gray-600 mt-1">Reason: {request.reason}</p>
          )}
          {request.review_notes && (
            <p className="text-sm text-gray-600 mt-1">Notes: {request.review_notes}</p>
          )}
        </div>
        <div className="text-sm text-gray-500">
          Requested {new Date(request.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

// New Time Off Request Form Component
const NewTimeOffRequestForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    request_type: 'vacation',
    start_date: '',
    end_date: '',
    is_full_day: true,
    start_time: '',
    end_time: '',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      console.log('🕐 [NewTimeOffRequestForm] Submitting request:', formData);

      const response = await fetch('/api/timesheets/v2/time-off-requests', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit request');
      }

      console.log('🕐 [NewTimeOffRequestForm] Request submitted successfully');
      onSuccess();

    } catch (err) {
      console.error('🕐 [NewTimeOffRequestForm] Error submitting request:', err);
      setError(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">New Time Off Request</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <span className="sr-only">Close</span>
          ×
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Request Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Request Type
          </label>
          <select
            value={formData.request_type}
            onChange={(e) => handleInputChange('request_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="vacation">Vacation</option>
            <option value="sick">Sick Leave</option>
            <option value="personal">Personal Leave</option>
            <option value="unpaid">Unpaid Leave</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => handleInputChange('start_date', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => handleInputChange('end_date', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Full Day Toggle */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_full_day}
              onChange={(e) => handleInputChange('is_full_day', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Full day(s)</span>
          </label>
        </div>

        {/* Time Range (if not full day) */}
        {!formData.is_full_day && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => handleInputChange('start_time', e.target.value)}
                required={!formData.is_full_day}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => handleInputChange('end_time', e.target.value)}
                required={!formData.is_full_day}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => handleInputChange('reason', e.target.value)}
            required
            rows={3}
            placeholder="Please provide a reason for your time off request"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeTimesheet;