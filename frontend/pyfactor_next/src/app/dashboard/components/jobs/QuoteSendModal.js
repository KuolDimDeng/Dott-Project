'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  FormControl,
  FormLabel,
  Checkbox,
  Stack,
  Alert,
  CircularProgress,
  Typography
} from '@mui/material';
import { 
  EmailOutlined, 
  WhatsApp, 
  Print,
  Send
} from '@mui/icons-material';
import jobsApi from '@/app/utils/api/jobsApi';

const QuoteSendModal = ({ open, onClose, job, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    send_via: 'email',
    email_address: job?.customer?.email || '',
    phone_number: job?.customer?.phone || '',
    include_terms: true
  });

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await jobsApi.sendQuote(job.id, formData);
      
      if (formData.send_via === 'print') {
        // Handle PDF download
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quote_${job.job_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      
      onSuccess && onSuccess(response.data);
      onClose();
    } catch (err) {
      console.error('Error sending quote:', err);
      setError(err.response?.data?.error || 'Failed to send quote');
    } finally {
      setLoading(false);
    }
  };

  const isValid = () => {
    if (formData.send_via === 'email' || formData.send_via === 'both') {
      if (!formData.email_address) return false;
    }
    if (formData.send_via === 'whatsapp' || formData.send_via === 'both') {
      if (!formData.phone_number) return false;
    }
    return true;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Send Quote</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          
          <Typography variant="body2" color="text.secondary">
            Quote #{job?.job_number} - {job?.name}
          </Typography>
          
          <FormControl component="fieldset">
            <FormLabel component="legend">Send Via</FormLabel>
            <RadioGroup
              value={formData.send_via}
              onChange={(e) => setFormData({ ...formData, send_via: e.target.value })}
            >
              <FormControlLabel 
                value="email" 
                control={<Radio />} 
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <EmailOutlined />
                    <span>Email</span>
                  </Stack>
                } 
              />
              <FormControlLabel 
                value="whatsapp" 
                control={<Radio />} 
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <WhatsApp />
                    <span>WhatsApp</span>
                  </Stack>
                } 
              />
              <FormControlLabel 
                value="both" 
                control={<Radio />} 
                label="Email & WhatsApp" 
              />
              <FormControlLabel 
                value="print" 
                control={<Radio />} 
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Print />
                    <span>Download PDF</span>
                  </Stack>
                } 
              />
            </RadioGroup>
          </FormControl>
          
          {(formData.send_via === 'email' || formData.send_via === 'both') && (
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              value={formData.email_address}
              onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
              required
              helperText="Customer email will be used if left empty"
            />
          )}
          
          {(formData.send_via === 'whatsapp' || formData.send_via === 'both') && (
            <TextField
              label="Phone Number"
              fullWidth
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              required
              helperText="Include country code (e.g., +1234567890)"
            />
          )}
          
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.include_terms}
                onChange={(e) => setFormData({ ...formData, include_terms: e.target.checked })}
              />
            }
            label="Include Terms & Conditions"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !isValid()}
          startIcon={loading ? <CircularProgress size={20} /> : <Send />}
        >
          {loading ? 'Sending...' : 'Send Quote'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuoteSendModal;