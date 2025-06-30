import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Divider,
  Paper,
  Tab,
  Tabs
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
  Payment as PaymentIcon,
  AccountBalance as AccountIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Description as FormIcon,
  Notifications as NotificationIcon
} from '@mui/icons-material';
import { format, addDays, differenceInDays } from 'date-fns';
import { useRouter } from 'next/navigation';

// Import sub-components
import Form941Management from './Form941Management';
import TaxDepositManager from './TaxDepositManager';
import FilingSchedule from './FilingSchedule';
import EmployerAccount from './EmployerAccount';

const PayrollTaxDashboard = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchTaxSummary();
  }, []);

  const fetchTaxSummary = async () => {
    try {
      const response = await fetch('/api/taxes/payroll/employer-account/tax_summary/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch tax summary');
      
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getUrgencyColor = (daysUntilDue) => {
    if (daysUntilDue < 0) return 'error';
    if (daysUntilDue <= 7) return 'warning';
    if (daysUntilDue <= 30) return 'info';
    return 'default';
  };

  const renderSummaryCards = () => {
    if (!summary) return null;

    const cards = [
      {
        title: 'Current Quarter Wages',
        value: formatCurrency(summary.current_quarter_wages),
        icon: <MoneyIcon />,
        color: 'primary',
        subtitle: `Q${summary.current_quarter} ${summary.current_year}`
      },
      {
        title: 'Tax Liability',
        value: formatCurrency(summary.current_quarter_tax_liability),
        icon: <AssessmentIcon />,
        color: 'warning',
        subtitle: 'Current quarter'
      },
      {
        title: 'Deposits Made',
        value: formatCurrency(summary.current_quarter_deposits),
        icon: <PaymentIcon />,
        color: 'success',
        subtitle: 'Current quarter'
      },
      {
        title: 'Balance Due',
        value: formatCurrency(summary.current_quarter_balance),
        icon: <AccountIcon />,
        color: summary.current_quarter_balance > 0 ? 'error' : 'success',
        subtitle: summary.current_quarter_balance > 0 ? 'Payment needed' : 'All paid'
      }
    ];

    return (
      <Grid container spacing={3}>
        {cards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Box color={`${card.color}.main`}>{card.icon}</Box>
                  <Typography variant="h5" component="div">
                    {card.value}
                  </Typography>
                </Box>
                <Typography color="text.secondary" gutterBottom>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.subtitle}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderYearToDate = () => {
    if (!summary) return null;

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Year-to-Date Summary
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  YTD Wages
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(summary.ytd_wages)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Federal Tax Withheld
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(summary.ytd_federal_tax)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Social Security Tax
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(summary.ytd_social_security)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Medicare Tax
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(summary.ytd_medicare)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1">
              Total YTD Tax Liability
            </Typography>
            <Typography variant="h6" color="primary">
              {formatCurrency(summary.ytd_total_tax)}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderUpcomingDeadlines = () => {
    if (!summary || !summary.upcoming_deadlines) return null;

    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Upcoming Deadlines
            </Typography>
            <Button
              size="small"
              endIcon={<ArrowIcon />}
              onClick={() => setActiveTab(2)}
            >
              View All
            </Button>
          </Box>
          <List>
            {summary.upcoming_deadlines.slice(0, 5).map((deadline, index) => {
              const daysUntil = differenceInDays(new Date(deadline.filing_deadline), new Date());
              
              return (
                <React.Fragment key={deadline.id}>
                  <ListItem>
                    <ListItemIcon>
                      <CalendarIcon color={getUrgencyColor(daysUntil)} />
                    </ListItemIcon>
                    <ListItemText
                      primary={deadline.form_type_display}
                      secondary={`Due: ${format(new Date(deadline.filing_deadline), 'MMM d, yyyy')}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : `${daysUntil} days`}
                        color={getUrgencyColor(daysUntil)}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < summary.upcoming_deadlines.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        </CardContent>
      </Card>
    );
  };

  const renderComplianceStatus = () => {
    if (!summary) return null;

    const complianceItems = [
      {
        label: 'Deposit Schedule',
        value: summary.deposit_schedule === 'monthly' ? 'Monthly' : 'Semi-Weekly',
        icon: <ScheduleIcon />,
        status: 'info'
      },
      {
        label: 'Tax Deposits',
        value: summary.all_deposits_current ? 'Current' : 'Behind',
        icon: summary.all_deposits_current ? <CheckIcon /> : <WarningIcon />,
        status: summary.all_deposits_current ? 'success' : 'error'
      },
      {
        label: 'Tax Filings',
        value: summary.all_filings_current ? 'Current' : 'Behind',
        icon: summary.all_filings_current ? <CheckIcon /> : <WarningIcon />,
        status: summary.all_filings_current ? 'success' : 'error'
      },
      {
        label: 'Notices',
        value: summary.has_pending_notices ? 'Action Required' : 'None',
        icon: summary.has_pending_notices ? <NotificationIcon /> : <CheckIcon />,
        status: summary.has_pending_notices ? 'warning' : 'success'
      }
    ];

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Compliance Status
          </Typography>
          <List>
            {complianceItems.map((item, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemIcon>
                    <Box color={`${item.status}.main`}>{item.icon}</Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    secondary={item.value}
                  />
                </ListItem>
                {index < complianceItems.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  };

  const renderRecentFilings = () => {
    if (!summary || !summary.recent_filings) return null;

    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Recent Filings
            </Typography>
            <Button
              size="small"
              endIcon={<ArrowIcon />}
              onClick={() => setActiveTab(1)}
            >
              View All
            </Button>
          </Box>
          <List>
            {summary.recent_filings.map((filing, index) => (
              <React.Fragment key={filing.id}>
                <ListItem>
                  <ListItemIcon>
                    <FormIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Form 941 - Q${filing.quarter} ${filing.year}`}
                    secondary={`Filed: ${format(new Date(filing.filing_date), 'MMM d, yyyy')}`}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={filing.filing_status_display}
                      color="success"
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                {index < summary.recent_filings.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  const tabContent = [
    { label: 'Dashboard', icon: <DashboardIcon />, component: null },
    { label: 'Form 941', icon: <FormIcon />, component: <Form941Management /> },
    { label: 'Tax Deposits', icon: <PaymentIcon />, component: <TaxDepositManager /> },
    { label: 'Filing Schedule', icon: <ScheduleIcon />, component: <FilingSchedule /> },
    { label: 'Employer Account', icon: <AccountIcon />, component: <EmployerAccount /> }
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Payroll Tax Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabContent.map((tab, index) => (
            <Tab
              key={index}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Paper>

      {activeTab === 0 ? (
        <Box>
          {/* Summary Cards */}
          {renderSummaryCards()}

          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Year to Date */}
            <Grid item xs={12}>
              {renderYearToDate()}
            </Grid>

            {/* Upcoming Deadlines */}
            <Grid item xs={12} md={6}>
              {renderUpcomingDeadlines()}
            </Grid>

            {/* Compliance Status */}
            <Grid item xs={12} md={6}>
              {renderComplianceStatus()}
            </Grid>

            {/* Recent Filings */}
            <Grid item xs={12}>
              {renderRecentFilings()}
            </Grid>
          </Grid>

          {/* Quick Actions */}
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  startIcon={<FormIcon />}
                  onClick={() => setActiveTab(1)}
                >
                  File Form 941
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PaymentIcon />}
                  onClick={() => setActiveTab(2)}
                >
                  Make Tax Deposit
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ScheduleIcon />}
                  onClick={() => setActiveTab(3)}
                >
                  View Schedule
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AccountIcon />}
                  onClick={() => setActiveTab(4)}
                >
                  Account Settings
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Box>
      ) : (
        <Box>
          {tabContent[activeTab].component}
        </Box>
      )}
    </Box>
  );
};

export default PayrollTaxDashboard;