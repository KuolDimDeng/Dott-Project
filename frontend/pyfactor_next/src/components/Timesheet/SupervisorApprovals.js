'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession-v2';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { Clock, CalendarCheck, CheckCircle, XCircle, Warning, User, Calendar } from '@phosphor-icons/react';

const SupervisorApprovals = () => {
  const { session, loading: sessionLoading } = useSession();
  
  // State management
  const [pendingTimesheets, setPendingTimesheets] = useState([]);
  const [pendingTimeOffRequests, setPendingTimeOffRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('timesheets');

  // Debug logging
  useEffect(() => {
    console.log('👔 [SupervisorApprovals] Component mounted');
    console.log('👔 [SupervisorApprovals] Session:', {
      authenticated: session?.authenticated,
      userEmail: session?.user?.email,
      hasEmployee: !!session?.user?.employee
    });
  }, []);

  // Fetch pending approvals
  const fetchPendingApprovals = async () => {
    try {
      console.log('👔 [SupervisorApprovals] Fetching pending approvals');
      setLoading(true);
      
      // Fetch pending timesheets
      const timesheetsResponse = await fetch('/api/timesheets/v2/supervisor-approvals/pending_timesheets/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('👔 [SupervisorApprovals] Timesheets API response status:', timesheetsResponse.status);

      if (timesheetsResponse.ok) {
        const timesheetsData = await timesheetsResponse.json();
        console.log('👔 [SupervisorApprovals] Received timesheets data:', timesheetsData);
        setPendingTimesheets(timesheetsData.timesheets || []);
      }

      // Fetch pending time off requests
      const timeOffResponse = await fetch('/api/timesheets/v2/time-off-requests/pending_approvals/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('👔 [SupervisorApprovals] Time off API response status:', timeOffResponse.status);

      if (timeOffResponse.ok) {
        const timeOffData = await timeOffResponse.json();
        console.log('👔 [SupervisorApprovals] Received time off data:', timeOffData);
        setPendingTimeOffRequests(timeOffData.requests || []);
      }

      setError(null);
    } catch (err) {
      console.error('👔 [SupervisorApprovals] Error fetching pending approvals:', err);
      setError(err.message || 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (!sessionLoading && session?.authenticated) {
      fetchPendingApprovals();
    }
  }, [sessionLoading, session?.authenticated]);

  // Approve timesheet
  const approveTimesheet = async (timesheetId) => {
    try {
      console.log('👔 [SupervisorApprovals] Approving timesheet:', timesheetId);
      setProcessing(true);

      const response = await fetch('/api/timesheets/v2/supervisor-approvals/approve_timesheet/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timesheet_id: timesheetId,
          notes: 'Approved by supervisor'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve timesheet');
      }

      console.log('👔 [SupervisorApprovals] Timesheet approved successfully');
      
      // Refresh the pending approvals
      await fetchPendingApprovals();
      
    } catch (err) {
      console.error('👔 [SupervisorApprovals] Error approving timesheet:', err);
      setError(err.message || 'Failed to approve timesheet');
    } finally {
      setProcessing(false);
    }
  };

  // Reject timesheet
  const rejectTimesheet = async (timesheetId, notes = '') => {
    try {
      console.log('👔 [SupervisorApprovals] Rejecting timesheet:', timesheetId);
      setProcessing(true);

      const response = await fetch('/api/timesheets/v2/supervisor-approvals/reject_timesheet/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timesheet_id: timesheetId,
          notes: notes || 'Please review and resubmit'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject timesheet');
      }

      console.log('👔 [SupervisorApprovals] Timesheet rejected successfully');
      
      // Refresh the pending approvals
      await fetchPendingApprovals();
      
    } catch (err) {
      console.error('👔 [SupervisorApprovals] Error rejecting timesheet:', err);
      setError(err.message || 'Failed to reject timesheet');
    } finally {
      setProcessing(false);
    }
  };

  // Approve time off request
  const approveTimeOffRequest = async (requestId) => {
    try {
      console.log('👔 [SupervisorApprovals] Approving time off request:', requestId);
      setProcessing(true);

      const response = await fetch(`/api/timesheets/v2/time-off-requests/${requestId}/approve/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: 'Approved by supervisor'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve time off request');
      }

      console.log('👔 [SupervisorApprovals] Time off request approved successfully');
      
      // Refresh the pending approvals
      await fetchPendingApprovals();
      
    } catch (err) {
      console.error('👔 [SupervisorApprovals] Error approving time off request:', err);
      setError(err.message || 'Failed to approve time off request');
    } finally {
      setProcessing(false);
    }
  };

  // Reject time off request
  const rejectTimeOffRequest = async (requestId, notes = '') => {
    try {
      console.log('👔 [SupervisorApprovals] Rejecting time off request:', requestId);
      setProcessing(true);

      const response = await fetch(`/api/timesheets/v2/time-off-requests/${requestId}/reject/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: notes || 'Request not approved'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject time off request');
      }

      console.log('👔 [SupervisorApprovals] Time off request rejected successfully');
      
      // Refresh the pending approvals
      await fetchPendingApprovals();
      
    } catch (err) {
      console.error('👔 [SupervisorApprovals] Error rejecting time off request:', err);
      setError(err.message || 'Failed to reject time off request');
    } finally {
      setProcessing(false);
    }
  };

  // Loading state
  if (sessionLoading || loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <StandardSpinner size="large" text="Loading approvals..." />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <Warning className="h-5 w-5 text-red-400 mr-2" />
            <h3 className="text-sm font-medium text-red-800">Error Loading Approvals</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchPendingApprovals();
            }}
            className="mt-3 text-sm font-medium text-red-800 hover:text-red-900"
          >
            Try Again
          </button>
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
              <h1 className="text-2xl font-semibold text-gray-900">Team Approvals</h1>
              <p className="text-sm text-gray-600 mt-1">
                Review and approve timesheets and time off requests from your team
              </p>
            </div>
            
            {/* Summary Stats */}
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{pendingTimesheets.length}</div>
                <div className="text-xs text-gray-500">Pending Timesheets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{pendingTimeOffRequests.length}</div>
                <div className="text-xs text-gray-500">Time Off Requests</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('timesheets')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'timesheets'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Clock className="w-4 h-4 mr-2 inline-block" />
              Timesheets ({pendingTimesheets.length})
            </button>
            <button
              onClick={() => setActiveTab('time-off')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'time-off'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CalendarCheck className="w-4 h-4 mr-2 inline-block" />
              Time Off ({pendingTimeOffRequests.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'timesheets' && (
            <TimesheetsTab
              timesheets={pendingTimesheets}
              onApprove={approveTimesheet}
              onReject={rejectTimesheet}
              processing={processing}
            />
          )}
          
          {activeTab === 'time-off' && (
            <TimeOffTab
              requests={pendingTimeOffRequests}
              onApprove={approveTimeOffRequest}
              onReject={rejectTimeOffRequest}
              processing={processing}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Timesheets Tab Component
const TimesheetsTab = ({ timesheets, onApprove, onReject, processing }) => {
  if (timesheets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No pending timesheets for approval</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {timesheets.map((timesheet) => (
        <TimesheetCard
          key={timesheet.id}
          timesheet={timesheet}
          onApprove={onApprove}
          onReject={onReject}
          processing={processing}
        />
      ))}
    </div>
  );
};

// Time Off Tab Component
const TimeOffTab = ({ requests, onApprove, onReject, processing }) => {
  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <CalendarCheck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No pending time off requests for approval</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {requests.map((request) => (
        <TimeOffRequestCard
          key={request.id}
          request={request}
          onApprove={onApprove}
          onReject={onReject}
          processing={processing}
        />
      ))}
    </div>
  );
};

// Timesheet Card Component
const TimesheetCard = ({ timesheet, onApprove, onReject, processing }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <User className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">
              {timesheet.employee_name}
            </h3>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Pending Review
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-500">Week Period</p>
              <p className="font-medium">
                {new Date(timesheet.week_starting).toLocaleDateString()} - {new Date(timesheet.week_ending).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Regular Hours</p>
              <p className="font-medium">{timesheet.total_regular_hours || 0} hrs</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Overtime Hours</p>
              <p className="font-medium">{timesheet.total_overtime_hours || 0} hrs</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Hours</p>
              <p className="font-medium">{timesheet.total_hours || 0} hrs</p>
            </div>
          </div>

          {timesheet.employee_notes && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Employee Notes</p>
              <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                {timesheet.employee_notes}
              </p>
            </div>
          )}
        </div>

        <div className="flex space-x-3 ml-6">
          <button
            onClick={() => onReject(timesheet.id)}
            disabled={processing}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center"
          >
            <XCircle className="w-4 h-4 mr-2" />
            {processing ? 'Processing...' : 'Reject'}
          </button>
          <button
            onClick={() => onApprove(timesheet.id)}
            disabled={processing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {processing ? 'Processing...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Time Off Request Card Component
const TimeOffRequestCard = ({ request, onApprove, onReject, processing }) => {
  const getRequestTypeColor = (type) => {
    switch (type) {
      case 'vacation': return 'bg-blue-100 text-blue-800';
      case 'sick': return 'bg-red-100 text-red-800';
      case 'personal': return 'bg-purple-100 text-purple-800';
      case 'unpaid': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <User className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">
              {request.employee_name}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRequestTypeColor(request.request_type)}`}>
              {request.request_type.charAt(0).toUpperCase() + request.request_type.slice(1)} Leave
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="font-medium">
                {new Date(request.start_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">End Date</p>
              <p className="font-medium">
                {new Date(request.end_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="font-medium">
                {request.total_days ? `${request.total_days} days` : 
                 request.total_hours ? `${request.total_hours} hours` : 'TBD'}
              </p>
            </div>
          </div>

          {request.reason && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Reason</p>
              <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                {request.reason}
              </p>
            </div>
          )}

          <div className="mt-2 text-xs text-gray-500">
            Requested on {new Date(request.created_at).toLocaleDateString()}
          </div>
        </div>

        <div className="flex space-x-3 ml-6">
          <button
            onClick={() => onReject(request.id)}
            disabled={processing}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center"
          >
            <XCircle className="w-4 h-4 mr-2" />
            {processing ? 'Processing...' : 'Reject'}
          </button>
          <button
            onClick={() => onApprove(request.id)}
            disabled={processing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {processing ? 'Processing...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupervisorApprovals;