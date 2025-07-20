'use client';


import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { format } from 'date-fns';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

const TimesheetAdmin = ({ userData, isOwner }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingTimesheets, setPendingTimesheets] = useState([]);
  const [pendingTimeOff, setPendingTimeOff] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [selectedTimeOff, setSelectedTimeOff] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingTimesheet, setRejectingTimesheet] = useState(true); // true for timesheet, false for time off

  useEffect(() => {
    // Mock data for demonstration purposes
    // In a real app, you would fetch this data from your API
    const mockEmployees = [
      { id: '1', firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', department: 'Engineering' },
      { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com', department: 'Marketing' },
      { id: '3', firstName: 'Bob', lastName: 'Johnson', email: 'bob.johnson@example.com', department: 'Finance' },
    ];
    
    const mockTimesheets = [
      {
        id: '1',
        employeeId: '1',
        employeeName: 'John Doe',
        periodStart: '2023-05-15',
        periodEnd: '2023-05-21',
        submittedAt: '2023-05-22T09:30:00Z',
        totalRegularHours: 40,
        totalOvertimeHours: 5,
        status: 'SUBMITTED',
        entries: [
          { date: '2023-05-15', regularHours: 8, overtimeHours: 1, notes: 'Project A' },
          { date: '2023-05-16', regularHours: 8, overtimeHours: 0, notes: 'Project B' },
          { date: '2023-05-17', regularHours: 8, overtimeHours: 2, notes: 'Project A' },
          { date: '2023-05-18', regularHours: 8, overtimeHours: 0, notes: 'Project C' },
          { date: '2023-05-19', regularHours: 8, overtimeHours: 2, notes: 'Project A' },
          { date: '2023-05-20', regularHours: 0, overtimeHours: 0, notes: '' },
          { date: '2023-05-21', regularHours: 0, overtimeHours: 0, notes: '' },
        ]
      },
      {
        id: '2',
        employeeId: '2',
        employeeName: 'Jane Smith',
        periodStart: '2023-05-15',
        periodEnd: '2023-05-21',
        submittedAt: '2023-05-22T10:15:00Z',
        totalRegularHours: 40,
        totalOvertimeHours: 0,
        status: 'SUBMITTED',
        entries: [
          { date: '2023-05-15', regularHours: 8, overtimeHours: 0, notes: 'Marketing campaign' },
          { date: '2023-05-16', regularHours: 8, overtimeHours: 0, notes: 'Team meeting' },
          { date: '2023-05-17', regularHours: 8, overtimeHours: 0, notes: 'Content creation' },
          { date: '2023-05-18', regularHours: 8, overtimeHours: 0, notes: 'Social media' },
          { date: '2023-05-19', regularHours: 8, overtimeHours: 0, notes: 'Analytics' },
          { date: '2023-05-20', regularHours: 0, overtimeHours: 0, notes: '' },
          { date: '2023-05-21', regularHours: 0, overtimeHours: 0, notes: '' },
        ]
      }
    ];
    
    const mockTimeOff = [
      {
        id: '1',
        employeeId: '1',
        employeeName: 'John Doe',
        requestType: 'PTO',
        startDate: '2023-06-15',
        endDate: '2023-06-20',
        reason: 'Family vacation',
        submittedAt: '2023-05-20T14:30:00Z',
        status: 'PENDING'
      },
      {
        id: '2',
        employeeId: '3',
        employeeName: 'Bob Johnson',
        requestType: 'SICK',
        startDate: '2023-05-25',
        endDate: '2023-05-25',
        reason: 'Doctor appointment',
        submittedAt: '2023-05-22T09:15:00Z',
        status: 'PENDING'
      }
    ];
    
    setEmployees(mockEmployees);
    setPendingTimesheets(mockTimesheets);
    setPendingTimeOff(mockTimeOff);
    setLoading(false);
  }, []);
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy');
  };
  
  // Format datetime for display
  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return format(date, 'MMM dd, yyyy h:mm a');
  };
  
  // Handle approval of a timesheet
  const handleApproveTimesheet = (timesheetId) => {
    setLoading(true);
    // In a real app, you would call your API to approve the timesheet
    console.log(`Approving timesheet ${timesheetId}`);
    
    // Simulate API call
    setTimeout(() => {
      // Update the local state
      setPendingTimesheets(pendingTimesheets.filter(ts => ts.id !== timesheetId));
      setLoading(false);
      alert('Timesheet approved successfully');
    }, 1000);
  };
  
  // Open reject modal for a timesheet
  const openRejectTimesheetModal = (timesheet) => {
    setSelectedTimesheet(timesheet);
    setRejectionReason('');
    setRejectingTimesheet(true);
    setShowRejectModal(true);
  };
  
  // Handle rejection of a timesheet
  const handleRejectTimesheet = () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    setLoading(true);
    setShowRejectModal(false);
    
    // In a real app, you would call your API to reject the timesheet
    console.log(`Rejecting timesheet ${selectedTimesheet.id} with reason: ${rejectionReason}`);
    
    // Simulate API call
    setTimeout(() => {
      // Update the local state
      setPendingTimesheets(pendingTimesheets.filter(ts => ts.id !== selectedTimesheet.id));
      setSelectedTimesheet(null);
      setRejectionReason('');
      setLoading(false);
      alert('Timesheet rejected successfully');
    }, 1000);
  };
  
  // Handle approval of a time off request
  const handleApproveTimeOff = (timeOffId) => {
    setLoading(true);
    // In a real app, you would call your API to approve the time off request
    console.log(`Approving time off request ${timeOffId}`);
    
    // Simulate API call
    setTimeout(() => {
      // Update the local state
      setPendingTimeOff(pendingTimeOff.filter(to => to.id !== timeOffId));
      setLoading(false);
      alert('Time off request approved successfully');
    }, 1000);
  };
  
  // Open reject modal for a time off request
  const openRejectTimeOffModal = (timeOff) => {
    setSelectedTimeOff(timeOff);
    setRejectionReason('');
    setRejectingTimesheet(false);
    setShowRejectModal(true);
  };
  
  // Handle rejection of a time off request
  const handleRejectTimeOff = () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    setLoading(true);
    setShowRejectModal(false);
    
    // In a real app, you would call your API to reject the time off request
    console.log(`Rejecting time off request ${selectedTimeOff.id} with reason: ${rejectionReason}`);
    
    // Simulate API call
    setTimeout(() => {
      // Update the local state
      setPendingTimeOff(pendingTimeOff.filter(to => to.id !== selectedTimeOff.id));
      setSelectedTimeOff(null);
      setRejectionReason('');
      setLoading(false);
      alert('Time off request rejected successfully');
    }, 1000);
  };
  
  // View timesheet details
  const handleViewTimesheet = (timesheet) => {
    setSelectedTimesheet(timesheet);
  };

  return (
    <div>
      <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
        <Tab.List className="flex border-b border-gray-200">
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Pending Timesheets
          </Tab>
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Time Off Requests
          </Tab>
        </Tab.List>
        
        <Tab.Panels className="mt-4">
          {/* Pending Timesheets Tab */}
          <Tab.Panel>
            {loading ? (
        <CenteredSpinner size="medium" /> ) : selectedTimesheet ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Timesheet Details: {selectedTimesheet.employeeName}
                    </h3>
                    <button
                      onClick={() => setSelectedTimesheet(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Back to List
                    </button>
                  </div>
                  
                  <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Period</p>
                      <p className="mt-1">{formatDate(selectedTimesheet.periodStart)} - {formatDate(selectedTimesheet.periodEnd)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Submitted</p>
                      <p className="mt-1">{formatDateTime(selectedTimesheet.submittedAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Hours</p>
                      <p className="mt-1">Regular: {selectedTimesheet.totalRegularHours}, Overtime: {selectedTimesheet.totalOvertimeHours}</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regular Hours</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime Hours</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedTimesheet.entries.map((entry) => (
                          <tr key={entry.date}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatDate(entry.date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {entry.regularHours}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {entry.overtimeHours}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {entry.notes}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => openRejectTimesheetModal(selectedTimesheet)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                      disabled={loading}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveTimesheet(selectedTimesheet.id)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                      disabled={loading}
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            ) : pendingTimesheets.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Timesheet Approvals</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours (Reg/OT)</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pendingTimesheets.map((timesheet) => (
                          <tr key={timesheet.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {timesheet.employeeName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(timesheet.periodStart)} - {formatDate(timesheet.periodEnd)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {timesheet.totalRegularHours} / {timesheet.totalOvertimeHours}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateTime(timesheet.submittedAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleViewTimesheet(timesheet)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => openRejectTimesheetModal(timesheet)}
                                  className="text-red-600 hover:text-red-800"
                                  disabled={loading}
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleApproveTimesheet(timesheet.id)}
                                  className="text-green-600 hover:text-green-800"
                                  disabled={loading}
                                >
                                  Approve
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <p className="text-gray-500">No pending timesheets found.</p>
              </div>
            )}
          </Tab.Panel>
          
          {/* Time Off Requests Tab */}
          <Tab.Panel>
            {loading ? (
        <CenteredSpinner size="medium" /> ) : pendingTimeOff.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Time Off Requests</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pendingTimeOff.map((request) => (
                          <tr key={request.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {request.employeeName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {request.requestType === 'PTO' ? 'Paid Time Off' : 'Sick Leave'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(request.startDate)} {request.startDate !== request.endDate && `- ${formatDate(request.endDate)}`}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                              {request.reason}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateTime(request.submittedAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => openRejectTimeOffModal(request)}
                                  className="text-red-600 hover:text-red-800"
                                  disabled={loading}
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleApproveTimeOff(request.id)}
                                  className="text-green-600 hover:text-green-800"
                                  disabled={loading}
                                >
                                  Approve
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <p className="text-gray-500">No pending time off requests found.</p>
              </div>
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
      
      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Reject {rejectingTimesheet ? 'Timesheet' : 'Time Off Request'}
            </h3>
            
            <div>
              <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Rejection
              </label>
              <textarea
                id="rejection-reason"
                rows="4"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Please provide a reason for rejection..."
              ></textarea>
            </div>
            
            <div className="mt-5 flex justify-end space-x-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={rejectingTimesheet ? handleRejectTimesheet : handleRejectTimeOff}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetAdmin; 