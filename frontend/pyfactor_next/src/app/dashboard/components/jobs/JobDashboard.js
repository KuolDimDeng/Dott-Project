'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Stack,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccessTime,
  AttachMoney,
  CheckCircle,
  Schedule,
  Build,
  LocalShipping,
  Warning,
  Assignment,
  CalendarToday,
  People,
  Refresh,
  ShowChart
} from '@mui/icons-material';
import jobsApi from '@/app/utils/api/jobsApi';
import { logger } from '@/utils/logger';

const JobDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('month'); // today, week, month, quarter, year
  const [dashboardData, setDashboardData] = useState({
    overview: {
      totalJobs: 0,
      activeJobs: 0,
      completedJobs: 0,
      quotedValue: 0,
      invoicedAmount: 0,
      collectedAmount: 0,
      avgJobValue: 0,
      avgCompletionTime: 0
    },
    statusBreakdown: {},
    performance: {
      completionRate: 0,
      onTimeRate: 0,
      customerSatisfaction: 0,
      profitMargin: 0
    },
    trends: {
      jobsThisMonth: 0,
      jobsLastMonth: 0,
      revenueThisMonth: 0,
      revenueLastMonth: 0
    },
    topMetrics: {
      topCustomers: [],
      topEmployees: [],
      mostProfitableJobs: [],
      upcomingJobs: []
    }
  });

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      // Fetch all necessary data
      const [statsResponse, jobsResponse] = await Promise.all([
        jobsApi.getStats({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        }),
        jobsApi.getJobs({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        })
      ]);

      const stats = statsResponse.data;
      const jobs = jobsResponse.data;

      // Process the data
      const activeJobs = jobs.filter(job => 
        ['quote', 'approved', 'scheduled', 'in_transit', 'in_progress', 'pending_review'].includes(job.status)
      );
      
      const completedJobs = jobs.filter(job => 
        ['completed', 'invoiced', 'paid', 'closed'].includes(job.status)
      );

      // Calculate metrics
      const totalQuotedValue = jobs.reduce((sum, job) => sum + (job.quoted_amount || 0), 0);
      const invoicedAmount = jobs
        .filter(job => ['invoiced', 'paid', 'closed'].includes(job.status))
        .reduce((sum, job) => sum + (job.final_amount || job.quoted_amount || 0), 0);
      
      const collectedAmount = jobs
        .filter(job => ['paid', 'closed'].includes(job.status))
        .reduce((sum, job) => sum + (job.final_amount || job.quoted_amount || 0), 0);

      // Calculate average completion time
      const completedWithDates = completedJobs.filter(job => job.completion_date && job.start_date);
      const avgCompletionTime = completedWithDates.length > 0 ?
        completedWithDates.reduce((sum, job) => {
          const start = new Date(job.start_date);
          const end = new Date(job.completion_date);
          return sum + (end - start) / (1000 * 60 * 60 * 24); // Days
        }, 0) / completedWithDates.length : 0;

      // Calculate on-time rate
      const jobsWithDeadline = completedJobs.filter(job => job.estimated_completion_date);
      const onTimeJobs = jobsWithDeadline.filter(job => {
        const actual = new Date(job.completion_date || job.updated_at);
        const estimated = new Date(job.estimated_completion_date);
        return actual <= estimated;
      });
      const onTimeRate = jobsWithDeadline.length > 0 ? 
        (onTimeJobs.length / jobsWithDeadline.length) * 100 : 0;

      // Get top customers
      const customerMap = {};
      jobs.forEach(job => {
        const customerId = job.customer?.id || job.customer;
        const customerName = job.customer?.name || job.customer_name;
        if (customerId) {
          if (!customerMap[customerId]) {
            customerMap[customerId] = {
              id: customerId,
              name: customerName,
              jobCount: 0,
              totalValue: 0
            };
          }
          customerMap[customerId].jobCount++;
          customerMap[customerId].totalValue += job.final_amount || job.quoted_amount || 0;
        }
      });
      
      const topCustomers = Object.values(customerMap)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5);

      // Get upcoming jobs
      const upcomingJobs = jobs
        .filter(job => job.status === 'scheduled' && job.scheduled_date)
        .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
        .slice(0, 5);

      // Calculate trends (compare with previous period)
      const prevEndDate = new Date(startDate);
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - (endDate - startDate) / (1000 * 60 * 60 * 24));
      
      // Update dashboard data
      setDashboardData({
        overview: {
          totalJobs: jobs.length,
          activeJobs: activeJobs.length,
          completedJobs: completedJobs.length,
          quotedValue: totalQuotedValue,
          invoicedAmount,
          collectedAmount,
          avgJobValue: jobs.length > 0 ? totalQuotedValue / jobs.length : 0,
          avgCompletionTime
        },
        statusBreakdown: stats.status_breakdown || {},
        performance: {
          completionRate: stats.completion_rate || 0,
          onTimeRate,
          customerSatisfaction: 95, // Placeholder - could be calculated from ratings
          profitMargin: 25 // Placeholder - could be calculated from profit data
        },
        trends: {
          jobsThisMonth: jobs.length,
          jobsLastMonth: 0, // Would need previous period data
          revenueThisMonth: collectedAmount,
          revenueLastMonth: 0 // Would need previous period data
        },
        topMetrics: {
          topCustomers,
          topEmployees: [], // Would need employee assignment data
          mostProfitableJobs: jobs
            .filter(job => job.profit_margin > 0)
            .sort((a, b) => b.profit_margin - a.profit_margin)
            .slice(0, 5),
          upcomingJobs
        }
      });
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      quote: 'info',
      approved: 'success',
      scheduled: 'primary',
      in_progress: 'warning',
      completed: 'success',
      invoiced: 'secondary',
      paid: 'success',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  const MetricCard = ({ title, value, subtitle, icon, trend, color = 'primary' }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="text.secondary" gutterBottom variant="caption">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ mb: 1 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: 2, 
            bgcolor: `${color}.lighter`,
            color: `${color}.main`
          }}>
            {icon}
          </Box>
        </Stack>
        {trend && (
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 2 }}>
            {trend > 0 ? (
              <TrendingUp color="success" fontSize="small" />
            ) : (
              <TrendingDown color="error" fontSize="small" />
            )}
            <Typography 
              variant="caption" 
              color={trend > 0 ? 'success.main' : 'error.main'}
            >
              {Math.abs(trend)}% from last period
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Jobs Dashboard</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              displayEmpty
            >
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="quarter">This Quarter</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <Refresh className={refreshing ? 'animate-spin' : ''} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Jobs"
            value={dashboardData.overview.totalJobs}
            subtitle={`${dashboardData.overview.activeJobs} active`}
            icon={<Assignment />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Quoted Value"
            value={formatCurrency(dashboardData.overview.quotedValue)}
            subtitle={`Avg ${formatCurrency(dashboardData.overview.avgJobValue)}`}
            icon={<AttachMoney />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Invoiced"
            value={formatCurrency(dashboardData.overview.invoicedAmount)}
            subtitle={`${formatCurrency(dashboardData.overview.collectedAmount)} collected`}
            icon={<CheckCircle />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Completion Time"
            value={`${Math.round(dashboardData.overview.avgCompletionTime)} days`}
            subtitle="Average duration"
            icon={<AccessTime />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Performance Indicators */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={6} md={3}>
                  <Stack alignItems="center">
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress
                        variant="determinate"
                        value={dashboardData.performance.completionRate}
                        size={80}
                        thickness={4}
                      />
                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="h6">
                          {Math.round(dashboardData.performance.completionRate)}%
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" sx={{ mt: 1 }}>
                      Completion Rate
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Stack alignItems="center">
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress
                        variant="determinate"
                        value={dashboardData.performance.onTimeRate}
                        size={80}
                        thickness={4}
                        color="success"
                      />
                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="h6">
                          {Math.round(dashboardData.performance.onTimeRate)}%
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" sx={{ mt: 1 }}>
                      On-Time Delivery
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Stack alignItems="center">
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress
                        variant="determinate"
                        value={dashboardData.performance.customerSatisfaction}
                        size={80}
                        thickness={4}
                        color="info"
                      />
                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="h6">
                          {dashboardData.performance.customerSatisfaction}%
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" sx={{ mt: 1 }}>
                      Satisfaction
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Stack alignItems="center">
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress
                        variant="determinate"
                        value={dashboardData.performance.profitMargin}
                        size={80}
                        thickness={4}
                        color="warning"
                      />
                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="h6">
                          {dashboardData.performance.profitMargin}%
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" sx={{ mt: 1 }}>
                      Profit Margin
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Job Status Breakdown
              </Typography>
              <Stack spacing={2}>
                {Object.entries(dashboardData.statusBreakdown).map(([status, count]) => (
                  <Box key={status}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="body2" textTransform="capitalize">
                        {status.replace('_', ' ')}
                      </Typography>
                      <Chip 
                        label={count} 
                        size="small" 
                        color={getStatusColor(status)}
                      />
                    </Stack>
                    <LinearProgress 
                      variant="determinate" 
                      value={(count / dashboardData.overview.totalJobs) * 100}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bottom Section */}
      <Grid container spacing={3}>
        {/* Top Customers */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Customers
              </Typography>
              <Stack spacing={2}>
                {dashboardData.topMetrics.topCustomers.map((customer, index) => (
                  <Stack 
                    key={customer.id} 
                    direction="row" 
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="h6" color="text.secondary">
                        {index + 1}
                      </Typography>
                      <Box>
                        <Typography variant="body2">
                          {customer.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {customer.jobCount} jobs
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(customer.totalValue)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Jobs */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming Jobs
              </Typography>
              <Stack spacing={2}>
                {dashboardData.topMetrics.upcomingJobs.map((job) => (
                  <Stack 
                    key={job.id} 
                    direction="row" 
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box>
                      <Typography variant="body2">
                        {job.job_number} - {job.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {job.customer_name}
                      </Typography>
                    </Box>
                    <Stack alignItems="flex-end">
                      <Typography variant="body2">
                        {new Date(job.scheduled_date).toLocaleDateString()}
                      </Typography>
                      <Chip 
                        label={job.status} 
                        size="small" 
                        color={getStatusColor(job.status)}
                      />
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Add missing import for CircularProgress
import { CircularProgress } from '@mui/material';

export default JobDashboard;