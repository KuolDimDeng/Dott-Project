// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/chart/ChartContainer.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import { ChromePicker } from 'react-color';
import ChartComponent from './ChartComponents';

const ChartContainer = () => {
  const [account, setAccount] = useState('');
  const [dateRange, setDateRange] = useState('day');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [chartType, setChartType] = useState('line');
  const [lineColor, setLineColor] = useState('#4BC0C0');
  const [barColor, setBarColor] = useState('#4BC0C0');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Set default dates
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  const handleColorChange = (color) => {
    if (chartType === 'line') {
      setLineColor(color.hex);
    } else {
      setBarColor(color.hex);
    }
  };

  const handleSubmit = () => {
    setIsLoading(true);
    setError(null);
    // Here you would typically fetch data based on the selected options
    // For now, we'll just simulate a delay
    setTimeout(() => {
      setIsLoading(false);
      // Simulating a potential error
      // if (Math.random() > 0.8) {
      //   setError("An error occurred while fetching data. Please try again.");
      // }
    }, 1000);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
      <Typography variant="h4" component="h2" gutterBottom>
        Sales Analysis
      </Typography>

      <FormControl fullWidth>
        <InputLabel>Account</InputLabel>
        <Select value={account} onChange={(e) => setAccount(e.target.value)}>
          <MenuItem value="">All Accounts</MenuItem>
          <MenuItem value="Sales">Sales</MenuItem>
          <MenuItem value="Expenses">Expenses</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel>Date Range</InputLabel>
        <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
          <MenuItem value="day">Daily</MenuItem>
          <MenuItem value="month">Monthly</MenuItem>
          <MenuItem value="year">Yearly</MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="Start Date"
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
      />

      <TextField
        label="End Date"
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
      />

      <FormControl fullWidth>
        <InputLabel>Chart Type</InputLabel>
        <Select value={chartType} onChange={(e) => setChartType(e.target.value)}>
          <MenuItem value="line">Line Chart</MenuItem>
          <MenuItem value="bar">Bar Chart</MenuItem>
          <MenuItem value="pie">Pie Chart</MenuItem>
        </Select>
      </FormControl>

      <Button onClick={() => setShowColorPicker(!showColorPicker)}>
        {showColorPicker ? 'Hide' : 'Show'} Color Picker
      </Button>

      {showColorPicker && (
        <ChromePicker
          color={chartType === 'line' ? lineColor : barColor}
          onChange={handleColorChange}
        />
      )}

      <Button onClick={handleSubmit} variant="contained" color="primary">
        Apply Changes
      </Button>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ color: 'error.main', my: 2 }}>{error}</Box>
      ) : (
        <Box sx={{ height: 400, my: 2 }}>
          <ChartComponent
            account={account}
            dateRange={dateRange}
            startDate={startDate}
            endDate={endDate}
            chartType={chartType}
            lineColor={lineColor}
            barColor={barColor}
          />
        </Box>
      )}
    </Box>
  );
};

export default ChartContainer;
