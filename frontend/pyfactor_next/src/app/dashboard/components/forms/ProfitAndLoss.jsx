import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import axiosInstance from '../components/axiosConfig';

export default function ProfitAndLoss() {  // or BalanceSheet or CashFlow
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosInstance.get('/api/financial-statements/profit-and-loss/');  // adjust URL for each component
        console.log('API Response:', response);
        if (response.data && response.data.data) {
          setData(response.data.data);
        } else {
          setError('Unexpected data format received');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        console.log('Error response:', error.response);
        setError(error.response?.data?.error || 'An error occurred');
      }
    };
    fetchData();
  }, []);

  if (error) return <Typography color="error">Error: {error}</Typography>;
  if (!data) return <Typography>Loading...</Typography>;

  if (Object.keys(data).length === 0) {
    return <Typography>No data available for the current date.</Typography>;
  }


  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Item</TableCell>
            <TableCell align="right">Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(data).map(([key, value]) => (
            <TableRow key={key}>
              <TableCell>{key}</TableCell>
              <TableCell align="right">{value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}