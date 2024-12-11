import React, { useState, useEffect } from 'react';
import { Typography, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
} from 'chart.js';
import { axiosInstance } from '@/lib/axiosConfig';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

const timeRanges = [
  { value: '1', label: '1 Month' },
  { value: '6', label: '6 Months' },
  { value: '12', label: '1 Year' },
  { value: '60', label: '5 Years' },
  { value: 'all', label: 'All Time' },
];

const formatAmount = (amount) => {
  return typeof amount === 'number' ? amount.toFixed(2) : 'N/A';
};

export default function CashFlowAnalysis() {
  const [timeRange, setTimeRange] = useState('12');
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      const response = await axiosInstance.get(`/api/analysis/cash-flow-data`, {
        params: { time_granularity: timeRange },
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

  const latestData = data[data.length - 1];
  const operatingCashFlow = latestData.operating.total;
  const investingCashFlow = latestData.investing.total;
  const financingCashFlow = latestData.financing.total;

  const pieChartData = {
    labels: ['Operating', 'Investing', 'Financing'],
    datasets: [
      {
        data: [
          Math.abs(operatingCashFlow),
          Math.abs(investingCashFlow),
          Math.abs(financingCashFlow),
        ],
        backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
        hoverBackgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
      },
    ],
  };

  const lineChartData = {
    labels: data.map((item) => item.date),
    datasets: [
      {
        label: 'Operating Cash Flow',
        data: data.map((item) => item.operating.total),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
      {
        label: 'Investing Cash Flow',
        data: data.map((item) => item.investing.total),
        fill: false,
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1,
      },
      {
        label: 'Financing Cash Flow',
        data: data.map((item) => item.financing.total),
        fill: false,
        borderColor: 'rgb(255, 205, 86)',
        tension: 0.1,
      },
    ],
  };

  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Cash Flow Analysis
      </Typography>

      <FormControl fullWidth margin="normal">
        <InputLabel>Time Range</InputLabel>
        <Select value={timeRange} onChange={handleTimeRangeChange}>
          {timeRanges.map((range) => (
            <MenuItem key={range.value} value={range.value}>
              {range.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box display="flex" justifyContent="space-between" mt={4}>
        <Box width="45%">
          <Typography variant="h6" gutterBottom>
            Cash Flow Breakdown
          </Typography>
          <Pie data={pieChartData} />
        </Box>
        <Box width="45%">
          <Typography variant="h6" gutterBottom>
            Cash Flow Trends Over Time
          </Typography>
          <Line data={lineChartData} />
        </Box>
      </Box>

      <Typography variant="h6" mt={4}>
        Summary
      </Typography>
      <Typography>Operating Cash Flow: ${formatAmount(operatingCashFlow)}</Typography>
      <Typography>Investing Cash Flow: ${formatAmount(investingCashFlow)}</Typography>
      <Typography>Financing Cash Flow: ${formatAmount(financingCashFlow)}</Typography>
      <Typography>Net Cash Flow: ${formatAmount(netCashFlow)}</Typography>
    </Box>
  );
}
