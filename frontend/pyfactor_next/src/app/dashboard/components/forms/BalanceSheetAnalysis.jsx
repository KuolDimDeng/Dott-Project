import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
} from '@mui/material';
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

export default function BalanceSheetAnalysis() {
  const [timeRange, setTimeRange] = useState('12');
  const [data, setData] = useState(null);
  const theme = useTheme();

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      const response = await axiosInstance.get(`/api/analysis/balance-sheet-data`, {
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
  const totalAssets = latestData.assets.total;
  const totalLiabilities = latestData.liabilities.total;
  const totalEquity = latestData.equity.total;

  const pieChartData = {
    labels: ['Assets', 'Liabilities', 'Equity'],
    datasets: [
      {
        data: [totalAssets, totalLiabilities, totalEquity],
        backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
        hoverBackgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
      },
    ],
  };

  const lineChartData = {
    labels: data.map((item) => item.date),
    datasets: [
      {
        label: 'Assets',
        data: data.map((item) => item.assets.total),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
      {
        label: 'Liabilities',
        data: data.map((item) => item.liabilities.total),
        fill: false,
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1,
      },
      {
        label: 'Equity',
        data: data.map((item) => item.equity.total),
        fill: false,
        borderColor: 'rgb(255, 205, 86)',
        tension: 0.1,
      },
    ],
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Typography variant="h4" gutterBottom>
        Balance Sheet Analysis
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
            Balance Sheet Breakdown
          </Typography>
          <Pie data={pieChartData} />
        </Box>
        <Box width="45%">
          <Typography variant="h6" gutterBottom>
            Balance Sheet Trends Over Time
          </Typography>
          <Line data={lineChartData} />
        </Box>
      </Box>

      <Typography variant="h6" mt={4}>
        Summary
      </Typography>
      <Typography>Total Assets: ${formatAmount(totalAssets)}</Typography>
      <Typography>Total Liabilities: ${formatAmount(totalLiabilities)}</Typography>
      <Typography>Total Equity: ${formatAmount(totalEquity)}</Typography>
      <Typography>Debt to Equity Ratio: {formatAmount(totalLiabilities / totalEquity)}</Typography>
    </Box>
  );
}
