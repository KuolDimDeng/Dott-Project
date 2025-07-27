'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Alert,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Box,
  CircularProgress,
  Divider,
  InputAdornment
} from '@mui/material';
import {
  CreditCard,
  AccountBalance,
  PhoneAndroid,
  Payment,
  CheckCircle
} from '@mui/icons-material';
import jobsApi from '@/app/utils/api/jobsApi';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const JobPaymentCollection = ({ open, onClose, job, invoice, onPaymentSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [userCountry, setUserCountry] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // Determine if customer is in Kenya
  useEffect(() => {
    if (job?.customer) {
      // Check customer country from job location or customer profile
      const country = job.job_country || job.customer.country || '';
      setUserCountry(country.toLowerCase());
      
      // Default to M-Pesa if in Kenya
      if (country.toLowerCase() === 'kenya' || country.toLowerCase() === 'ke') {
        setPaymentMethod('mpesa');
      }
    }
  }, [job]);

  const isKenyan = userCountry === 'kenya' || userCountry === 'ke';
  const paymentAmount = invoice?.total_amount || job?.final_amount || job?.quoted_amount || 0;

  const handleStripePayment = async () => {
    setLoading(true);
    setError('');

    try {
      // Create payment session
      const response = await jobsApi.createPaymentSession(job.id, {
        amount: paymentAmount,
        invoice_id: invoice?.id,
        payment_method: 'stripe',
        success_url: `${window.location.origin}/dashboard/jobs/${job.id}/payment-success`,
        cancel_url: `${window.location.origin}/dashboard/jobs/${job.id}`
      });

      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({
        sessionId: response.data.session_id
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Stripe payment error:', err);
      setError('Failed to process payment. Please try again.');
      setLoading(false);
    }
  };

  const handleMpesaPayment = async () => {
    if (!mpesaPhone) {
      setError('Please enter your M-Pesa phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Initiate M-Pesa payment
      const response = await jobsApi.initiateMpesaPayment(job.id, {
        phone_number: mpesaPhone,
        amount: paymentAmount,
        invoice_id: invoice?.id,
        account_reference: `JOB-${job.job_number}`,
        transaction_desc: `Payment for ${job.name}`
      });

      if (response.data.success) {
        setPaymentSuccess(true);
        // Poll for payment confirmation or show instructions
        Alert.success('STK Push sent! Please check your phone and enter your M-Pesa PIN to complete payment.');
        
        // Start polling for payment confirmation
        pollMpesaStatus(response.data.checkout_request_id);
      } else {
        throw new Error(response.data.message || 'M-Pesa payment failed');
      }
    } catch (err) {
      console.error('M-Pesa payment error:', err);
      setError(err.response?.data?.message || 'Failed to initiate M-Pesa payment');
      setLoading(false);
    }
  };

  const pollMpesaStatus = async (checkoutRequestId) => {
    let attempts = 0;
    const maxAttempts = 30; // Poll for 30 seconds
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await jobsApi.checkMpesaStatus(checkoutRequestId);
        
        if (response.data.status === 'completed') {
          clearInterval(pollInterval);
          setPaymentSuccess(true);
          onPaymentSuccess && onPaymentSuccess(response.data);
        } else if (response.data.status === 'failed') {
          clearInterval(pollInterval);
          setError('Payment failed. Please try again.');
          setLoading(false);
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setError('Payment timeout. Please check your M-Pesa messages.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error polling M-Pesa status:', err);
      }
    }, 1000);
  };

  const handleBankTransfer = async () => {
    setLoading(true);
    setError('');

    try {
      // Generate bank transfer instructions
      const response = await jobsApi.getBankTransferInstructions(job.id, {
        amount: paymentAmount,
        invoice_id: invoice?.id
      });

      // Show bank details in a new modal or alert
      const bankDetails = response.data;
      alert(`
        Bank Transfer Instructions:
        
        Bank: ${bankDetails.bank_name}
        Account Name: ${bankDetails.account_name}
        Account Number: ${bankDetails.account_number}
        Amount: ${bankDetails.currency} ${bankDetails.amount}
        Reference: ${bankDetails.reference}
        
        Please use the reference number when making the transfer.
      `);
      
      onClose();
    } catch (err) {
      console.error('Bank transfer error:', err);
      setError('Failed to get bank transfer details');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    switch (paymentMethod) {
      case 'card':
        handleStripePayment();
        break;
      case 'mpesa':
        handleMpesaPayment();
        break;
      case 'bank':
        handleBankTransfer();
        break;
      default:
        setError('Please select a payment method');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Collect Payment
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          
          {paymentSuccess ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Payment Successful!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The payment has been processed successfully.
              </Typography>
              <Button
                variant="contained"
                onClick={onClose}
                sx={{ mt: 3 }}
              >
                Close
              </Button>
            </Box>
          ) : (
            <>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Payment Details
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    Job: #{job?.job_number} - {job?.name}
                  </Typography>
                  <Typography variant="body2">
                    Customer: {job?.customer_name}
                  </Typography>
                  <Typography variant="h5" color="primary">
                    Amount: ${paymentAmount.toFixed(2)}
                  </Typography>
                </Stack>
              </Box>
              
              <Divider />
              
              <FormControl component="fieldset">
                <FormLabel component="legend">Payment Method</FormLabel>
                <RadioGroup
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <FormControlLabel
                    value="card"
                    control={<Radio />}
                    label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CreditCard />
                        <span>Credit/Debit Card</span>
                      </Stack>
                    }
                  />
                  
                  {isKenyan && (
                    <FormControlLabel
                      value="mpesa"
                      control={<Radio />}
                      label={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PhoneAndroid />
                          <span>M-Pesa</span>
                          <Typography variant="caption" color="success.main">
                            (Kenya only)
                          </Typography>
                        </Stack>
                      }
                    />
                  )}
                  
                  <FormControlLabel
                    value="bank"
                    control={<Radio />}
                    label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <AccountBalance />
                        <span>Bank Transfer</span>
                      </Stack>
                    }
                  />
                </RadioGroup>
              </FormControl>
              
              {paymentMethod === 'mpesa' && (
                <TextField
                  fullWidth
                  label="M-Pesa Phone Number"
                  placeholder="e.g., 254712345678"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">+</InputAdornment>
                  }}
                  helperText="Enter your Safaricom number without the country code"
                />
              )}
              
              {paymentMethod === 'card' && (
                <Alert severity="info">
                  You will be redirected to a secure payment page to complete your card payment.
                </Alert>
              )}
              
              {paymentMethod === 'bank' && (
                <Alert severity="info">
                  You will receive bank transfer instructions after clicking proceed.
                </Alert>
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      {!paymentSuccess && (
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            variant="contained"
            disabled={loading || (paymentMethod === 'mpesa' && !mpesaPhone)}
            startIcon={loading ? <CircularProgress size={20} /> : <Payment />}
          >
            {loading ? 'Processing...' : 'Proceed to Payment'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default JobPaymentCollection;