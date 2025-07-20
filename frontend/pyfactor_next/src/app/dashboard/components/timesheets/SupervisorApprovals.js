'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircleIcon, XCircleIcon, ClockIcon, CalendarIcon } from '@heroicons/react/24/outline';
import timesheetApi from '@/utils/api/timesheetApi';
import StandardSpinner from '@/components/StandardSpinner';
import { toast } from '@/hooks/useToast';
import { useSession } from '@/hooks/useSession';

export default function SupervisorApprovals() {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timesheets');
  const [pendingTimesheets, setPendingTimesheets] = useState([]);
  const [pendingTimeOffRequests, setPendingTimeOffRequests] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingApprovals();
  }, [activeTab]);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'timesheets') {
        const response = await timesheetApi.getPendingApprovals();
        setPendingTimesheets(response.timesheets || []);
      } else {
        const response = await timesheetApi.getPendingTimeOffRequests();
        setPendingTimeOffRequests(response.requests || []);
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending approvals',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTimesheetAction = async (timesheetId, action) => {
    try {
      setProcessing(true);
      await timesheetApi.approveTimesheet(timesheetId, {
        action,
        notes: approvalNotes
      });
      
      toast({
        title: 'Success',
        description: `Timesheet ${action}d successfully`
      });
      
      setSelectedItem(null);
      setApprovalNotes('');
      fetchPendingApprovals();
    } catch (error) {
      console.error(`Error ${action}ing timesheet:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} timesheet`,
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleTimeOffAction = async (requestId, action) => {
    try {
      setProcessing(true);
      await timesheetApi.reviewTimeOffRequest(requestId, {
        action,
        notes: approvalNotes
      });
      
      toast({
        title: 'Success',
        description: `Time off request ${action}d successfully`
      });
      
      setSelectedItem(null);
      setApprovalNotes('');
      fetchPendingApprovals();
    } catch (error) {
      console.error(`Error ${action}ing time off request:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} time off request`,
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const isSupervisor = userData?.role === 'SUPERVISOR' || userData?.role === 'ADMIN' || userData?.role === 'OWNER';

  if (loading) {
    return <CenteredSpinner size="medium" />;
  }

  if (!isSupervisor) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Pending Approvals
          </h3>
          
          {/* Add your approval interface here */}
          <div className="text-gray-500">
            Supervisor approval interface coming soon...
          </div>
        </div>
      </div>
    </div>
  );
};<truncated_message>