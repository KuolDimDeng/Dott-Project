import React, { useState, useEffect } from 'react';
import { Typography, Box, FormControl, InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title } from 'chart.js';
import axiosInstance from '../components/axiosConfig';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

const timeRanges = [
  { value: '1', label: '1 Month' },
  { value: '3', label: '3 Months' },
  { value: '6', label: '6 Months' },
  { value: '12', label: '1 Year' },
];

const formatAmount = (amount) => {
  return typeof amount === 'number' ? amount.toFixed(2) : 'N/A';
};

const calculateVariance = (budgeted, actual) => {
  if (typeof budgeted !== 'number' || typeof actual !== 'number') return 'N/A';
  return ((actual - budgeted) / budgeted * 100).toFixed(2) + '%';
};

export default function BudgetVsActualAnalysis() {
  const [timeRange, setTimeRange] = useState('3');
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      const response = await axiosInstance.get(`/api/analysis/budget-vs-actual`, {
        params: { time_range: timeRange }
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  if (!data) return <Typography>Loading...</Typography>;

  const barChartData = {
    labels: data.map(item => item.account_name),
    datasets: [
      {
        label: 'Budgeted',
        data: data.map(item => item.budgeted_amount),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'Actual',
        data: data.map(item => item.actual_amount),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      },
    ],
  };

  const lineChartData = {
    labels: data.map(item => item.account_name),
    datasets: [
      {
        label: 'Variance %',
        data: data.map(item => ((item.actual_amount - item.budgeted_amount) / item.budgeted_amount * 100)),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Budget vs Actual Analysis</Typography>
      
      <FormControl fullWidth margin="normal">
        <InputLabel>Time Range</InputLabel>
        <Select value={timeRange} onChange={handleTimeRangeChange}>
          {timeRanges.map((range) => (
            <MenuItem key={range.value} value={range.value}>{range.label}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TableContainer component={Paper} sx={{ marginTop: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Account</TableCell>
              <TableCell align="right">Budgeted</TableCell>
              <TableCell align="right">Actual</TableCell>
              <TableCell align="right">Variance</TableCell>
              <TableCell align="right">Variance %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.account_name}</TableCell>
                <TableCell align="right">${formatAmount(item.budgeted_amount)}</TableCell>
                <TableCell align="right">${formatAmount(item.actual_amount)}</TableCell>
                <TableCell align="right">${formatAmount(item.actual_amount - item.budgeted_amount)}</TableCell>
                <TableCell align="right">{calculateVariance(item.budgeted_amount, item.actual_amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box display="flex" justifyContent="space-between" mt={4}>
        <Box width="45%">
          <Typography variant="h6" gutterBottom>Budget vs Actual Comparison</Typography>
          <Bar data={barChartData} />
        </Box>
        <Box width="45%">
          <Typography variant="h6" gutterBottom>Variance Trend</Typography>
          <Line data={lineChartData} />
        </Box>
      </Box>
    </Box>
  );
}