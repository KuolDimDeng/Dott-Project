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

  const isSuper<truncated_message>