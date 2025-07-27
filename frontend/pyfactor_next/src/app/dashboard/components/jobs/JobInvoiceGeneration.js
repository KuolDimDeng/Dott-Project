'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Alert,
  TextField,
  Divider,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  FormControlLabel,
  Checkbox,
  CircularProgress
} from '@mui/material';
import {
  Receipt,
  Add,
  Delete,
  Calculate,
  Send,
  AttachMoney
} from '@mui/icons-material';
import jobsApi from '@/app/utils/api/jobsApi';
import { useRouter } from 'next/navigation';

const JobInvoiceGeneration = ({ open, onClose, job, onInvoiceCreated }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invoiceData, setInvoiceData] = useState({
    customer_id: '',
    customer_name: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    terms: 'Payment due within 30 days',
    items: [],
    subtotal: 0,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 0,
    includeDeposit: true
  });
  const [jobDetails, setJobDetails] = useState(null);

  useEffect(() => {
    if (open && job) {
      loadJobDetails();
    }
  }, [open, job]);

  const loadJobDetails = async () => {
    setLoading(true);
    try {
      // Fetch full job details including materials, labor, and expenses
      const [jobResponse, materialsResponse, laborResponse, expensesResponse] = await Promise.all([
        jobsApi.getJob(job.id),
        jobsApi.getMaterials(job.id),
        jobsApi.getLabor(job.id),
        jobsApi.getExpenses(job.id)
      ]);

      const fullJob = jobResponse.data;
      const materials = materialsResponse.data;
      const labor = laborResponse.data;
      const expenses = expensesResponse.data;

      setJobDetails({
        job: fullJob,
        materials,
        labor,
        expenses
      });

      // Build invoice items from job data
      const items = [];
      
      // Add main job as line item
      if (fullJob.final_amount || fullJob.quoted_amount) {
        items.push({
          id: 'job-main',
          item_type: 'service',
          description: `${fullJob.name} - ${fullJob.description || 'Job services'}`,
          quantity: 1,
          unit_price: fullJob.final_amount || fullJob.quoted_amount,
          tax_rate: 0,
          tax_amount: 0,
          total: fullJob.final_amount || fullJob.quoted_amount
        });
      }

      // Add materials
      materials.forEach((material, index) => {
        items.push({
          id: `material-${index}`,
          item_type: 'product',
          description: material.description || material.material_name,
          quantity: material.quantity,
          unit_price: material.unit_cost,
          tax_rate: 0,
          tax_amount: 0,
          total: material.total_cost
        });
      });

      // Add labor
      labor.forEach((laborItem, index) => {
        items.push({
          id: `labor-${index}`,
          item_type: 'service',
          description: `Labor - ${laborItem.employee_name || 'Worker'} (${laborItem.hours} hours)`,
          quantity: laborItem.hours,
          unit_price: laborItem.hourly_rate,
          tax_rate: 0,
          tax_amount: 0,
          total: laborItem.total_cost
        });
      });

      // Add billable expenses
      expenses.filter(exp => exp.is_billable).forEach((expense, index) => {
        const markupAmount = expense.markup_percentage ? 
          (expense.amount * expense.markup_percentage / 100) : 0;
        items.push({
          id: `expense-${index}`,
          item_type: 'service',
          description: expense.description,
          quantity: 1,
          unit_price: expense.amount + markupAmount,
          tax_rate: 0,
          tax_amount: 0,
          total: expense.amount + markupAmount
        });
      });

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
      const depositCredit = (fullJob.deposit_paid && invoiceData.includeDeposit) ? 
        parseFloat(fullJob.deposit_amount || 0) : 0;

      setInvoiceData(prev => ({
        ...prev,
        customer_id: fullJob.customer?.id || fullJob.customer,
        customer_name: fullJob.customer?.name || fullJob.customer_name,
        notes: `Invoice for Job #${fullJob.job_number}`,
        items,
        subtotal,
        total_amount: subtotal - depositCredit,
        deposit_credit: depositCredit
      }));
    } catch (err) {
      console.error('Error loading job details:', err);
      setError('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomItem = () => {
    const newItem = {
      id: `custom-${Date.now()}`,
      item_type: 'service',
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
      tax_amount: 0,
      total: 0
    };
    
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const handleRemoveItem = (itemId) => {
    setInvoiceData(prev => {
      const updatedItems = prev.items.filter(item => item.id !== itemId);
      const subtotal = updatedItems.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
      const depositCredit = (jobDetails?.job.deposit_paid && prev.includeDeposit) ? 
        parseFloat(jobDetails.job.deposit_amount || 0) : 0;
      
      return {
        ...prev,
        items: updatedItems,
        subtotal,
        total_amount: subtotal - depositCredit
      };
    });
  };

  const handleItemChange = (itemId, field, value) => {
    setInvoiceData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          // Recalculate total if quantity or unit_price changes
          if (field === 'quantity' || field === 'unit_price') {
            updatedItem.total = parseFloat(updatedItem.quantity || 0) * parseFloat(updatedItem.unit_price || 0);
          }
          
          return updatedItem;
        }
        return item;
      });
      
      const subtotal = updatedItems.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
      const depositCredit = (jobDetails?.job.deposit_paid && prev.includeDeposit) ? 
        parseFloat(jobDetails.job.deposit_amount || 0) : 0;
      
      return {
        ...prev,
        items: updatedItems,
        subtotal,
        total_amount: subtotal - depositCredit
      };
    });
  };

  const handleCreateInvoice = async () => {
    setLoading(true);
    setError('');

    try {
      // Create invoice via the invoice API
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...invoiceData,
          job_id: job.id,
          status: 'sent',
          total_amount: invoiceData.total_amount
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invoice');
      }

      const invoice = await response.json();

      // Update job status to 'invoiced'
      await jobsApi.updateStatus(job.id, {
        status: 'invoiced',
        notes: `Invoice #${invoice.invoice_number} created`
      });

      onInvoiceCreated && onInvoiceCreated(invoice);
      
      // Show success and ask if they want to send it
      if (window.confirm('Invoice created successfully! Would you like to send it to the customer?')) {
        // Navigate to invoice send page or open send modal
        router.push(`/dashboard/invoices/${invoice.id}/send`);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Receipt />
          <Typography variant="h6">Generate Invoice from Job</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          
          {loading && !jobDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Job Information */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Job Information
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    Job #{job?.job_number} - {job?.name}
                  </Typography>
                  <Typography variant="body2">
                    Customer: {invoiceData.customer_name}
                  </Typography>
                  <Typography variant="body2">
                    Status: <Chip label={job?.status} size="small" />
                  </Typography>
                </Stack>
              </Box>
              
              <Divider />
              
              {/* Invoice Details */}
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Invoice Date"
                  type="date"
                  value={invoiceData.issue_date}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, issue_date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Due Date"
                  type="date"
                  value={invoiceData.due_date}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, due_date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>
              
              {/* Line Items */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle2">Invoice Items</Typography>
                  <Button
                    startIcon={<Add />}
                    onClick={handleAddCustomItem}
                    size="small"
                  >
                    Add Custom Item
                  </Button>
                </Stack>
                
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Description</TableCell>
                        <TableCell align="center">Quantity</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoiceData.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <TextField
                              value={item.description}
                              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                              fullWidth
                              size="small"
                              variant="standard"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                              size="small"
                              variant="standard"
                              sx={{ width: 80 }}
                              inputProps={{ step: 0.01, min: 0 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(item.id, 'unit_price', e.target.value)}
                              size="small"
                              variant="standard"
                              sx={{ width: 100 }}
                              inputProps={{ step: 0.01, min: 0 }}
                              InputProps={{
                                startAdornment: '$'
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.total)}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveItem(item.id)}
                              color="error"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
              
              {/* Totals */}
              <Box sx={{ ml: 'auto', maxWidth: 400 }}>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography>Subtotal:</Typography>
                    <Typography fontWeight="medium">
                      {formatCurrency(invoiceData.subtotal)}
                    </Typography>
                  </Stack>
                  
                  {jobDetails?.job.deposit_paid && (
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={invoiceData.includeDeposit}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setInvoiceData(prev => ({
                                ...prev,
                                includeDeposit: checked,
                                total_amount: prev.subtotal - (checked ? prev.deposit_credit : 0)
                              }));
                            }}
                            size="small"
                          />
                        }
                        label="Apply deposit credit"
                      />
                      <Typography color="success.main">
                        -{formatCurrency(invoiceData.deposit_credit || 0)}
                      </Typography>
                    </Stack>
                  )}
                  
                  <Divider />
                  
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="h6">Total Due:</Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(invoiceData.total_amount)}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
              
              {/* Notes */}
              <TextField
                label="Invoice Notes"
                multiline
                rows={3}
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                fullWidth
              />
              
              <TextField
                label="Payment Terms"
                value={invoiceData.terms}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, terms: e.target.value }))}
                fullWidth
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleCreateInvoice}
          variant="contained"
          disabled={loading || invoiceData.items.length === 0 || invoiceData.total_amount <= 0}
          startIcon={loading ? <CircularProgress size={20} /> : <AttachMoney />}
        >
          {loading ? 'Creating...' : 'Create Invoice'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JobInvoiceGeneration;