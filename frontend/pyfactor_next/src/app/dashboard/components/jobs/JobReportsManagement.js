'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Autocomplete
} from '@mui/material';
import {
  Download,
  Print,
  Email,
  CalendarToday,
  Assessment,
  TrendingUp,
  AttachMoney,
  Schedule,
  Build,
  People,
  LocationOn,
  FilterList,
  Search,
  PictureAsPdf,
  TableChart,
  ShowChart
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import jobsApi from '@/app/utils/api/jobsApi';
import { logger } from '@/utils/logger';

const JobReportsManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    status: 'all',
    customer: null,
    employee: null,
    location: '',
    minAmount: '',
    maxAmount: ''
  });
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Report types based on industry standards
  const reportTypes = [
    {
      id: 'summary',
      label: 'Summary Report',
      icon: <Assessment />,
      description: 'Overview of all jobs with key metrics'
    },
    {
      id: 'profitability',
      label: 'Profitability Analysis',
      icon: <TrendingUp />,
      description: 'Detailed profit margins and cost analysis'
    },
    {
      id: 'customer',
      label: 'Customer Report',
      icon: <People />,
      description: 'Jobs by customer with revenue analysis'
    },
    {
      id: 'employee',
      label: 'Employee Performance',
      icon: <Build />,
      description: 'Employee productivity and job assignments'
    },
    {
      id: 'status',
      label: 'Status Report',
      icon: <Schedule />,
      description: 'Jobs grouped by current status'
    },
    {
      id: 'financial',
      label: 'Financial Report',
      icon: <AttachMoney />,
      description: 'Revenue, costs, and payment tracking'
    },
    {
      id: 'timesheet',
      label: 'Time & Labor Report',
      icon: <Schedule />,
      description: 'Labor hours and costs by job'
    },
    {
      id: 'materials',
      label: 'Materials Usage',
      icon: <TableChart />,
      description: 'Materials consumption and costs'
    }
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [customersRes, employeesRes] = await Promise.all([
        jobsApi.getCustomers(),
        jobsApi.getEmployees()
      ]);
      setCustomers(customersRes.data || []);
      setEmployees(employeesRes.data || []);
    } catch (error) {
      logger.error('Error fetching initial data:', error);
    }
  };

  const handleGenerateReport = async (reportType) => {
    setLoading(true);
    try {
      // Format dates for API
      const params = {
        start_date: filters.startDate.toISOString().split('T')[0],
        end_date: filters.endDate.toISOString().split('T')[0],
        report_type: reportType
      };

      // Add optional filters
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.customer) params.customer_id = filters.customer.id;
      if (filters.employee) params.employee_id = filters.employee.id;
      if (filters.location) params.location = filters.location;
      if (filters.minAmount) params.min_amount = filters.minAmount;
      if (filters.maxAmount) params.max_amount = filters.maxAmount;

      // Fetch report data based on type
      let response;
      switch (reportType) {
        case 'profitability':
          response = await jobsApi.getProfitability(params);
          break;
        case 'summary':
        case 'customer':
        case 'employee':
        case 'status':
        case 'financial':
        case 'timesheet':
        case 'materials':
          response = await jobsApi.getJobs(params);
          break;
        default:
          response = await jobsApi.getStats(params);
      }

      setReportData({
        type: reportType,
        data: response.data,
        generated: new Date(),
        filters: { ...filters }
      });
    } catch (error) {
      logger.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = (format) => {
    if (!reportData) return;

    switch (format) {
      case 'pdf':
        // Generate PDF report
        generatePDFReport();
        break;
      case 'excel':
        // Generate Excel report
        generateExcelReport();
        break;
      case 'csv':
        // Generate CSV report
        generateCSVReport();
        break;
      default:
        break;
    }
  };

  const generatePDFReport = async () => {
    // In production, you would use a library like jsPDF or react-pdf
    alert('PDF export would be generated here');
  };

  const generateExcelReport = () => {
    // In production, you would use a library like xlsx
    alert('Excel export would be generated here');
  };

  const generateCSVReport = () => {
    if (!reportData || !reportData.data) return;

    // Convert data to CSV
    const headers = Object.keys(reportData.data[0] || {}).join(',');
    const rows = reportData.data.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-report-${reportData.type}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const renderReportContent = () => {
    if (!reportData) {
      return (
        <Alert severity="info">
          Select a report type and click generate to view report data
        </Alert>
      );
    }

    const { type, data } = reportData;

    // Render different report layouts based on type
    switch (type) {
      case 'summary':
        return <SummaryReport data={data} />;
      case 'profitability':
        return <ProfitabilityReport data={data} />;
      case 'customer':
        return <CustomerReport data={data} />;
      case 'employee':
        return <EmployeeReport data={data} />;
      case 'financial':
        return <FinancialReport data={data} />;
      default:
        return <DefaultReport data={data} />;
    }
  };

  // Report Components
  const SummaryReport = ({ data }) => (
    <Box>
      <Typography variant="h6" gutterBottom>Job Summary Report</Typography>
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Total Jobs</Typography>
              <Typography variant="h4">{data.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Total Revenue</Typography>
              <Typography variant="h4">
                {formatCurrency(data.reduce((sum, job) => sum + (job.final_amount || job.quoted_amount || 0), 0))}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Completed</Typography>
              <Typography variant="h4">
                {data.filter(job => ['completed', 'paid', 'closed'].includes(job.status)).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Active</Typography>
              <Typography variant="h4">
                {data.filter(job => ['in_progress', 'scheduled'].includes(job.status)).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Job #</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>Completion</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((job) => (
              <TableRow key={job.id}>
                <TableCell>{job.job_number}</TableCell>
                <TableCell>{job.customer_name}</TableCell>
                <TableCell>
                  <Chip label={job.status} size="small" />
                </TableCell>
                <TableCell>{job.start_date ? new Date(job.start_date).toLocaleDateString() : '-'}</TableCell>
                <TableCell>{job.completion_date ? new Date(job.completion_date).toLocaleDateString() : '-'}</TableCell>
                <TableCell align="right">{formatCurrency(job.final_amount || job.quoted_amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const ProfitabilityReport = ({ data }) => (
    <Box>
      <Typography variant="h6" gutterBottom>Profitability Analysis</Typography>
      {/* Implementation would include profit margins, costs breakdown, etc. */}
      <Alert severity="info">Profitability report implementation</Alert>
    </Box>
  );

  const CustomerReport = ({ data }) => {
    // Group jobs by customer
    const customerGroups = data.reduce((acc, job) => {
      const customerId = job.customer?.id || job.customer || 'unknown';
      if (!acc[customerId]) {
        acc[customerId] = {
          name: job.customer_name,
          jobs: [],
          totalRevenue: 0,
          jobCount: 0
        };
      }
      acc[customerId].jobs.push(job);
      acc[customerId].totalRevenue += job.final_amount || job.quoted_amount || 0;
      acc[customerId].jobCount++;
      return acc;
    }, {});

    return (
      <Box>
        <Typography variant="h6" gutterBottom>Customer Report</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell align="center">Total Jobs</TableCell>
                <TableCell align="center">Completed</TableCell>
                <TableCell align="center">Active</TableCell>
                <TableCell align="right">Total Revenue</TableCell>
                <TableCell align="right">Avg Job Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(customerGroups).map(([customerId, group]) => (
                <TableRow key={customerId}>
                  <TableCell>{group.name}</TableCell>
                  <TableCell align="center">{group.jobCount}</TableCell>
                  <TableCell align="center">
                    {group.jobs.filter(j => ['completed', 'paid'].includes(j.status)).length}
                  </TableCell>
                  <TableCell align="center">
                    {group.jobs.filter(j => ['in_progress', 'scheduled'].includes(j.status)).length}
                  </TableCell>
                  <TableCell align="right">{formatCurrency(group.totalRevenue)}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(group.totalRevenue / group.jobCount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const EmployeeReport = ({ data }) => (
    <Box>
      <Typography variant="h6" gutterBottom>Employee Performance Report</Typography>
      <Alert severity="info">Employee report implementation</Alert>
    </Box>
  );

  const FinancialReport = ({ data }) => (
    <Box>
      <Typography variant="h6" gutterBottom>Financial Report</Typography>
      <Alert severity="info">Financial report implementation</Alert>
    </Box>
  );

  const DefaultReport = ({ data }) => (
    <Box>
      <Alert severity="info">Report data available: {data.length} records</Alert>
    </Box>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* Header */}
        <Typography variant="h4" gutterBottom>
          Job Reports
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Generate comprehensive reports for job analysis, profitability tracking, and performance metrics
        </Typography>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Report Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Start Date"
                  value={filters.startDate}
                  onChange={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="End Date"
                  value={filters.endDate}
                  onChange={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    label="Status"
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="quote">Quote</MenuItem>
                    <MenuItem value="scheduled">Scheduled</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="invoiced">Invoiced</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <Autocomplete
                  options={customers}
                  getOptionLabel={(option) => option.name || ''}
                  value={filters.customer}
                  onChange={(e, value) => setFilters(prev => ({ ...prev, customer: value }))}
                  renderInput={(params) => (
                    <TextField {...params} label="Customer" size="small" fullWidth />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Autocomplete
                  options={employees}
                  getOptionLabel={(option) => option.name || ''}
                  value={filters.employee}
                  onChange={(e, value) => setFilters(prev => ({ ...prev, employee: value }))}
                  renderInput={(params) => (
                    <TextField {...params} label="Employee" size="small" fullWidth />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Min Amount"
                  type="number"
                  size="small"
                  fullWidth
                  value={filters.minAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                  InputProps={{ startAdornment: '$' }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Max Amount"
                  type="number"
                  size="small"
                  fullWidth
                  value={filters.maxAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                  InputProps={{ startAdornment: '$' }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Location"
                  size="small"
                  fullWidth
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="City or ZIP"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Report Types */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Select Report Type
            </Typography>
            <Grid container spacing={2}>
              {reportTypes.map((report) => (
                <Grid item xs={12} sm={6} md={3} key={report.id}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => handleGenerateReport(report.id)}
                  >
                    <CardContent>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ color: 'primary.main' }}>
                          {report.icon}
                        </Box>
                        <Box>
                          <Typography variant="subtitle2">
                            {report.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {report.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Report Display */}
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : reportData ? (
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h6">
                    {reportTypes.find(r => r.id === reportData.type)?.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Generated on {reportData.generated.toLocaleString()}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Export as PDF">
                    <IconButton onClick={() => handleExportReport('pdf')}>
                      <PictureAsPdf />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Export as Excel">
                    <IconButton onClick={() => handleExportReport('excel')}>
                      <TableChart />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Export as CSV">
                    <IconButton onClick={() => handleExportReport('csv')}>
                      <Download />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Print Report">
                    <IconButton onClick={() => window.print()}>
                      <Print />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Email Report">
                    <IconButton>
                      <Email />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              {renderReportContent()}
            </CardContent>
          </Card>
        ) : null}
      </Box>
    </LocalizationProvider>
  );
};

export default JobReportsManagement;