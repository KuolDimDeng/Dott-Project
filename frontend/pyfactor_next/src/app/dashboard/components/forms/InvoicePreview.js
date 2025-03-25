import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Button } from '@mui/material';

const InvoicePreview = ({
  logo,
  accentColor,
  template,
  userData,
  invoiceItems,
  products,
  services,
}) => {
  const { first_name, last_name, business_name, address, city, state, zip_code, phone, email } =
    userData || {};
  const subtotal = invoiceItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const getItemName = (item) => {
    if (item.type === 'product') {
      const product = products.find((product) => product.id === item.productId);
      return product ? product.name : '';
    } else if (item.type === 'service') {
      const service = services.find((service) => service.id === item.serviceId);
      return service ? service.name : '';
    }
    return '';
  };

  return (
    <Paper style={{ padding: '1rem' }}>
      <Box display="flex" flexDirection="column" alignItems="center" gap={2} mb={2}>
        <Typography variant="h4" style={{ color: accentColor }}>
          INVOICE
        </Typography>
        <Typography variant="body1">Invoice # for your recent order</Typography>
      </Box>
      <Box display="grid" gap={1} textAlign="center" mb={2}>
        <Typography variant="body2">{business_name}</Typography>
        <Typography variant="body2">{email}</Typography>
        <Typography variant="body2">{business_name}.com</Typography>
      </Box>
      <Box
        borderTop={1}
        borderBottom={1}
        py={2}
        px={4}
        display="grid"
        gap={2}
        textAlign="left"
        mb={2}
      >
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" fontWeight="bold">
            Invoice number
          </Typography>
          <Typography variant="body2" color="text.secondary">
            #123456
          </Typography>
        </Box>
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" fontWeight="bold">
            Issue date
          </Typography>
          <Typography variant="body2">{new Date().toLocaleDateString()}</Typography>
        </Box>
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" fontWeight="bold">
            Due date
          </Typography>
          <Typography variant="body2">
            {new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString()}
          </Typography>
        </Box>
      </Box>
      <Box borderTop={1} py={2} px={4} display="grid" gap={2} textAlign="left" mb={2}>
        <Typography variant="body2" fontWeight="bold">
          Bill to
        </Typography>
        <Box display="grid" gap={1}>
          <Typography variant="body2">{`${first_name} ${last_name}`}</Typography>
          <Typography variant="body2">{business_name}</Typography>
          <Typography variant="body2">{`${address}, ${city}, ${state} ${zip_code}`}</Typography>
          <Typography variant="body2">{`Phone: ${phone}`}</Typography>
        </Box>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ fontWeight: 'bold' }}>Item</TableCell>
              <TableCell style={{ fontWeight: 'bold' }}>Description</TableCell>
              <TableCell style={{ fontWeight: 'bold' }}>Quantity</TableCell>
              <TableCell style={{ fontWeight: 'bold' }}>Unit Price</TableCell>
              <TableCell style={{ fontWeight: 'bold' }}>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoiceItems.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{getItemName(item)}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>${item.unitPrice?.toFixed(2) || '0.00'}</TableCell>
                <TableCell>${(item.quantity * item.unitPrice || 0).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box
        borderTop={1}
        borderBottom={1}
        py={2}
        px={4}
        display="grid"
        gap={2}
        textAlign="right"
        mt={2}
      >
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2">Subtotal</Typography>
          <Typography variant="body2">${subtotal.toFixed(2)}</Typography>
        </Box>
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2">Tax (10%)</Typography>
          <Typography variant="body2">${tax.toFixed(2)}</Typography>
        </Box>
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" fontWeight="bold">
            Total
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            ${total.toFixed(2)}
          </Typography>
        </Box>
      </Box>
      <Box display="flex" justifyContent="flex-end" mt={2}>
        <Button variant="outlined" color="primary" style={{ marginRight: '0.5rem' }}>
          Edit
        </Button>
        <Button variant="contained" color="primary">
          Download
        </Button>
      </Box>
    </Paper>
  );
};

export default InvoicePreview;
