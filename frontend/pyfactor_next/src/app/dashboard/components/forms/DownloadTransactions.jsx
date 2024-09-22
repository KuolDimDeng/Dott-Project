// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/DownloadTransactions.jsx

import React, { useState } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';
import axiosInstance from '../components/axiosConfig';

const DownloadTransactions = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleDownload = async () => {
    try {
      const response = await axiosInstance.get('/api/banking/download-transactions/', {
        params: { start_date: startDate, end_date: endDate },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Error downloading transactions:', error);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Download Transactions
      </Typography>
      <TextField
        label="Start Date"
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        fullWidth
        margin="normal"
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label="End Date"
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        fullWidth
        margin="normal"
        InputLabelProps={{ shrink: true }}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={handleDownload}
        fullWidth
        sx={{ mt: 2 }}
      >
        Download Transactions
      </Button>
    </Box>
  );
};

export default DownloadTransactions;