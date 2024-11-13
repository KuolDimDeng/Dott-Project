import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Switch, FormControlLabel } from '@mui/material';
import { useParams } from 'react-router-dom';
import axiosInstance from '@/lib/axiosConfig';;

const VerifyEmployee = () => {
  const { employeeId } = useParams();
  const [employeeData, setEmployeeData] = useState({});
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const response = await axiosInstance.get(`/api/employee/${employeeId}/`);
        setEmployeeData(response.data);
      } catch (error) {
        console.error('Error fetching employee data:', error);
      }
    };
    fetchEmployeeData();
  }, [employeeId]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setEmployeeData(prev => ({ ...prev, [name]: value }));
  };

  const handleVerifyToggle = () => {
    setVerified(!verified);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.put(`/api/employee/${employeeId}/`, employeeData);
      if (verified) {
        await axiosInstance.post(`/api/verify-and-onboard/${employeeId}/`);
      }
      console.log('Employee verified and onboarded');
      // Show success message or redirect
    } catch (error) {
      console.error('Error verifying employee:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Verify Employee Information</Typography>
      <form onSubmit={handleSubmit}>
        {/* Add all the necessary fields from employeeData */}
        <TextField label="First Name" name="first_name" value={employeeData.first_name} onChange={handleInputChange} fullWidth margin="normal" />
        <TextField label="Last Name" name="last_name" value={employeeData.last_name} onChange={handleInputChange} fullWidth margin="normal" />
        {/* Add other fields */}
        <FormControlLabel
          control={<Switch checked={verified} onChange={handleVerifyToggle} />}
          label="Verify and Onboard"
        />
        <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
          {verified ? 'Verify and Onboard' : 'Save Changes'}
        </Button>
      </form>
    </Box>
  );
};

export default VerifyEmployee;