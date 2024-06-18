import React, { useState } from 'react';
import { Box, TextField, Button } from '@mui/material';

const SalesOrderForm = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
  };

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Order Number"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          required
        />
        <TextField
          label="Customer ID"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          required
        />
        <TextField
          label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          type="number"
          step="0.01"
        />
        <Button type="submit" variant="contained">
          Create Sales Order
        </Button>
      </form>
    </Box>
  );
};

export default SalesOrderForm;