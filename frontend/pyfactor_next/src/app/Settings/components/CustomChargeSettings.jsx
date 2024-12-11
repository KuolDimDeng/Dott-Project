// In BusinessSettings.jsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApi } from '@/lib/axiosConfig';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const CustomChargeSettings = () => {
  const [customPlans, setCustomPlans] = useState([]);
  const [newPlan, setNewPlan] = useState({ name: '', quantity: 0, unit: '', period: '', price: 0 });
  const { addMessage } = useUserMessageContext();

  useEffect(() => {
    fetchCustomPlans();
  }, []);

  const fetchCustomPlans = async () => {
    try {
      const response = await useApi.get('/api/custom-charge-plans/');
      setCustomPlans(response.data);
    } catch (error) {
      addMessage('error', 'Error fetching custom charge plans');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPlan((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreatePlan = async () => {
    try {
      await useApi.post('/api/custom-charge-plans/', newPlan);
      addMessage('success', 'Custom charge plan created successfully');
      fetchCustomPlans();
      setNewPlan({ name: '', quantity: 0, unit: '', period: '', price: 0 });
    } catch (error) {
      addMessage('error', 'Error creating custom charge plan');
    }
  };

  const handleDeletePlan = async (planId) => {
    try {
      await useApi.delete(`/api/custom-charge-plans/${planId}/`);
      addMessage('success', 'Custom charge plan deleted successfully');
      fetchCustomPlans();
    } catch (error) {
      addMessage('error', 'Error deleting custom charge plan');
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Custom Charge Settings
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Plan Name"
            name="name"
            value={newPlan.name}
            onChange={handleInputChange}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Quantity"
            name="quantity"
            type="number"
            value={newPlan.quantity}
            onChange={handleInputChange}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Unit"
            name="unit"
            value={newPlan.unit}
            onChange={handleInputChange}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Period"
            name="period"
            value={newPlan.period}
            onChange={handleInputChange}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Price"
            name="price"
            type="number"
            value={newPlan.price}
            onChange={handleInputChange}
          />
        </Grid>
        <Grid item xs={12}>
          <Button variant="contained" onClick={handleCreatePlan}>
            Create Custom Plan
          </Button>
        </Grid>
      </Grid>
      <List>
        {customPlans.map((plan) => (
          <ListItem
            key={plan.id}
            secondaryAction={
              <IconButton edge="end" aria-label="delete" onClick={() => handleDeletePlan(plan.id)}>
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemText
              primary={plan.name}
              secondary={`${plan.quantity} ${plan.unit} per ${plan.period} - $${plan.price}`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default CustomChargeSettings;
