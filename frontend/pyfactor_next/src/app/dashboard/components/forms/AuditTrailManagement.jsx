import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Grid,
} from '@mui/material';
import { Bar } from 'react-chartjs-2';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { axiosInstance } from '@/lib/axiosConfig';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const AuditTrailManagement = () => {
  const [auditTrails, setAuditTrails] = useState([]);
  const [filteredAuditTrails, setFilteredAuditTrails] = useState([]);
  const [selectedAuditTrail, setSelectedAuditTrail] = useState(null);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    user: '',
    actionType: '',
    transactionType: '',
  });

  useEffect(() => {
    fetchAuditTrails();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [auditTrails, filters]);

  const fetchAuditTrails = async () => {
    try {
      const response = await axiosInstance.get('/api/finance/audit-trail/');
      setAuditTrails(response.data);
    } catch (error) {
      console.error('Error fetching audit trails:', error);
    }
  };

  const applyFilters = () => {
    let filtered = auditTrails;
    if (filters.startDate) {
      filtered = filtered.filter((trail) => new Date(trail.date_time) >= filters.startDate);
    }
    if (filters.endDate) {
      filtered = filtered.filter((trail) => new Date(trail.date_time) <= filters.endDate);
    }
    if (filters.user) {
      filtered = filtered.filter((trail) =>
        trail.user_name.toLowerCase().includes(filters.user.toLowerCase())
      );
    }
    if (filters.actionType) {
      filtered = filtered.filter((trail) => trail.action_type === filters.actionType);
    }
    if (filters.transactionType) {
      filtered = filtered.filter((trail) =>
        trail.transaction_type.toLowerCase().includes(filters.transactionType.toLowerCase())
      );
    }
    setFilteredAuditTrails(filtered);
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
  };

  const handleRowClick = (trail) => {
    setSelectedAuditTrail(trail);
  };

  const renderActivityChart = () => {
    const data = {
      labels: ['Create', 'Modify', 'Delete', 'Approve'],
      datasets: [
        {
          label: 'Action Types',
          data: [
            filteredAuditTrails.filter((trail) => trail.action_type === 'create').length,
            filteredAuditTrails.filter((trail) => trail.action_type === 'modify').length,
            filteredAuditTrails.filter((trail) => trail.action_type === 'delete').length,
            filteredAuditTrails.filter((trail) => trail.action_type === 'approve').length,
          ],
          backgroundColor: 'rgba(75,192,192,0.6)',
        },
      ],
    };

    const options = {
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Actions',
          },
        },
      },
    };

    return <Bar data={data} options={options} />;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ width: '100%' }}>
          <Typography variant="h4" gutterBottom>
            Audit Trail Management
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(date) => handleFilterChange('startDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(date) => handleFilterChange('endDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="User"
                value={filters.user}
                onChange={(e) => handleFilterChange('user', e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Action Type</InputLabel>
                <Select
                  value={filters.actionType}
                  onChange={(e) => handleFilterChange('actionType', e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="create">Create</MenuItem>
                  <MenuItem value="modify">Modify</MenuItem>
                  <MenuItem value="delete">Delete</MenuItem>
                  <MenuItem value="approve">Approve</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Transaction Type"
                value={filters.transactionType}
                onChange={(e) => handleFilterChange('transactionType', e.target.value)}
                fullWidth
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Transaction ID</TableCell>
                      <TableCell>Transaction Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAuditTrails.map((trail) => (
                      <TableRow
                        key={trail.id}
                        onClick={() => handleRowClick(trail)}
                        hover
                        style={{ cursor: 'pointer' }}
                      >
                        <TableCell>{new Date(trail.date_time).toLocaleString()}</TableCell>
                        <TableCell>{trail.user_name}</TableCell>
                        <TableCell>{trail.action_type}</TableCell>
                        <TableCell>{trail.transaction_id}</TableCell>
                        <TableCell>{trail.transaction_type}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            <Grid item xs={12} md={4}>
              {selectedAuditTrail ? (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Audit Trail Details
                  </Typography>
                  <Typography>
                    <strong>Date & Time:</strong>{' '}
                    {new Date(selectedAuditTrail.date_time).toLocaleString()}
                  </Typography>
                  <Typography>
                    <strong>User:</strong> {selectedAuditTrail.user_name}
                  </Typography>
                  <Typography>
                    <strong>Action:</strong> {selectedAuditTrail.action_type}
                  </Typography>
                  <Typography>
                    <strong>Transaction ID:</strong> {selectedAuditTrail.transaction_id}
                  </Typography>
                  <Typography>
                    <strong>Transaction Type:</strong> {selectedAuditTrail.transaction_type}
                  </Typography>
                  <Typography>
                    <strong>Affected Accounts:</strong> {selectedAuditTrail.affected_accounts}
                  </Typography>
                  <Typography>
                    <strong>Old Value:</strong> {selectedAuditTrail.old_value}
                  </Typography>
                  <Typography>
                    <strong>New Value:</strong> {selectedAuditTrail.new_value}
                  </Typography>
                  <Typography>
                    <strong>Approval Status:</strong> {selectedAuditTrail.approval_status}
                  </Typography>
                  <Typography>
                    <strong>Notes:</strong> {selectedAuditTrail.notes}
                  </Typography>
                  <Typography>
                    <strong>IP Address:</strong> {selectedAuditTrail.ip_address}
                  </Typography>
                  <Typography>
                    <strong>Module:</strong> {selectedAuditTrail.module}
                  </Typography>
                </Paper>
              ) : (
                <Typography>Select an audit trail entry to view details</Typography>
              )}
            </Grid>
          </Grid>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Activity Summary
            </Typography>
            {renderActivityChart()}
          </Box>

          <Box sx={{ mt: 4 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => console.log('Export functionality to be implemented')}
            >
              Export Audit Trail
            </Button>
          </Box>
        </Box>
      </Paper>
    </LocalizationProvider>
  );
};

export default AuditTrailManagement;
