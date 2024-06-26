import React, { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import { logger, UserMessage } from '@/utils/logger';


const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/transactions/', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'

          },
        });

        if (response.ok) {
          const data = await response.json();
          setTransactions(data);
          console.log('Fetched transactions:', data);
        } else {
          logger.error('Error fetching transactions:', response.statusText);
        }
      } catch (error) {
        logger.error('Error fetching transactions:', error);
      }
    };

    fetchTransactions();
  }, []);

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button variant="contained" color="primary" sx={{ mr: 1 }}>
          Filter
        </Button>
        <Button variant="contained" color="primary" sx={{ mr: 1 }}>
          Sort
        </Button>
        <Button variant="contained" color="primary">
          Search
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Account</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell>Action</TableCell>

            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.date}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell>{transaction.account ? transaction.account.name : ''}</TableCell>
                <TableCell>{transaction.type}</TableCell>
                <TableCell>{transaction.amount}</TableCell>
                <TableCell>{transaction.notes}</TableCell>
                <TableCell>
                  <Button variant="contained" color="primary" size="small">
                    Edit
                  </Button>
                  <Button variant="contained" color="secondary" size="small" sx={{ ml: 1 }}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TransactionList;