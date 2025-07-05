'use client';


import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { format, startOfWeek, endOfWeek, addDays, isSameMonth, isToday } from 'date-fns';

const MyTimesheet = ({ userData }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [timesheets, setTimesheets] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  
  // Mock data for demo
  useEffect(() => {
    // Mock timesheets
    setTimesheets([
      {
        id: '1',
        periodStart: '2023-05-01',
        periodEnd: '2023-05-07',
        status: 'APPROVED',
        totalRegularHours: 40,
        totalOvertimeHours: 5,
        submittedAt: '2023-05-08',
      },
      {
        id: '2',
        periodStart: '2023-05-08',
        periodEnd: '2023-05-14',
        status: 'SUBMITTED',
        totalRegularHours: 40,
        totalOvertimeHours: 2,
        submittedAt: '2023-05-15',
      },
      {
        id: '3',
        periodStart: '2023-05-15',
        periodEnd: '2023-05-21',
        status: 'DRAFT',
        totalRegularHours: 24,
        totalOvertimeHours: 0,
      }
    ]);
    
    // Mock time off requests
    setTimeOffRequests([
      {
        id: '1',
        requestType: 'PTO',
        startDate: '2023-06-01',
        endDate: '2023-06-05',
        status: 'APPROVED',
        reason: 'Vacation',
        submittedAt: '2023-05-10',
      },
      {
        id: '2',
        requestType: 'SICK',
        startDate: '2023-05-03',
        endDate: '2023-05-03',
        status: 'APPROVED',
        reason: 'Doctor appointment',
        submittedAt: '2023-05-03',
      },
      {
        id: '3',
        requestType: 'PTO',
        startDate: '2023-07-15',
        endDate: '2023-07-20',
        status: 'PENDING',
        reason: 'Family reunion',
        submittedAt: '2023-05-20',
      }
    ]);
    
    // Mock holidays
    setHolidays([
      { id: '1', name: 'New Year\'s Day', date: '2023-01-01', paid: true },
      { id: '2', name: 'Memorial Day', date: '2023-05-29', paid: true },
      { id: '3', name: 'Independence Day', date: '2023-07-04', paid: true },
      { id: '4', name: 'Labor Day', date: '2023-09-04', paid: true },
      { id: '5', name: 'Thanksgiving Day', date: '2023-11-23', paid: true },
      { id: '6', name: 'Day after Thanksgiving', date: '2023-11-24', paid: true },
      { id: '7', name: 'Christmas Eve', date: '2023-12-24', paid: true },
      { id: '8', name: 'Christmas Day', date: '2023-12-25', paid: true },
    ]);
  }, []);
  
  // Form state for timesheet
  const [currentWeek, setCurrentWeek] = useState(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(endOfWeek(start, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      entries: Array(7).fill().map((_, index) => ({
        date: format(addDays(start, index), 'yyyy-MM-dd'),
        regularHours: 8,
        overtimeHours: 0,
        notes: '',
      })),
      notes: '',
    };
  });
  
  // Form state for time off requests
  const [timeOffForm, setTimeOffForm] = useState({
    requestType: 'PTO',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
  });
  
  // Handle timesheet entry changes
  const handleEntryChange = (index, field, value) => {
    const updatedEntries = [...currentWeek.entries];
    updatedEntries[index] = {
      ...updatedEntries[index],
      [field]: value,
    };
    setCurrentWeek({
      ...currentWeek,
      entries: updatedEntries,
    });
  };
  
  // Handle timesheet submission
  const handleTimesheetSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Calculate totals
    const totalRegularHours = currentWeek.entries.reduce(
      (sum, entry) => sum + Number(entry.regularHours || 0), 0
    );
    const totalOvertimeHours = currentWeek.entries.reduce(
      (sum, entry) => sum + Number(entry.overtimeHours || 0), 0
    );
    
    // In a real app, submit to API here
    console.log('Submitting timesheet:', {
      ...currentWeek,
      totalRegularHours,
      totalOvertimeHours,
    });
    
    // Mock submission
    setTimeout(() => {
      const newTimesheet = {
        id: String(timesheets.length + 1),
        periodStart: currentWeek.startDate,
        periodEnd: currentWeek.endDate,
        status: 'SUBMITTED',
        totalRegularHours,
        totalOvertimeHours,
        submittedAt: format(new Date(), 'yyyy-MM-dd'),
      };
      
      setTimesheets([...timesheets, newTimesheet]);
      setLoading(false);
      
      // Reset current week
      const start = startOfWeek(new Date(), { weekStartsOn: 1 });
      setCurrentWeek({
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(endOfWeek(start, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        entries: Array(7).fill().map((_, index) => ({
          date: format(addDays(start, index), 'yyyy-MM-dd'),
          regularHours: 8,
          overtimeHours: 0,
          notes: '',
        })),
        notes: '',
      });
      
      alert('Timesheet submitted successfully!');
    }, 1000);
  };
  
  // Handle time off request submission
  const handleTimeOffSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    
    // In a real app, submit to API here
    console.log('Submitting time off request:', timeOffForm);
    
    // Mock submission
    setTimeout(() => {
      const newRequest = {
        id: String(timeOffRequests.length + 1),
        ...timeOffForm,
        status: 'PENDING',
        submittedAt: format(new Date(), 'yyyy-MM-dd'),
      };
      
      setTimeOffRequests([...timeOffRequests, newRequest]);
      setLoading(false);
      
      // Reset form
      setTimeOffForm({
        requestType: 'PTO',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        reason: '',
      });
      
      alert('Time off request submitted successfully!');
    }, 1000);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy');
  };
  
  // Status badge component
  const StatusBadge = ({ status }) => {
    let bgColor = 'bg-gray-100 text-gray-800';
    
    if (status === 'APPROVED') {
      bgColor = 'bg-green-100 text-green-800';
    } else if (status === 'SUBMITTED' || status === 'PENDING') {
      bgColor = 'bg-blue-100 text-blue-800';
    } else if (status === 'REJECTED') {
      bgColor = 'bg-red-100 text-red-800';
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    );
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
            Submit Hours
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
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Calendar
          </Tab>
        </Tab.List>
        
        <Tab.Panels className="mt-4">
          {/* Submit Hours Tab */}
          <Tab.Panel>
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900">Submit Timesheet</h3>
                  <div className="mt-2 text-sm text-gray-500">
                    <p>Record your hours for the week of {formatDate(currentWeek.startDate)} to {formatDate(currentWeek.endDate)}</p>
                  </div>
                  
                  <form onSubmit={handleTimesheetSubmit} className="mt-5">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regular Hours</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime Hours</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentWeek.entries.map((entry, index) => {
                            const day = new Date(entry.date);
                            return (
                              <tr key={entry.date}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {format(day, 'EEEE')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {format(day, 'MMM dd, yyyy')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <input
                                    type="number"
                                    min="0"
                                    max="24"
                                    step="0.5"
                                    value={entry.regularHours}
                                    onChange={(e) => handleEntryChange(index, 'regularHours', e.target.value)}
                                    className="border border-gray-300 rounded-md p-2 w-20"
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <input
                                    type="number"
                                    min="0"
                                    max="24"
                                    step="0.5"
                                    value={entry.overtimeHours}
                                    onChange={(e) => handleEntryChange(index, 'overtimeHours', e.target.value)}
                                    className="border border-gray-300 rounded-md p-2 w-20"
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <input
                                    type="text"
                                    value={entry.notes}
                                    onChange={(e) => handleEntryChange(index, 'notes', e.target.value)}
                                    className="border border-gray-300 rounded-md p-2 w-full"
                                    placeholder="Optional notes"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-4">
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Additional Notes</label>
                      <textarea
                        id="notes"
                        rows="3"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        placeholder="Any additional information..."
                        value={currentWeek.notes}
                        onChange={(e) => setCurrentWeek({...currentWeek, notes: e.target.value})}
                      ></textarea>
                    </div>
                    
                    <div className="mt-5 flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {loading ? 'Submitting...' : 'Submit Timesheet'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900">Previous Timesheets</h3>
                  
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regular Hours</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime Hours</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {timesheets.length > 0 ? (
                          timesheets.map((timesheet) => (
                            <tr key={timesheet.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatDate(timesheet.periodStart)} - {formatDate(timesheet.periodEnd)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {timesheet.totalRegularHours}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {timesheet.totalOvertimeHours}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {timesheet.submittedAt ? formatDate(timesheet.submittedAt) : 'Not submitted'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={timesheet.status} />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                              No timesheets found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </Tab.Panel>
          
          {/* Time Off Requests Tab */}
          <Tab.Panel>
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900">Request Time Off</h3>
                  
                  <form onSubmit={handleTimeOffSubmit} className="mt-5 space-y-4">
                    <div>
                      <label htmlFor="request-type" className="block text-sm font-medium text-gray-700">Request Type</label>
                      <select
                        id="request-type"
                        value={timeOffForm.requestType}
                        onChange={(e) => setTimeOffForm({...timeOffForm, requestType: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      >
                        <option value="PTO">Paid Time Off (PTO)</option>
                        <option value="SICK">Sick Leave</option>
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">Start Date</label>
                        <input
                          type="date"
                          id="start-date"
                          value={timeOffForm.startDate}
                          onChange={(e) => setTimeOffForm({...timeOffForm, startDate: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">End Date</label>
                        <input
                          type="date"
                          id="end-date"
                          value={timeOffForm.endDate}
                          onChange={(e) => setTimeOffForm({...timeOffForm, endDate: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason</label>
                      <textarea
                        id="reason"
                        rows="3"
                        value={timeOffForm.reason}
                        onChange={(e) => setTimeOffForm({...timeOffForm, reason: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        placeholder="Please provide a reason for your request"
                        required
                      ></textarea>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {loading ? 'Submitting...' : 'Submit Request'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900">Your Time Off Requests</h3>
                  
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {timeOffRequests.length > 0 ? (
                          timeOffRequests.map((request) => (
                            <tr key={request.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {request.requestType === 'PTO' ? 'Paid Time Off' : 'Sick Leave'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(request.startDate)} {request.startDate !== request.endDate && `- ${formatDate(request.endDate)}`}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                {request.reason}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(request.submittedAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={request.status} />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                              No time off requests found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </Tab.Panel>
          
          {/* Calendar Tab */}
          <Tab.Panel>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900">Time Off Calendar - {format(currentDate, 'yyyy')}</h3>
                <p className="mt-2 text-sm text-gray-500">View your PTO, sick leave, and company holidays for the current year.</p>
                
                <div className="mt-4">
                  <div className="flex flex-wrap -mx-2 mb-4 text-sm">
                    <div className="px-2 py-1 flex items-center">
                      <span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                      <span>PTO</span>
                    </div>
                    <div className="px-2 py-1 flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                      <span>Sick Leave</span>
                    </div>
                    <div className="px-2 py-1 flex items-center">
                      <span className="w-3 h-3 bg-red-500 rounded-full mr-1"></span>
                      <span>Company Holidays</span>
                    </div>
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-lg font-semibold">
                      This will display a calendar with all time off events visually for the current year.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      In a real implementation, this would be a full calendar view showing all PTO, sick leave, and company holidays.
                    </p>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-700 mb-2">Company Holidays {format(currentDate, 'yyyy')}</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holiday</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {holidays.map((holiday) => (
                            <tr key={holiday.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {holiday.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(holiday.date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {holiday.paid ? 'Yes' : 'No'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default MyTimesheet; 