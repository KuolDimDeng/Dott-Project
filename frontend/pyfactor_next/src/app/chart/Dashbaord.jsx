// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/chart/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import axios from 'axios';
import ChartComponent from './ChartComponent';

const Dashboard = () => {
  const [date, setDate] = useState('');
  const [account, setAccount] = useState('');
  const [chartType, setChartType] = useState('line');
  const [chartData, setChartData] = useState([]);

  const fetchData = async () => {
    try {
      const response = await axios.get('/api/chart/transactions/', {
        params: { account, date },
      });
      setChartData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    if (account && date) {
      fetchData();
    }
  }, [account, date]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <TextField
            type="date"
            label="Select Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Select Account</InputLabel>
            <Select value={account} onChange={(e) => setAccount(e.target.value)}>
              <MenuItem value="sales">Sales</MenuItem>
              <MenuItem value="expenses">Expenses</MenuItem>
              {/* Add more account options here */}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Chart Type</InputLabel>
            <Select value={chartType} onChange={(e) => setChartType(e.target.value)}>
              <MenuItem value="line">Line</MenuItem>
              <MenuItem value="bar">Bar</MenuItem>
              <MenuItem value="pie">Pie</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <Button variant="contained" color="primary" onClick={fetchData}>
            Update Chart
          </Button>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box height={400}>
            <ChartComponent data={chartData} type={chartType} />
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box height={400}>{/* Additional charts can be rendered here */}</Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
