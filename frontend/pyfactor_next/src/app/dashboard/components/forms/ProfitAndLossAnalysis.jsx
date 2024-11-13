import React, { useState, useEffect } from 'react';
import { Typography, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title } from 'chart.js';
import axiosInstance from '@/lib/axiosConfig';;

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

const timeRanges = [
  { value: '1', label: '1 Month' },
  { value: '6', label: '6 Months' },
  { value: '12', label: '1 Year' },
  { value: '60', label: '5 Years' },
  { value: 'all', label: 'All Time' },
];

export default function ProfitAndLossAnalysis() {
  const [timeRange, setTimeRange] = useState('12');
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      const response = await axiosInstance.get(`/api/analysis/financial-data/get_chart_data`, {
        params: {
          x_axis: 'date',
          y_axis: 'sales',
          time_granularity: timeRange
        }
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

  // Calculate totals
  const totalRevenue = data.reduce((sum, item) => sum + item.sales, 0);
  const totalCOGS = data.reduce((sum, item) => sum + item.cogs, 0);
  const totalOperatingExpenses = data.reduce((sum, item) => sum + item.operating_expenses, 0);
  const netIncome = totalRevenue - totalCOGS - totalOperatingExpenses;

  const pieChartData = {
    labels: ['Revenue', 'Cost of Goods Sold', 'Operating Expenses'],
    datasets: [
      {
        data: [totalRevenue, totalCOGS, totalOperatingExpenses],
        backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
        hoverBackgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
      },
    ],
  };

  const lineChartData = {
    labels: data.map(item => item.date),
    datasets: [
      {
        label: 'Revenue',
        data: data.map(item => item.sales),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
      {
        label: 'Cost of Goods Sold',
        data: data.map(item => item.cogs),
        fill: false,
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1,
      },
      {
        label: 'Operating Expenses',
        data: data.map(item => item.operating_expenses),
        fill: false,
        borderColor: 'rgb(255, 205, 86)',
        tension: 0.1,
      },
    ],
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Profit & Loss Analysis</Typography>
      
      <FormControl fullWidth margin="normal">
        <InputLabel>Time Range</InputLabel>
        <Select value={timeRange} onChange={handleTimeRangeChange}>
          {timeRanges.map((range) => (
            <MenuItem key={range.value} value={range.value}>{range.label}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box display="flex" justifyContent="space-between" mt={4}>
        <Box width="45%">
          <Typography variant="h6" gutterBottom>Profit & Loss Breakdown</Typography>
          <Pie data={pieChartData} />
        </Box>
        <Box width="45%">
          <Typography variant="h6" gutterBottom>Financial Trends Over Time</Typography>
          <Line data={lineChartData} />
        </Box>
      </Box>

      <Typography variant="h6" mt={4}>Summary</Typography>
      <Typography>Total Revenue: ${totalRevenue.toFixed(2)}</Typography>
      <Typography>Total Cost of Goods Sold: ${totalCOGS.toFixed(2)}</Typography>
      <Typography>Total Operating Expenses: ${totalOperatingExpenses.toFixed(2)}</Typography>
      <Typography>Net Income: ${netIncome.toFixed(2)}</Typography>
    </Box>
  );
}