import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Grid,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Receipt as ReceiptIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';

const TaxDepositManager = () => {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'current_quarter'
  });

  // Stats
  const [stats, setStats] = useState({
    scheduled: 0,
    pending: 0,
    completed: 0,
    overdue: 0,
    totalDue: 0,
    totalPaid: 0
  });

  useEffect(() => {
    fetchDeposits();
  }, [filters]);

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      let url = '/api/taxes/payroll/deposits/';
      const params = new URLSearchParams();
      
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }
      
      // Add date range filters
      const dateRange = getDateRange(filters.dateRange);
      if (dateRange.start) {
        params.append('start_date', dateRange.start);
        params.append('end_date', dateRange.end);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch deposits');
      
      const data = await response.json();
      const depositsData = data.results || data;
      setDeposits(depositsData);
      calculateStats(depositsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (depositsData) => {
    const now = new Date();
    const stats = {
      scheduled: 0,
      pending: 0,
      completed: 0,
      overdue: 0,
      totalDue: 0,
      totalPaid: 0
    };

    depositsData.forEach(deposit => {
      stats[deposit.status]++;
      
      if (deposit.status === 'completed') {
        stats.totalPaid += parseFloat(deposit.total_deposit);
      } else {
        stats.totalDue += parseFloat(deposit.total_deposit);
        
        // Check if overdue
        if (isBefore(parseISO(deposit.due_date), now)) {
          stats.overdue++;
        }
      }
    });

    setStats(stats);
  };

  const getDateRange = (rangeType) => {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    
    switch (rangeType) {
      case 'current_quarter':
        const quarterStart = new Date(year, (quarter - 1) * 3, 1);
        const quarterEnd = new Date(year, quarter * 3, 0);
        return {
          start: format(quarterStart, 'yyyy-MM-dd'),
          end: format(quarterEnd, 'yyyy-MM-dd')
        };
      case 'current_year':
        return {
          start: `${year}-01-01`,
          end: `${year}-12-31`
        };
      case 'last_90_days':
        return {
          start: format(addDays(now, -90), 'yyyy-MM-dd'),
          end: format(now, 'yyyy-MM-dd')
        };
      default:
        return { start: null, end: null };
    }
  };

  const createDepositFromPayroll = async (payrollRunId) => {
    setLoading(true);
    try {
      const response = await fetch('/api/taxes/payroll/deposits/create_from_payroll/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ payroll_run_id: payrollRunId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create deposit');
      }
      
      const newDeposit = await response.json();
      setDeposits([newDeposit, ...deposits]);
      setShowCreateDialog(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (depositId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/taxes/payroll/deposits/${depositId}/process_payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ payment_method: 'eftps' })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process payment');
      }
      
      const updatedDeposit = await response.json();
      setDeposits(deposits.map(d => d.id === depositId ? updatedDeposit : d));
      setShowPaymentDialog(false);
      setSelectedDeposit(null);
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

  const getStatusColor = (status, dueDate) => {
    if (status === 'completed') return 'success';
    if (status === 'failed') return 'error';
    if (status === 'processing') return 'info';
    
    // Check if overdue
    if (isBefore(parseISO(dueDate), new Date())) {
      return 'error';
    }
    
    return 'default';
  };

  const renderStats = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Total Due
                </Typography>
                <Typography variant="h5">
                  {formatCurrency(stats.totalDue)}
                </Typography>
              </Box>
              <MoneyIcon color="warning" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Total Paid
                </Typography>
                <Typography variant="h5">
                  {formatCurrency(stats.totalPaid)}
                </Typography>
              </Box>
              <CheckIcon color="success" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Overdue
                </Typography>
                <Typography variant="h5">
                  {stats.overdue}
                </Typography>
              </Box>
              <Badge badgeContent={stats.overdue} color="error">
                <WarningIcon color="error" />
              </Badge>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Scheduled
                </Typography>
                <Typography variant="h5">
                  {stats.scheduled}
                </Typography>
              </Box>
              <ScheduleIcon color="info" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderDepositsTable = () => {
    const filteredDeposits = deposits.filter(deposit => {
      if (activeTab === 1) return deposit.status !== 'completed';
      if (activeTab === 2) return deposit.status === 'completed';
      return true;
    });

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Pay Date</TableCell>
              <TableCell>Deposit Date</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell align="right">Federal Income</TableCell>
              <TableCell align="right">Social Security</TableCell>
              <TableCell align="right">Medicare</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDeposits.map((deposit) => {
              const isOverdue = deposit.status !== 'completed' && 
                               isBefore(parseISO(deposit.due_date), new Date());
              
              return (
                <TableRow key={deposit.id}>
                  <TableCell>{format(parseISO(deposit.pay_date), 'MM/dd/yyyy')}</TableCell>
                  <TableCell>{format(parseISO(deposit.deposit_date), 'MM/dd/yyyy')}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {format(parseISO(deposit.due_date), 'MM/dd/yyyy')}
                      {isOverdue && (
                        <Tooltip title="Overdue">
                          <WarningIcon color="error" fontSize="small" />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">{formatCurrency(deposit.federal_income_tax)}</TableCell>
                  <TableCell align="right">{formatCurrency(deposit.social_security_tax)}</TableCell>
                  <TableCell align="right">{formatCurrency(deposit.medicare_tax)}</TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2">
                      {formatCurrency(deposit.total_deposit)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={deposit.status_display}
                      color={getStatusColor(deposit.status, deposit.due_date)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      {deposit.status !== 'completed' && (
                        <Tooltip title="Make Payment">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedDeposit(deposit);
                              setShowPaymentDialog(true);
                            }}
                          >
                            <PaymentIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {deposit.confirmation_number && (
                        <Tooltip title={`Confirmation: ${deposit.confirmation_number}`}>
                          <IconButton size="small">
                            <ReceiptIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredDeposits.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No deposits found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          Tax Deposits
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowCreateDialog(true)}
        >
          Create Deposit
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      {renderStats()}

      {/* Filters */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="processing">Processing</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                  label="Date Range"
                >
                  <MenuItem value="current_quarter">Current Quarter</MenuItem>
                  <MenuItem value="current_year">Current Year</MenuItem>
                  <MenuItem value="last_90_days">Last 90 Days</MenuItem>
                  <MenuItem value="all">All Time</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ mb: 2 }}
      >
        <Tab label="All Deposits" />
        <Tab 
          label={
            <Badge badgeContent={stats.scheduled + stats.pending} color="warning">
              <span>Pending</span>
            </Badge>
          } 
        />
        <Tab label="Completed" />
      </Tabs>

      {/* Deposits Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        renderDepositsTable()
      )}

      {/* Payment Dialog */}
      <Dialog
        open={showPaymentDialog}
        onClose={() => {
          setShowPaymentDialog(false);
          setSelectedDeposit(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Process Tax Deposit Payment</DialogTitle>
        <DialogContent>
          {selectedDeposit && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                You are about to process a federal tax deposit through EFTPS
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Deposit Amount
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(selectedDeposit.total_deposit)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Due Date
                  </Typography>
                  <Typography variant="h6">
                    {format(parseISO(selectedDeposit.due_date), 'MMM d, yyyy')}
                  </Typography>
                </Grid>
              </Grid>
              
              <Box mt={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Tax Breakdown:
                </Typography>
                <Box component="ul" pl={2}>
                  <li>Federal Income Tax: {formatCurrency(selectedDeposit.federal_income_tax)}</li>
                  <li>Social Security Tax: {formatCurrency(selectedDeposit.social_security_tax)}</li>
                  <li>Medicare Tax: {formatCurrency(selectedDeposit.medicare_tax)}</li>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPaymentDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => processPayment(selectedDeposit.id)}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Process Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Deposit Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Tax Deposit</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Select a payroll run to create a tax deposit
          </Alert>
          <TextField
            fullWidth
            label="Payroll Run ID"
            placeholder="Enter payroll run ID"
            margin="normal"
            onChange={(e) => {
              // Handle payroll run selection
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              // Create deposit logic
            }}
          >
            Create Deposit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaxDepositManager;