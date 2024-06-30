///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/AnalysisPage.jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Select, MenuItem, Box, Grid } from '@mui/material';
import axios from 'axios';

const AnalysisPage = () => {
  const [chartData, setChartData] = useState([]);
  const [xAxis, setXAxis] = useState('date');
  const [yAxis, setYAxis] = useState('sales');
  const [timeGranularity, setTimeGranularity] = useState('month');
  const [chartType, setChartType] = useState('line');

  useEffect(() => {
    fetchChartData();
  }, [xAxis, yAxis, timeGranularity]);

  const fetchChartData = async () => {
    try {
      const response = await axios.get('/api/analysis/financial-data/get_chart_data/', {
        params: { x_axis: xAxis, y_axis: yAxis, time_granularity: timeGranularity }
      });
      setChartData(response.data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart width={600} height={300} data={chartData}>
            <XAxis dataKey="period" />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#8884d8" />
          </LineChart>
        );
      // Add more chart types as needed
      default:
        return null;
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Select
            value={xAxis}
            onChange={(e) => setXAxis(e.target.value)}
            fullWidth
          >
            <MenuItem value="date">Date</MenuItem>
            {/* Add more x-axis options */}
          </Select>
        </Grid>
        <Grid item xs={12} md={4}>
          <Select
            value={yAxis}
            onChange={(e) => setYAxis(e.target.value)}
            fullWidth
          >
            <MenuItem value="sales">Sales</MenuItem>
            <MenuItem value="expenses">Expenses</MenuItem>
            <MenuItem value="profit">Profit</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={12} md={4}>
          <Select
            value={timeGranularity}
            onChange={(e) => setTimeGranularity(e.target.value)}
            fullWidth
          >
            <MenuItem value="month">Month</MenuItem>
            <MenuItem value="year">Year</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={12} md={4}>
          <Select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            fullWidth
          >
            <MenuItem value="line">Line Chart</MenuItem>
            {/* Add more chart type options */}
          </Select>
        </Grid>
        <Grid item xs={12}>
          {renderChart()}
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalysisPage;