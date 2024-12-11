import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { CircularProgress, Typography, Button, Box } from '@mui/material';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';

const InvoiceDetails = ({ invoiceId, onBackToCustomerDetails }) => {
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userDatabase, setUserDatabase] = useState(null);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/api/profile/');
      setUserDatabase(response.data.database_name);
      logger.log('User profile:', response.data);
      logger.log('User database:', response.data.database_name);
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      setError('Failed to load user profile');
    }
  }, []);

  const fetchInvoice = useCallback(async () => {
    if (!invoiceId || !userDatabase) {
      logger.error('Invoice ID or User Database is not provided', { invoiceId, userDatabase });
      setError('Invoice ID or User Database is not provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    logger.info(`Fetching invoice with ID: ${invoiceId} from database: ${userDatabase}`);
    try {
      const response = await axiosInstance.get(`/api/invoices/${invoiceId}/`, {
        params: { database: userDatabase },
      });
      setInvoice(response.data);
    } catch (error) {
      logger.error('Error fetching invoice:', error);
      if (error.response && error.response.status === 404) {
        setError(
          'Invoice not found. It may have been deleted or you may not have permission to view it.'
        );
      } else {
        setError('Failed to fetch invoice. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId, userDatabase]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    if (invoiceId && userDatabase) {
      fetchInvoice();
    }
  }, [invoiceId, userDatabase, fetchInvoice]);

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return (
      <Box>
        <Typography color="error">{error}</Typography>
        <Button onClick={onBackToCustomerDetails}>Back to Customer Details</Button>
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Box>
        <Typography>No invoice data available.</Typography>
        <Button onClick={onBackToCustomerDetails}>Back to Customer Details</Button>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Box>
        <Typography variant="h3">Invoice Details</Typography>
        <Typography>Invoice Number: {invoice.invoice_num}</Typography>
        <Typography>Amount: ${invoice.amount}</Typography>
        <Typography>Date: {new Date(invoice.date).toLocaleDateString()}</Typography>
        <Typography>Due Date: {new Date(invoice.due_date).toLocaleDateString()}</Typography>
        <Typography>Status: {invoice.status}</Typography>
        <Typography>Is Paid: {invoice.is_paid ? 'Yes' : 'No'}</Typography>
        {/* Add more invoice details as needed */}
      </Box>
    </ErrorBoundary>
  );
};

InvoiceDetails.propTypes = {
  invoiceId: PropTypes.string.isRequired,
  onBackToCustomerDetails: PropTypes.func.isRequired,
};

export default InvoiceDetails;
