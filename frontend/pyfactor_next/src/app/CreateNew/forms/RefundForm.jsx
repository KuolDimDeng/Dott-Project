import React, { useState } from 'react';
import { TextField, Button, Grid, Typography } from '@mui/material';
import axiosInstance from '@/app/dashboard/components/components/axiosConfig';

const RefundForm = () => {
  const [refund, setRefund] = useState({
    sale: '',
    amount: '',
    reason: '',
  });

  const handleChange = (e) => {
    setRefund({ ...refund, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/api/refunds/create/', refund);
      console.log('Refund created:', response.data);
      // Handle success (e.g., show a success message, clear the form)
    } catch (error) {
      console.error('Error creating refund:', error);
      // Handle error (e.g., show an error message)
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h6">Create Refund</Typography>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            name="sale"
            label="Sale ID"
            value={refund.sale}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            name="amount"
            label="Refund Amount"
            type="number"
            value={refund.amount}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            name="reason"
            label="Refund Reason"
            multiline
            rows={4}
            value={refund.reason}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <Button type="submit" variant="contained" color="primary">
            Create Refund
          </Button>
        </Grid>
      </Grid>
    </form>
  );
};

export default RefundForm;