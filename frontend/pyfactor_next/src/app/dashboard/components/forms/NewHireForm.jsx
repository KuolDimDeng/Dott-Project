import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import axiosInstance from '../components/axiosConfig';

const NewHireForm = () => {
  const { formId } = useParams();
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    social_security_number: '',
    bank_account_number: '',
    // Add other necessary fields
  });

  useEffect(() => {
    // Fetch preboarding form data
    const fetchPreboardingForm = async () => {
      try {
        const response = await axiosInstance.get(`/api/preboarding-form/${formId}/`);
        setFormData(prev => ({ ...prev, email: response.data.email, first_name: response.data.first_name, last_name: response.data.last_name }));
      } catch (error) {
        console.error('Error fetching preboarding form:', error);
      }
    };
    fetchPreboardingForm();
  }, [formId]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/api/submit-new-hire-info/', formData);
      console.log('New hire info submitted:', response.data);
      // Show success message or redirect
    } catch (error) {
      console.error('Error submitting new hire info:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Complete Your Information</Typography>
      <form onSubmit={handleSubmit}>
        <TextField label="Email" name="email" value={formData.email} onChange={handleInputChange} fullWidth margin="normal" required disabled />
        <TextField label="First Name" name="first_name" value={formData.first_name} onChange={handleInputChange} fullWidth margin="normal" required />
        <TextField label="Last Name" name="last_name" value={formData.last_name} onChange={handleInputChange} fullWidth margin="normal" required />
        <TextField label="Social Security Number" name="social_security_number" value={formData.social_security_number} onChange={handleInputChange} fullWidth margin="normal" required />
        <TextField label="Bank Account Number" name="bank_account_number" value={formData.bank_account_number} onChange={handleInputChange} fullWidth margin="normal" required />
        {/* Add other necessary fields */}
        <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
          Submit Information
        </Button>
      </form>
    </Box>
  );
};

export default NewHireForm;