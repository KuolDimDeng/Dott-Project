import React, { useState } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const PreboardingForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    position: '',
    salary: '',
    start_date: null,
  });

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, start_date: date }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/api/create-preboarding-form/', formData);
      console.log('Preboarding form created:', response.data);
      // Show success message or redirect
    } catch (error) {
      console.error('Error creating preboarding form:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Create Preboarding Form</Typography>
      <form onSubmit={handleSubmit}>
        <TextField label="Email" name="email" value={formData.email} onChange={handleInputChange} fullWidth margin="normal" required />
        <TextField label="First Name" name="first_name" value={formData.first_name} onChange={handleInputChange} fullWidth margin="normal" required />
        <TextField label="Last Name" name="last_name" value={formData.last_name} onChange={handleInputChange} fullWidth margin="normal" required />
        <TextField label="Position" name="position" value={formData.position} onChange={handleInputChange} fullWidth margin="normal" required />
        <TextField label="Salary" name="salary" type="number" value={formData.salary} onChange={handleInputChange} fullWidth margin="normal" required />
        <DatePicker
          label="Start Date"
          value={formData.start_date}
          onChange={handleDateChange}
          renderInput={(params) => <TextField {...params} fullWidth margin="normal" required />}
        />
        <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
          Send Preboarding Form
        </Button>
      </form>
    </Box>
  );
};

export default PreboardingForm;