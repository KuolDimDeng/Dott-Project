///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/CustomerList.js
import React, { useEffect, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('Token not found');
          return;
        }

        const response = await fetch('http://localhost:8000/api/customers/', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCustomers(data);
          console.log('Fetched customers:', data);
        } else {
          console.error('Error fetching customers:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    };

    fetchCustomers();
  }, []);

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
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.customerName}</TableCell>
                <TableCell>{`${customer.primaryContactFirstName} ${customer.primaryContactLastName}`}</TableCell>
                <TableCell>{customer.primaryContactEmail}</TableCell>
                <TableCell>{customer.primaryContactPhone}</TableCell>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CustomerList;
