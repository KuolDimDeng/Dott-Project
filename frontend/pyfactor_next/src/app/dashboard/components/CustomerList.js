import React, { useEffect, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import axiosInstance from './axiosConfig';
import { logger, UserMessage } from '@/utils/logger';


const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [userDatabase, setUserDatabase] = useState('');

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
    } catch (error) {
      logger.error('Error fetching customers:', error);
    }
  };

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
              <TableCell>Primary Contact</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Account Number</TableCell>
              <TableCell>Website</TableCell>
              <TableCell>Currency</TableCell>
              <TableCell>Billing Country</TableCell>
              <TableCell>Billing State</TableCell>
              <TableCell>Ship To Name</TableCell>
              <TableCell>Shipping Country</TableCell>
              <TableCell>Shipping State</TableCell>
              <TableCell>Shipping Phone</TableCell>
              <TableCell>Street</TableCell>
              <TableCell>Postcode</TableCell>
              <TableCell>City</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.customerName}</TableCell>
                <TableCell>{`${customer.first_name} ${customer.last_name}`}</TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>{customer.accountNumber}</TableCell>
                <TableCell>{customer.website}</TableCell>
                <TableCell>{customer.currency}</TableCell>
                <TableCell>{customer.billingCountry}</TableCell>
                <TableCell>{customer.billingState}</TableCell>
                <TableCell>{customer.shipToName}</TableCell>
                <TableCell>{customer.shippingCountry}</TableCell>
                <TableCell>{customer.shippingState}</TableCell>
                <TableCell>{customer.shippingPhone}</TableCell>
                <TableCell>{customer.street}</TableCell>
                <TableCell>{customer.postcode}</TableCell>
                <TableCell>{customer.city}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CustomerList;