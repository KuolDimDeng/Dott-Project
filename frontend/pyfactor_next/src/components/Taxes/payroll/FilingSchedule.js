'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BellIcon,
  PlusIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { CenteredSpinner } from '@components/ui/StandardSpinner';
import { format, parseISO, differenceInDays, addMonths } from 'date-fns';
import dynamic from 'next/dynamic';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });
const dayGridPlugin = dynamic(() => import('@fullcalendar/daygrid'), { ssr: false });
const listPlugin = dynamic(() => import('@fullcalendar/list'), { ssr: false });

const FilingSchedule = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedFormType, setSelectedFormType] = useState('all');
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [view, setView] = useState('table'); // 'table' or 'calendar'

  // Calendar events
  const [calendarEvents, setCalendarEvents] = useState([]);

  useEffect(() => {
    fetchSchedules();
  }, [selectedYear, selectedFormType]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      let url = '/api/taxes/payroll/filing-schedule/';
      const params = new URLSearchParams();
      
      params.append('year', selectedYear);
      if (selectedFormType !== 'all') {
        params.append('form_type', selectedFormType);
      }
      
      url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch schedules');
      
      const data = await response.json();
      const schedulesData = data.results || data;
      setSchedules(schedulesData);
      
      // Convert to calendar events
      const events = schedulesData.map(schedule => ({
        id: schedule.id,
        title: schedule.form_type_display,
        start: schedule.filing_deadline,
        color: getEventColor(schedule.status),
        extendedProps: {
          schedule: schedule
        }
      }));
      setCalendarEvents(events);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeYear = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/taxes/payroll/filing-schedule/initialize_year/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ year: selectedYear })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize year');
      }
      
      const result = await response.json();
      setShowInitDialog(false);
      fetchSchedules();
      
      if (result.created > 0) {
        // Show success message
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClasses = (status) => {
    const statusClasses = {
      upcoming: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      filed: 'bg-green-100 text-green-800',
      late: 'bg-red-100 text-red-800',
      extended: 'bg-blue-100 text-blue-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  };

  const getEventColor = (status) => {
    const eventColors = {
      upcoming: '#2196f3',
      in_progress: '#ff9800',
      filed: '#4caf50',
      late: '#f44336',
      extended: '#9c27b0'
    };
    return eventColors[status] || '#757575';
  };

  const getDaysUntilDue = (deadline) => {
    return differenceInDays(parseISO(deadline), new Date());
  };

  const getUrgencyIcon = (daysUntil) => {
    if (daysUntil < 0) return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
    if (daysUntil <= 7) return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    if (daysUntil <= 30) return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
  };

  const renderScheduleSummary = () => {
    const upcoming = schedules.filter(s => s.status === 'upcoming').length;
    const inProgress = schedules.filter(s => s.status === 'in_progress').length;
    const filed = schedules.filter(s => s.status === 'filed').length;
    const late = schedules.filter(s => s.status === 'late').length;

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 truncate">
                  Upcoming
                </p>
                <p className="mt-1 text-3xl font-semibold text-gray-900">
                  {upcoming}
                </p>
              </div>
              <CalendarIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 truncate">
                  In Progress
                </p>
                <p className="mt-1 text-3xl font-semibold text-gray-900">
                  {inProgress}
                </p>
              </div>
              <ClockIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 truncate">
                  Filed
                </p>
                <p className="mt-1 text-3xl font-semibold text-gray-900">
                  {filed}
                </p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 truncate">
                  Late
                </p>
                <p className="mt-1 text-3xl font-semibold text-gray-900">
                  {late}
                </p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTableView = () => (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Form Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Period
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Filing Deadline
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Days Until Due
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Filed Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Confirmation
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {schedules.map((schedule) => {
            const daysUntil = getDaysUntilDue(schedule.filing_deadline);
            const quarterStr = schedule.quarter ? `Q${schedule.quarter}` : 'Annual';
            
            return (
              <tr key={schedule.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{schedule.form_type_display}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {quarterStr} {schedule.year}
                  {schedule.state_code && ` (${schedule.state_code})`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(parseISO(schedule.filing_deadline), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getUrgencyIcon(daysUntil)}
                    {schedule.status !== 'filed' && (
                      <span className="ml-2 text-sm text-gray-900">
                        {daysUntil < 0 ? `${Math.abs(daysUntil)} days late` : `${daysUntil} days`}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(schedule.status)}`}>
                    {schedule.status_display}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {schedule.filed_date ? format(parseISO(schedule.filed_date), 'MM/dd/yyyy') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {schedule.confirmation_number || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {schedule.status === 'upcoming' && (
                    <button className="text-gray-400 hover:text-gray-500 group relative">
                      <BellIcon className="h-5 w-5" />
                      <span className="absolute z-10 -top-8 right-0 text-xs bg-gray-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Set Reminder
                      </span>
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {schedules.length === 0 && (
            <tr>
              <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                No filing schedules found for {selectedYear}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderCalendarView = () => (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg p-4">
      <FullCalendar
        plugins={[dayGridPlugin, listPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,listMonth'
        }}
        events={calendarEvents}
        eventClick={(info) => {
          const schedule = info.event.extendedProps.schedule;
          // Handle event click
        }}
        height="600px"
      />
    </div>
  );

  const renderUpcomingDeadlines = () => {
    const upcomingDeadlines = schedules
      .filter(s => s.status !== 'filed' && getDaysUntilDue(s.filing_deadline) >= 0)
      .sort((a, b) => new Date(a.filing_deadline) - new Date(b.filing_deadline))
      .slice(0, 5);

    if (upcomingDeadlines.length === 0) return null;

    return (
      <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Upcoming Deadlines
          </h3>
          <ul className="divide-y divide-gray-200">
            {upcomingDeadlines.map((schedule) => {
              const daysUntil = getDaysUntilDue(schedule.filing_deadline);
              
              return (
                <li key={schedule.id} className="py-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {getUrgencyIcon(daysUntil)}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {schedule.form_type_display}
                      </p>
                      <p className="text-sm text-gray-500">
                        Due: {format(parseISO(schedule.filing_deadline), 'MMMM d, yyyy')} ({daysUntil} days)
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">
          Tax Filing Schedule
        </h1>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-md ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
            onClick={() => setView('table')}
          >
            Table View
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-md ${view === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
            onClick={() => setView('calendar')}
          >
            Calendar View
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <span className="text-red-500">×</span>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {[...Array(5)].map((_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Form Type
              </label>
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={selectedFormType}
                onChange={(e) => setSelectedFormType(e.target.value)}
              >
                <option value="all">All Forms</option>
                <option value="941">Form 941</option>
                <option value="940">Form 940</option>
                <option value="W2">Form W-2</option>
                <option value="1099">Form 1099</option>
                <option value="STATE_QUARTERLY">State Quarterly</option>
                <option value="STATE_ANNUAL">State Annual</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => setShowInitDialog(true)}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Initialize Year
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {renderScheduleSummary()}

      {/* Upcoming Deadlines */}
      {renderUpcomingDeadlines()}

      {/* Main Content */}
      {loading ? (
        <CenteredSpinner />
      ) : (
        view === 'table' ? renderTableView() : renderCalendarView()
      )}

      {/* Initialize Year Dialog */}
      {showInitDialog && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Initialize Filing Schedule
                </h3>
                <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
                  This will create all standard tax filing deadlines for {selectedYear}
                </div>
                <p className="text-sm text-gray-700 mb-2">
                  The following forms will be scheduled:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>Form 941 - Quarterly (4 filings)</li>
                  <li>Form 940 - Annual FUTA</li>
                  <li>Form W-2 - Annual</li>
                </ul>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-300"
                  onClick={initializeYear}
                  disabled={loading}
                >
                  Initialize {selectedYear}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowInitDialog(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilingSchedule;