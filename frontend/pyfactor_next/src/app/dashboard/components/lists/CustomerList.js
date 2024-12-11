import React, { useEffect, useState } from 'react';
import {
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';

const CustomerList = ({ onCreateCustomer, onInvoiceSelect, onCustomerSelect, onBack }) => {
  const [customers, setCustomers] = useState([]);
  const [userDatabase, setUserDatabase] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userDatabase) {
      fetchCustomers(userDatabase);
    }
  }, [userDatabase]);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('http://localhost:8000/api/profile/');
      setUserDatabase(response.data.database_name);
      console.log('User profile:', response.data);
      console.log('User database:', response.data.database_name);
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      setError('Error fetching user profile');
      setLoading(false);
    }
  };

  const fetchCustomers = async (database_name) => {
    try {
      console.log('Fetching customers from database:', database_name);
      const response = await axiosInstance.get('http://localhost:8000/api/customers/', {
        params: { database: database_name },
      });
      console.log('Fetched customers:', response.data);
      setCustomers(response.data);
      setLoading(false);
    } catch (error) {
      logger.error('Error fetching customers:', error);
      setError('Error fetching customers');
      setLoading(false);
    }
  };

  const handleViewCustomer = (customer) => {
    console.log('Selected customer:', customer);
    onCustomerSelect(customer.id);
  };

  if (loading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (customers.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          No customers found
        </Typography>
        <Button variant="contained" color="primary" onClick={onCreateCustomer}>
          Create a Customer
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Customer List
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Account Number</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((customer) => (
              <TableRow
                key={customer.id}
                onClick={() => handleViewCustomer(customer)}
                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0, 0, 128, 0.1)' } }}
              >
                <TableCell>
                  {customer.customerName || `${customer.first_name} ${customer.last_name}`}
                </TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>{customer.account_number}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CustomerList;
