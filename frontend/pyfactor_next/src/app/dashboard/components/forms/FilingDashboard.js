'use client';

import React, { useState, useEffect } from 'react';
import { 
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
  Box, 
  Grid, 
  CircularProgress, 
  Alert 
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Payment as PaymentIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

const FilingDashboard = ({ onNewFiling }) => {
  const [filings, setFilings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    overdue: 0
  });

  useEffect(() => {
    fetchFilings();
    fetchStats();
  }, []);

  const fetchFilings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/taxes/filings', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setFilings(data.filings || []);
      } else {
        console.error('Failed to fetch filings');
      }
    } catch (error) {
      console.error('Error fetching filings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/taxes/filings/stats', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      case 'in_progress':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon fontSize="small" />;
      case 'pending':
        return <ScheduleIcon fontSize="small" />;
      case 'failed':
        return <ErrorIcon fontSize="small" />;
      case 'in_progress':
        return <CircularProgress size={16} />;
      default:
        return null;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewFiling = (filing) => {
    // Open filing details
    console.log('View filing:', filing);
  };

  const handleDownloadReport = (filing) => {
    if (filing.tax_report_url) {
      window.open(filing.tax_report_url, '_blank');
    }
  };

  const handlePayment = (filing) => {
    // Handle payment for filing
    console.log('Process payment for filing:', filing);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Tax Filing Service
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onNewFiling}
          sx={{ borderRadius: 2 }}
        >
          File New Return
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Filings
              </Typography>
              <Typography variant="h4" component="div">
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending
              </Typography>
              <Typography variant="h4" component="div" color="warning.main">
                {stats.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4" component="div" color="success.main">
                {stats.completed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Overdue
              </Typography>
              <Typography variant="h4" component="div" color="error.main">
                {stats.overdue}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filing Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Filings
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : filings.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No tax filings found. Click "File New Return" to get started.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Period</TableCell>
                    <TableCell>Country/State</TableCell>
                    <TableCell>Service Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Fee</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filings.map((filing) => (
                    <TableRow key={filing.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {filing.period_display}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {filing.location_display}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={filing.filing_type === 'manual' ? 'Manual Filing' : 'Online Filing'}
                          variant="outlined"
                          size="small"
                          color={filing.filing_type === 'online' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(filing.status)}
                          label={filing.status.charAt(0).toUpperCase() + filing.status.slice(1)}
                          color={getStatusColor(filing.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(filing.filing_fee)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {filing.due_date ? formatDate(filing.due_date) : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleViewFiling(filing)}
                            title="View Details"
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                          {filing.tax_report_url && (
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadReport(filing)}
                              title="Download Report"
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          )}
                          {filing.payment_status === 'pending' && (
                            <IconButton
                              size="small"
                              onClick={() => handlePayment(filing)}
                              title="Process Payment"
                              color="primary"
                            >
                              <PaymentIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default FilingDashboard;