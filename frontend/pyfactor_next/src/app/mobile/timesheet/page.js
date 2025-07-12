'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession-v2';
import { useRouter } from 'next/navigation';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { 
  ClockIcon, 
  PlayIcon, 
  StopIcon, 
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

export default function MobileTimesheetPage() {
  const { session, loading } = useSession();
  const router = useRouter();
  const [currentTimesheet, setCurrentTimesheet] = useState(null);
  const [timesheetEntries, setTimesheetEntries] = useState({});
  const [loadingTimesheet, setLoadingTimesheet] = useState(false);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weekDays, setWeekDays] = useState([]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Generate week days
  useEffect(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
    const end = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    setWeekDays(days);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !session) {
      router.push('/auth/mobile-login');
    }
  }, [session, loading, router]);

  // Load timesheet data
  useEffect(() => {
    if (session?.employee?.id && session?.tenantId) {
      loadTimesheetData();
    }
  }, [session]);

  const loadTimesheetData = async () => {
    setLoadingTimesheet(true);
    try {
      // Get current timesheet
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      
      const response = await fetch(`/api/hr/timesheets/?employee=${session.employee.id}&week_start=${weekStart}`, {
        headers: {
          'X-Tenant-ID': session.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setCurrentTimesheet(data.results[0]);
          // Load entries for this timesheet
          await loadTimesheetEntries(data.results[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading timesheet:', error);
    } finally {
      setLoadingTimesheet(false);
    }
  };

  const loadTimesheetEntries = async (timesheetId) => {
    try {
      const response = await fetch(`/api/hr/timesheets/${timesheetId}/entries/`, {
        headers: {
          'X-Tenant-ID': session.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const entriesMap = {};
        data.results?.forEach(entry => {
          entriesMap[entry.date] = entry;
        });
        setTimesheetEntries(entriesMap);
      }
    } catch (error) {
      console.error('Error loading timesheet entries:', error);
    }
  };

  const handleClockInOut = async () => {
    if (!session?.employee?.id || !session?.tenantId) return;
    
    setIsClockingIn(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayEntry = timesheetEntries[today];
      
      if (!currentTimesheet) {
        // Create new timesheet for this week
        const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const createResponse = await fetch('/api/hr/timesheets/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': session.tenantId,
          },
          body: JSON.stringify({
            employee: session.employee.id,
            week_start: weekStart,
            status: 'DRAFT',
          }),
        });
        
        if (createResponse.ok) {
          const newTimesheet = await createResponse.json();
          setCurrentTimesheet(newTimesheet);
        }
      }

      // Clock in/out logic
      const currentHours = todayEntry?.regular_hours || 0;
      const isClockingOut = currentHours > 0;
      
      if (isClockingOut) {
        // Clock out - add more hours (simulate 8-hour work day for demo)
        const newHours = Math.min(currentHours + 0.5, 8); // Add 30 minutes, max 8 hours
        await updateTimesheetEntry(today, newHours);
      } else {
        // Clock in - start with 0.5 hours
        await updateTimesheetEntry(today, 0.5);
      }
      
      await loadTimesheetData();
    } catch (error) {
      console.error('Error clocking in/out:', error);
    } finally {
      setIsClockingIn(false);
    }
  };

  const updateTimesheetEntry = async (date, hours) => {
    const entry = timesheetEntries[date];
    const method = entry ? 'PUT' : 'POST';
    const url = entry ? 
      `/api/hr/timesheets/${currentTimesheet.id}/entries/${entry.id}/` : 
      `/api/hr/timesheets/${currentTimesheet.id}/entries/`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': session.tenantId,
      },
      body: JSON.stringify({
        timesheet: currentTimesheet.id,
        date,
        regular_hours: hours,
      }),
    });

    return response.ok;
  };

  const getTotalHoursThisWeek = () => {
    return Object.values(timesheetEntries).reduce((total, entry) => {
      return total + (entry.regular_hours || 0);
    }, 0);
  };

  const getTodayStatus = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayEntry = timesheetEntries[today];
    const hours = todayEntry?.regular_hours || 0;
    
    if (hours === 0) return { status: 'not_started', text: 'Not Clocked In', color: 'text-gray-500' };
    if (hours < 8) return { status: 'clocked_in', text: `Clocked In (${hours}h)`, color: 'text-green-600' };
    return { status: 'completed', text: `Completed (${hours}h)`, color: 'text-blue-600' };
  };

  if (loading || loadingTimesheet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to login
  }

  const todayStatus = getTodayStatus();
  const totalHours = getTotalHoursThisWeek();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900 ml-2">Timesheet</h1>
          </div>
        </div>
      </div>

      {/* Current Time Display */}
      <div className="px-4 py-6 bg-white mx-4 mt-4 rounded-xl shadow-sm">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-sm text-gray-500">
            {format(currentTime, 'EEEE, MMMM d, yyyy')}
          </div>
          <div className={`text-sm font-medium mt-2 ${todayStatus.color}`}>
            {todayStatus.text}
          </div>
        </div>
      </div>

      {/* Clock In/Out Button */}
      <div className="px-4 py-6">
        <button
          onClick={handleClockInOut}
          disabled={isClockingIn}
          className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center space-x-2 transition-colors ${
            todayStatus.status === 'not_started' || todayStatus.status === 'clocked_in'
              ? todayStatus.status === 'not_started'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isClockingIn ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          ) : (
            <>
              {todayStatus.status === 'not_started' ? (
                <PlayIcon className="w-6 h-6" />
              ) : (
                <StopIcon className="w-6 h-6" />
              )}
              <span>
                {todayStatus.status === 'not_started' ? 'Clock In' : 'Clock Out'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Weekly Summary */}
      <div className="px-4 pb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" />
            This Week
          </h3>
          
          <div className="space-y-3">
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const entry = timesheetEntries[dateStr];
              const hours = entry?.regular_hours || 0;
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              
              return (
                <div key={dateStr} className={`flex items-center justify-between py-2 px-3 rounded-lg ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-sm ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                      {format(day, 'MMM d')}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {hours}h
                    </span>
                    {hours > 0 && (
                      <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">Total Hours</span>
              <span className="font-bold text-lg text-blue-600">{totalHours}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-6">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push(`/${session.tenantId}/dashboard/timesheets`)}
            className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md transition-shadow"
          >
            <ClockIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">View All</div>
            <div className="text-xs text-gray-500">Timesheets</div>
          </button>
          
          <button
            onClick={() => router.push('/profile')}
            className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md transition-shadow"
          >
            <CalendarIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Profile</div>
            <div className="text-xs text-gray-500">Settings</div>
          </button>
        </div>
      </div>
    </div>
  );
}