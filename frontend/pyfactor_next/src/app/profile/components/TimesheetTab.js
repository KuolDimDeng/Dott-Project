'use client';

import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Calendar, DollarSign, User, CheckCircle, XCircle, Clock3, FolderOpen, Briefcase } from 'lucide-react';
import StandardSpinner from '@/components/ui/StandardSpinner';
import toast from 'react-hot-toast';

const TimesheetTab = ({ employee, session }) => {
  const [loading, setLoading] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(employee);
  const [currentTimesheet, setCurrentTimesheet] = useState(null);
  const [timesheetEntries, setTimesheetEntries] = useState({});
  const [supervisor, setSupervisor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    if (!employee && session?.tenantId && session?.user?.email) {
      // If no employee prop, fetch current user's employee record
      fetchCurrentUserEmployee();
    } else if (employee && session?.tenantId) {
      fetchCurrentTimesheet();
      fetchSupervisor();
    }
  }, [employee, session]);

  const fetchCurrentUserEmployee = async () => {
    console.log('🎯 [TimesheetTab] Fetching current user employee record');
    setLoading(true);
    try {
      // First, get all employees and find the one matching current user's email
      const response = await fetch('/api/hr/v2/employees', {
        headers: {
          'X-Tenant-ID': session.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userEmployee = data.data?.find(emp => 
          emp.email === session.user.email || 
          emp.linked_user_account === session.user.id
        );
        
        if (userEmployee) {
          console.log('🎯 [TimesheetTab] Found employee record:', userEmployee);
          setCurrentEmployee(userEmployee);
          // Now fetch timesheet data for this employee
          fetchCurrentTimesheet(userEmployee.id);
          if (userEmployee.supervisor) {
            fetchSupervisor(userEmployee.supervisor);
          }
        } else {
          console.log('🎯 [TimesheetTab] No employee record found for user:', session.user.email);
        }
      }
    } catch (error) {
      console.error('Error fetching current user employee:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentTimesheet = async (employeeId = null) => {
    const empId = employeeId || currentEmployee?.id;
    if (!empId) {
      console.log('🎯 [TimesheetTab] No employee ID available');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/hr/timesheets?employee_id=${empId}&period_start=${format(weekStart, 'yyyy-MM-dd')}`,
        {
          headers: {
            'X-Tenant-ID': session.tenantId,
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
      toast.error('Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimesheetEntries = async (timesheetId) => {
    try {
      const response = await fetch(`/api/hr/timesheet-entries?timesheet_id=${timesheetId}`, {
        headers: {
          'X-Tenant-ID': session.tenantId,
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

  const fetchSupervisor = async (supervisorId = null) => {
    const supId = supervisorId || currentEmployee?.supervisor;
    if (!supId) return;

    try {
      const response = await fetch(`/api/hr/employees/${supId}/`, {
        headers: {
          'X-Tenant-ID': session.tenantId,
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

  const handleProjectChange = (date, projectId) => {
    setTimesheetEntries(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        date,
        project: projectId,
        task: '', // Reset task when project changes
      },
    }));
  };

  const handleTaskChange = (date, taskId) => {
    setTimesheetEntries(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        date,
        task: taskId,
      },
    }));
  };

  const handleDescriptionChange = (date, description) => {
    setTimesheetEntries(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        date,
        description: description,
      },
    }));
  };

  // Auto-fill standard workdays for salaried employees
  const autoFillStandardHours = () => {
    if (!isSalariedEmployee) return;
    
    const newEntries = {};
    weekDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      
      if (!isWeekend) {
        newEntries[dateStr] = {
          ...timesheetEntries[dateStr],
          date: dateStr,
          regular_hours: '8.00',
          overtime_hours: '0.00',
          sick_hours: '0.00',
          vacation_hours: '0.00',
          holiday_hours: '0.00',
          unpaid_hours: '0.00',
          project: timesheetEntries[dateStr]?.project || 'general',
          task: timesheetEntries[dateStr]?.task || 'admin',
          description: timesheetEntries[dateStr]?.description || 'Standard workday',
        };
      }
    });
    
    if (Object.keys(newEntries).length > 0) {
      setTimesheetEntries(prev => ({ ...prev, ...newEntries }));
      toast.success('Timesheet auto-populated with standard hours');
    }
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
            'X-Tenant-ID': session.tenantId,
          },
          body: JSON.stringify({
            employee: currentEmployee.id,
            business_id: session.tenantId,
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
              'X-Tenant-ID': session.tenantId,
            },
            body: JSON.stringify({
              timesheet: timesheetId,
              date,
              regular_hours: parseFloat(entry.regular_hours) || 0,
              overtime_hours: parseFloat(entry.overtime_hours) || 0,
              sick_hours: parseFloat(entry.sick_hours) || 0,
              vacation_hours: parseFloat(entry.vacation_hours) || 0,
              holiday_hours: parseFloat(entry.holiday_hours) || 0,
              unpaid_hours: parseFloat(entry.unpaid_hours) || 0,
              project: entry.project || 'general',
              task: entry.task || 'admin',
              description: entry.description || ''
            }),
          });
        }
      }

      toast.success('Timesheet saved successfully');
    } catch (error) {
      console.error('Error saving timesheet:', error);
      toast.error('Failed to save timesheet');
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
          'X-Tenant-ID': session.tenantId,
        },
        body: JSON.stringify({
          status: 'SUBMITTED',
          submitted_at: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast.success('Timesheet submitted for approval');
        fetchCurrentTimesheet();
      }
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      toast.error('Failed to submit timesheet');
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

  if (!currentEmployee) {
    const userRole = session?.user?.role;
    const isOwnerOrAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timesheet Access</CardTitle>
          <CardDescription>
            {isOwnerOrAdmin 
              ? "Owner and Admin accounts typically don't track timesheets directly"
              : "No employee record found for your account"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOwnerOrAdmin ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                As an {userRole.toLowerCase()}, you can:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>View all employee timesheets from the HR → Timesheets page</li>
                <li>Approve or reject pending timesheet submissions</li>
                <li>Create an employee record for yourself if you also work as an employee</li>
                <li>Manage timesheet settings and workflows</li>
              </ul>
              <div className="pt-3">
                <Button 
                  onClick={() => window.location.href = '/dashboard/hr/employees'}
                  className="mr-3"
                >
                  Manage Employees
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard/timesheets'}
                >
                  View All Timesheets
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Your user account is not linked to an employee record. Contact your administrator to:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Create an employee record for you</li>
                <li>Link your user account to an existing employee record</li>
                <li>Verify your account permissions</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Industry standard: All employees track hours for compliance, project billing, and overtime
  const isSalariedEmployee = currentEmployee.compensation_type === 'SALARY';
  const defaultHours = isSalariedEmployee ? 8 : 0; // Default 8 hours for salaried employees
  
  // Calculate hourly rate for salaried employees
  const hourlyRate = isSalariedEmployee 
    ? (parseFloat(currentEmployee.salary) / 2080).toFixed(2) 
    : parseFloat(currentEmployee.wage_per_hour) || 0;

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
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Time Entry</CardTitle>
              <CardDescription>
                {isSalariedEmployee 
                  ? 'Track your hours by project for billing, compliance, and overtime calculations'
                  : 'Enter your hours worked for each day with project details for accurate billing'
                }
              </CardDescription>
            </div>
            {isSalariedEmployee && (
              <Button
                variant="outline"
                size="sm"
                onClick={autoFillStandardHours}
                disabled={currentTimesheet?.status === 'APPROVED'}
              >
                Auto-fill 8hrs/day
              </Button>
            )}
          </div>
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
                  className={`p-4 rounded-lg border ${
                    isWeekend ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100'
                  } ${isDisabled ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium">{format(day, 'EEEE')}</p>
                      <p className="text-sm text-gray-500">{format(day, 'MMM d, yyyy')}</p>
                    </div>
                    {isWeekend && (
                      <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                        Weekend
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    <div>
                      <Label>Project</Label>
                      <Select
                        value={entry.project || 'general'}
                        onValueChange={(value) => handleProjectChange(dateStr, value)}
                        disabled={isDisabled}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General/Admin</SelectItem>
                          <SelectItem value="client-a">Client A</SelectItem>
                          <SelectItem value="client-b">Client B</SelectItem>
                          <SelectItem value="development">Development</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="operations">Operations</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Task</Label>
                      <Select
                        value={entry.task || 'admin'}
                        onValueChange={(value) => handleTaskChange(dateStr, value)}
                        disabled={isDisabled}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select task" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrative</SelectItem>
                          <SelectItem value="meetings">Meetings</SelectItem>
                          <SelectItem value="development">Development</SelectItem>
                          <SelectItem value="testing">Testing</SelectItem>
                          <SelectItem value="documentation">Documentation</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="training">Training</SelectItem>
                          <SelectItem value="research">Research</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {entry.regular_hours && parseFloat(entry.regular_hours) > 0 && (
                    <div className="mt-3">
                      <Label>Notes/Description (Optional)</Label>
                      <Input
                        type="text"
                        value={entry.description || ''}
                        onChange={(e) => handleDescriptionChange(dateStr, e.target.value)}
                        disabled={isDisabled}
                        placeholder="Brief description of work performed..."
                        className="mt-1"
                      />
                    </div>
                  )}
                  <div className="text-right mt-2">
                    <p className="text-sm text-gray-500">Pay</p>
                    <p className="font-medium">
                      ${((parseFloat(entry.regular_hours) || 0) * hourlyRate).toFixed(2)}
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

export default TimesheetTab;// Trigger deployment for timesheet system
