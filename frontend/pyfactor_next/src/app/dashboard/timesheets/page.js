'use client';

import React, { useState, useEffect } from 'react';
import { useSessionContext } from '@/providers/SessionProvider';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { Search, Calendar, CheckCircle, XCircle, Clock, Filter, FileText, Download, Settings } from 'lucide-react';
import StandardSpinner from '@/components/StandardSpinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const TimesheetsPage = () => {
  const { tenantId, user } = useSessionContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timesheets, setTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [timesheetEntries, setTimesheetEntries] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    employee: 'all',
    period: 'current',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTimesheets();
    fetchEmployees();
  }, [filters]);

  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      let url = '/api/hr/timesheets?';
      
      if (filters.status !== 'all') {
        url += `status=${filters.status}&`;
      }
      if (filters.employee !== 'all') {
        url += `employee_id=${filters.employee}&`;
      }

      const response = await fetch(url, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTimesheets(data.results || []);
      }
    } catch (error) {
      console.error('Error fetching timesheets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load timesheets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/hr/employees/', {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.results || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchTimesheetDetails = async (timesheetId) => {
    try {
      const response = await fetch(`/api/hr/timesheet-entries?timesheet_id=${timesheetId}`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTimesheetEntries(data.results || []);
      }
    } catch (error) {
      console.error('Error fetching timesheet entries:', error);
    }
  };

  const handleViewDetails = async (timesheet) => {
    setSelectedTimesheet(timesheet);
    await fetchTimesheetDetails(timesheet.id);
    setShowDetails(true);
  };

  const handleApprove = async (timesheetId) => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/hr/timesheets/${timesheetId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Timesheet approved successfully',
        });
        fetchTimesheets();
        setShowDetails(false);
      }
    } catch (error) {
      console.error('Error approving timesheet:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve timesheet',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (timesheetId, reason) => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/hr/timesheets/${timesheetId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({
          status: 'REJECTED',
          rejection_reason: reason,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Timesheet rejected',
        });
        fetchTimesheets();
        setShowDetails(false);
      }
    } catch (error) {
      console.error('Error rejecting timesheet:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject timesheet',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      DRAFT: { color: 'secondary', icon: <FileText className="h-3 w-3" /> },
      SUBMITTED: { color: 'warning', icon: <Clock className="h-3 w-3" /> },
      APPROVED: { color: 'success', icon: <CheckCircle className="h-3 w-3" /> },
      REJECTED: { color: 'destructive', icon: <XCircle className="h-3 w-3" /> },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;

    return (
      <Badge variant={config.color} className="flex items-center gap-1">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const calculateTotalHours = (entries) => {
    return entries.reduce((total, entry) => {
      return total + parseFloat(entry.regular_hours || 0) + parseFloat(entry.overtime_hours || 0);
    }, 0);
  };

  const calculateTotalPay = (timesheet, employee) => {
    if (!employee || !timesheet.entries) return 0;
    
    const totalHours = timesheet.entries.reduce((total, entry) => {
      const regular = parseFloat(entry.regular_hours || 0);
      const overtime = parseFloat(entry.overtime_hours || 0);
      return total + regular + (overtime * 1.5); // Overtime at 1.5x rate
    }, 0);

    return totalHours * (parseFloat(employee.wage_per_hour) || 0);
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Employee', 'Period', 'Status', 'Total Hours', 'Regular Hours', 'Overtime Hours', 'Total Pay'],
      ...timesheets.map(ts => {
        const employee = employees.find(e => e.id === ts.employee);
        const totalHours = ts.total_hours || 0;
        const totalPay = calculateTotalPay(ts, employee);
        return [
          employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown',
          `${format(parseISO(ts.period_start), 'MMM d')} - ${format(parseISO(ts.period_end), 'MMM d, yyyy')}`,
          ts.status,
          totalHours.toFixed(2),
          ts.regular_hours?.toFixed(2) || '0.00',
          ts.overtime_hours?.toFixed(2) || '0.00',
          `$${totalPay.toFixed(2)}`,
        ];
      }),
    ].map(row => row.join(',')).join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheets_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const filteredTimesheets = timesheets.filter(timesheet => {
    const employee = employees.find(e => e.id === timesheet.employee);
    const employeeName = employee?.get_full_name || '';
    return employeeName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <StandardSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Timesheet Management</h1>
          <p className="text-gray-500">Review and approve employee timesheets</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => window.location.href = '/dashboard/timesheets/settings'} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Approval</p>
                <p className="text-2xl font-bold">
                  {timesheets.filter(t => t.status === 'SUBMITTED').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold">
                  {timesheets.filter(t => t.status === 'APPROVED').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Hours</p>
                <p className="text-2xl font-bold">
                  {timesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0).toFixed(1)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Employees</p>
                <p className="text-2xl font-bold">
                  {employees.filter(e => e.compensation_type === 'WAGE').length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[250px]">
              <Label>Search Employee</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-[200px]">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="SUBMITTED">Pending Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[200px]">
              <Label>Employee</Label>
              <Select value={filters.employee} onValueChange={(value) => setFilters({ ...filters, employee: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees
                    .filter(e => e.compensation_type === 'WAGE')
                    .map(employee => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {`${employee.first_name} ${employee.last_name}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timesheets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Timesheets</CardTitle>
          <CardDescription>
            Click on a timesheet to view details and approve/reject
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Total Pay</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTimesheets.map(timesheet => {
                const employee = employees.find(e => e.id === timesheet.employee);
                return (
                  <TableRow key={timesheet.id}>
                    <TableCell className="font-medium">
                      {employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee'}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(timesheet.period_start), 'MMM d')} - 
                      {format(parseISO(timesheet.period_end), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{getStatusBadge(timesheet.status)}</TableCell>
                    <TableCell>{(timesheet.total_hours || 0).toFixed(2)} hrs</TableCell>
                    <TableCell>
                      ${calculateTotalPay(timesheet, employee).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {timesheet.submitted_at 
                        ? format(parseISO(timesheet.submitted_at), 'MMM d, h:mm a')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(timesheet)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Timesheet Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Timesheet Details</DialogTitle>
            <DialogDescription>
              Review timesheet entries and approve or reject
            </DialogDescription>
          </DialogHeader>
          
          {selectedTimesheet && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee</Label>
                  <p className="font-medium">
                    {employees.find(e => e.id === selectedTimesheet.employee) ? `${employees.find(e => e.id === selectedTimesheet.employee).first_name} ${employees.find(e => e.id === selectedTimesheet.employee).last_name}` : 'Unknown'}
                  </p>
                </div>
                <div>
                  <Label>Period</Label>
                  <p className="font-medium">
                    {format(parseISO(selectedTimesheet.period_start), 'MMM d')} - 
                    {format(parseISO(selectedTimesheet.period_end), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedTimesheet.status)}</div>
                </div>
                <div>
                  <Label>Total Hours</Label>
                  <p className="font-medium">
                    {calculateTotalHours(timesheetEntries).toFixed(2)} hours
                  </p>
                </div>
              </div>

              <div>
                <Label>Daily Breakdown</Label>
                <Table className="mt-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Regular Hours</TableHead>
                      <TableHead>Overtime Hours</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timesheetEntries.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(parseISO(entry.date), 'EEE, MMM d')}</TableCell>
                        <TableCell>{entry.regular_hours || 0}</TableCell>
                        <TableCell>{entry.overtime_hours || 0}</TableCell>
                        <TableCell className="font-medium">
                          {(parseFloat(entry.regular_hours || 0) + parseFloat(entry.overtime_hours || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedTimesheet.status === 'SUBMITTED' && (
                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleReject(selectedTimesheet.id, 'Please review and resubmit')}
                    disabled={processing}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedTimesheet.id)}
                    disabled={processing}
                  >
                    Approve Timesheet
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimesheetsPage;