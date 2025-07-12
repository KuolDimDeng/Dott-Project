'use client';

import React, { useState, useEffect } from 'react';
import { useSessionContext } from '@/providers/SessionProvider';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/useToast';
import { Clock, Calendar, DollarSign, User, CheckCircle, XCircle, Clock3 } from 'lucide-react';
import StandardSpinner from '@/components/StandardSpinner';

const TimesheetTab = () => {
  const { employee, tenantId } = useSessionContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentTimesheet, setCurrentTimesheet] = useState(null);
  const [timesheetEntries, setTimesheetEntries] = useState({});
  const [supervisor, setSupervisor] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    if (employee) {
      fetchCurrentTimesheet();
      fetchSupervisor();
    }
  }, [employee]);

  const fetchCurrentTimesheet = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/hr/timesheets?employee_id=${employee.id}&period_start=${format(weekStart, 'yyyy-MM-dd')}`,
        {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setCurrentTimesheet(data.results[0]);
          fetchTimesheetEntries(data.results[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching timesheet:', error);
      toast({
        title: 'Error',
        description: 'Failed to load timesheet data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTimesheetEntries = async (timesheetId) => {
    try {
      const response = await fetch(`/api/hr/timesheet-entries?timesheet_id=${timesheetId}`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const entriesMap = {};
        data.results.forEach(entry => {
          entriesMap[entry.date] = entry;
        });
        setTimesheetEntries(entriesMap);
      }
    } catch (error) {
      console.error('Error fetching timesheet entries:', error);
    }
  };

  const fetchSupervisor = async () => {
    if (!employee?.supervisor) return;

    try {
      const response = await fetch(`/api/hr/employees/${employee.supervisor}/`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSupervisor(data);
      }
    } catch (error) {
      console.error('Error fetching supervisor:', error);
    }
  };

  const handleHoursChange = (date, hours) => {
    setTimesheetEntries(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        date,
        regular_hours: hours,
      },
    }));
  };

  const createOrUpdateTimesheet = async () => {
    setSubmitting(true);
    try {
      let timesheetId = currentTimesheet?.id;

      if (!timesheetId) {
        const createResponse = await fetch('/api/hr/timesheets/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId,
          },
          body: JSON.stringify({
            employee: employee.id,
            business_id: tenantId,
            period_start: format(weekStart, 'yyyy-MM-dd'),
            period_end: format(weekEnd, 'yyyy-MM-dd'),
            status: 'DRAFT',
          }),
        });

        if (!createResponse.ok) throw new Error('Failed to create timesheet');
        const newTimesheet = await createResponse.json();
        timesheetId = newTimesheet.id;
        setCurrentTimesheet(newTimesheet);
      }

      for (const [date, entry] of Object.entries(timesheetEntries)) {
        if (entry.regular_hours && parseFloat(entry.regular_hours) > 0) {
          const method = entry.id ? 'PATCH' : 'POST';
          const url = entry.id 
            ? `/api/hr/timesheet-entries/${entry.id}/`
            : '/api/hr/timesheet-entries/';

          await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'X-Tenant-ID': tenantId,
            },
            body: JSON.stringify({
              timesheet: timesheetId,
              date,
              regular_hours: parseFloat(entry.regular_hours),
            }),
          });
        }
      }

      toast({
        title: 'Success',
        description: 'Timesheet saved successfully',
      });
    } catch (error) {
      console.error('Error saving timesheet:', error);
      toast({
        title: 'Error',
        description: 'Failed to save timesheet',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitTimesheet = async () => {
    if (!currentTimesheet) {
      await createOrUpdateTimesheet();
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/hr/timesheets/${currentTimesheet.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({
          status: 'SUBMITTED',
          submitted_at: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Timesheet submitted for approval',
        });
        fetchCurrentTimesheet();
      }
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit timesheet',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotalHours = () => {
    return Object.values(timesheetEntries).reduce((total, entry) => {
      return total + (parseFloat(entry.regular_hours) || 0);
    }, 0);
  };

  const calculateTotalPay = () => {
    const totalHours = calculateTotalHours();
    const hourlyRate = parseFloat(employee?.wage_per_hour) || 0;
    return totalHours * hourlyRate;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'SUBMITTED':
        return <Clock3 className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-600 bg-green-50';
      case 'REJECTED':
        return 'text-red-600 bg-red-50';
      case 'SUBMITTED':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return <StandardSpinner size="medium" />;
  }

  if (!employee) {
    return (
      <Alert>
        <AlertDescription>
          No employee information found. Please contact your administrator.
        </AlertDescription>
      </Alert>
    );
  }

  if (employee.compensation_type !== 'WAGE') {
    return (
      <Alert>
        <AlertDescription>
          Timesheet is only available for hourly wage employees.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Weekly Timesheet</CardTitle>
              <CardDescription>
                Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </CardDescription>
            </div>
            {currentTimesheet && (
              <div className={`px-3 py-1 rounded-full flex items-center gap-2 ${getStatusColor(currentTimesheet.status)}`}>
                {getStatusIcon(currentTimesheet.status)}
                <span className="text-sm font-medium">
                  {currentTimesheet.status}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Supervisor</p>
                <p className="font-medium">
                  {supervisor ? `${supervisor.first_name} ${supervisor.last_name}` : 'Not assigned'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Total Hours</p>
                <p className="font-medium">{calculateTotalHours().toFixed(2)} hrs</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Total Pay</p>
                <p className="font-medium">${calculateTotalPay().toFixed(2)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Entry Card */}
      <Card>
        <CardHeader>
          <CardTitle>Time Entry</CardTitle>
          <CardDescription>
            Enter your hours worked for each day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weekDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const entry = timesheetEntries[dateStr] || {};
              const isDisabled = currentTimesheet?.status !== 'DRAFT' && currentTimesheet?.status !== 'REJECTED';

              return (
                <div
                  key={dateStr}
                  className={`grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 rounded-lg ${
                    isWeekend ? 'bg-gray-50' : 'bg-white'
                  } ${isDisabled ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium">{format(day, 'EEEE')}</p>
                      <p className="text-sm text-gray-500">{format(day, 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div>
                    <Label>Regular Hours</Label>
                    <Input
                      type="number"
                      min="0"
                      max="24"
                      step="0.25"
                      value={entry.regular_hours || ''}
                      onChange={(e) => handleHoursChange(dateStr, e.target.value)}
                      disabled={isDisabled}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Pay</p>
                    <p className="font-medium">
                      ${((parseFloat(entry.regular_hours) || 0) * (parseFloat(employee.wage_per_hour) || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={createOrUpdateTimesheet}
              disabled={submitting || currentTimesheet?.status === 'APPROVED'}
            >
              Save Draft
            </Button>
            <Button
              onClick={submitTimesheet}
              disabled={submitting || currentTimesheet?.status === 'APPROVED' || calculateTotalHours() === 0}
            >
              Submit for Approval
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Previous Timesheets */}
      <Card>
        <CardHeader>
          <CardTitle>Previous Timesheets</CardTitle>
          <CardDescription>
            Your timesheet history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Previous timesheets will appear here</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimesheetTab;