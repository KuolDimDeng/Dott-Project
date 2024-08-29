// UserProfileSettings.jsx
'use client'
import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Grid, Avatar, Switch, FormControlLabel, Tabs, Tab } from '@mui/material';
import axiosInstance from '@/app/dashboard/components/components/axiosConfig';

const UserProfileSettings = ({ userData, onUpdate }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [formData, setFormData] = useState({
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      occupation: '',
      receive_notifications: true,
      two_factor_auth: false,
      language: 'en',
      timezone: 'UTC',
    });
  
    useEffect(() => {
      if (userData) {
        setFormData({
          ...formData,
          ...userData,
        });
      }
    }, [userData]);
  
    const handleChange = (event) => {
      const { name, value, checked } = event.target;
      setFormData({
        ...formData,
        [name]: name === 'receive_notifications' || name === 'two_factor_auth' ? checked : value,
      });
    };
  
    const handleSubmit = async (event) => {
      event.preventDefault();
      try {
        const response = await axiosInstance.put('/api/profile/update/', formData);
        if (response.status === 200) {
          onUpdate(response.data);
        }
      } catch (error) {
        console.error('Error updating profile:', error);
      }
    };
  
    const handleTabChange = (event, newValue) => {
      setActiveTab(newValue);
    };
  
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h4" gutterBottom>
          User Profile Settings
        </Typography>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="Personal Info" />
          <Tab label="Account Settings" />
          <Tab label="Privacy & Security" />
        </Tabs>
        {activeTab === 0 && (
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Occupation"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
            <Button type="submit" variant="contained" sx={{ mt: 3 }}>
              Save Changes
            </Button>
          </Box>
        )}
        {activeTab === 1 && (
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Language"
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  select
                  SelectProps={{ native: true }}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Timezone"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  select
                  SelectProps={{ native: true }}
                >
                  <option value="UTC">UTC</option>
                  <option value="EST">EST</option>
                  <option value="PST">PST</option>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.receive_notifications}
                      onChange={handleChange}
                      name="receive_notifications"
                    />
                  }
                  label="Receive Notifications"
                />
              </Grid>
            </Grid>
            <Button variant="contained" onClick={handleSubmit} sx={{ mt: 3 }}>
              Save Changes
            </Button>
          </Box>
        )}
        {activeTab === 2 && (
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.two_factor_auth}
                      onChange={handleChange}
                      name="two_factor_auth"
                    />
                  }
                  label="Enable Two-Factor Authentication"
                />
              </Grid>
              <Grid item xs={12}>
                <Button variant="outlined" color="secondary">
                  Change Password
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button variant="outlined" color="secondary">
                  Export Personal Data
                </Button>
              </Grid>
            </Grid>
            <Button variant="contained" onClick={handleSubmit} sx={{ mt: 3 }}>
              Save Changes
            </Button>
          </Box>
        )}
      </Box>
    );
  };
  
  export default UserProfileSettings;