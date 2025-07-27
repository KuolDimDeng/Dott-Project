'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Stack,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Box,
  CircularProgress
} from '@mui/material';
import {
  Link,
  LinkOff,
  Receipt,
  Search
} from '@mui/icons-material';
import jobsApi from '@/app/utils/api/jobsApi';
import billsApi from '@/app/utils/api/billsApi';

const JobExpenseLink = ({ open, onClose, job }) => {
  const [bills, setBills] = useState([]);
  const [linkedBills, setLinkedBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchBills();
      fetchLinkedBills();
    }
  }, [open, job]);

  const fetchBills = async () => {
    try {
      const response = await billsApi.getBills();
      // Filter out bills already linked to other jobs
      const availableBills = response.data.filter(bill => !bill.job || bill.job === job?.id);
      setBills(availableBills);
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError('Failed to load bills');
    }
  };

  const fetchLinkedBills = async () => {
    if (!job) return;
    
    try {
      // Get bills linked to this job
      const response = await billsApi.getBills({ job_id: job.id });
      setLinkedBills(response.data);
    } catch (err) {
      console.error('Error fetching linked bills:', err);
    }
  };

  const handleLinkBill = async () => {
    if (!selectedBill) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Update bill to link it to the job
      await billsApi.updateBill(selectedBill.id, {
        ...selectedBill,
        job: job.id
      });
      
      // Create job expense record
      await jobsApi.addExpense(job.id, {
        expense_type: 'other',
        description: `Bill #${selectedBill.bill_number} - ${selectedBill.vendor_name}`,
        amount: selectedBill.totalAmount,
        expense_date: selectedBill.bill_date,
        vendor_name: selectedBill.vendor_name,
        receipt_number: selectedBill.bill_number,
        bill: selectedBill.id,
        is_billable: true,
        markup_percentage: 0
      });
      
      // Refresh lists
      await fetchBills();
      await fetchLinkedBills();
      setSelectedBill(null);
    } catch (err) {
      console.error('Error linking bill:', err);
      setError('Failed to link bill to job');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkBill = async (bill) => {
    if (!window.confirm('Are you sure you want to unlink this bill from the job?')) {
      return;
    }
    
    setLoading(true);
    try {
      // Update bill to remove job link
      await billsApi.updateBill(bill.id, {
        ...bill,
        job: null
      });
      
      // Remove job expense record
      const expenses = await jobsApi.getExpenses(job.id);
      const linkedExpense = expenses.data.find(exp => exp.bill === bill.id);
      if (linkedExpense) {
        await jobsApi.deleteExpense(job.id, linkedExpense.id);
      }
      
      // Refresh lists
      await fetchBills();
      await fetchLinkedBills();
    } catch (err) {
      console.error('Error unlinking bill:', err);
      setError('Failed to unlink bill from job');
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = bills.filter(bill => 
    bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalLinkedAmount = linkedBills.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Link Bills to Job
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}
          
          <Typography variant="body2" color="text.secondary">
            Link existing bills and expenses to job #{job?.job_number} - {job?.name}
          </Typography>
          
          {/* Search and Link Section */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Available Bills
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Autocomplete
                fullWidth
                options={filteredBills}
                value={selectedBill}
                onChange={(e, value) => setSelectedBill(value)}
                getOptionLabel={(option) => `${option.bill_number} - ${option.vendor_name} ($${option.totalAmount})`}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search bills by number or vendor..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Stack>
                      <Typography variant="body2">{option.bill_number}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.vendor_name} - ${option.totalAmount} - {new Date(option.bill_date).toLocaleDateString()}
                      </Typography>
                    </Stack>
                  </Box>
                )}
              />
              <Button
                variant="contained"
                onClick={handleLinkBill}
                disabled={!selectedBill || loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Link />}
              >
                Link
              </Button>
            </Stack>
          </Box>
          
          {/* Linked Bills Section */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">
                Linked Bills ({linkedBills.length})
              </Typography>
              <Typography variant="subtitle2" color="primary">
                Total: ${totalLinkedAmount.toFixed(2)}
              </Typography>
            </Stack>
            
            {linkedBills.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No bills linked to this job yet
              </Typography>
            ) : (
              <List sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
                {linkedBills.map((bill, index) => (
                  <ListItem key={bill.id} divider={index < linkedBills.length - 1}>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Receipt fontSize="small" />
                          <Typography variant="body2">{bill.bill_number}</Typography>
                          <Chip label={bill.vendor_name} size="small" />
                        </Stack>
                      }
                      secondary={
                        <Stack direction="row" spacing={2}>
                          <Typography variant="caption">
                            Date: {new Date(bill.bill_date).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption">
                            Amount: ${bill.totalAmount}
                          </Typography>
                          {bill.is_paid && (
                            <Chip label="Paid" size="small" color="success" />
                          )}
                        </Stack>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleUnlinkBill(bill)}
                        disabled={loading}
                      >
                        <LinkOff />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
          
          {/* Summary */}
          <Alert severity="info">
            Linking bills to jobs helps track project costs and profitability. 
            Linked bills will appear in the job's expense report and profit analysis.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default JobExpenseLink;