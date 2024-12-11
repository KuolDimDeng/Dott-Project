import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
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
  BarElement,
  PointElement,
  LineElement,
  Title
);

const timeRanges = [
  { value: '1', label: '1 Month' },
  { value: '3', label: '3 Months' },
  { value: '6', label: '6 Months' },
  { value: '12', label: '1 Year' },
];

const formatAmount = (amount) => {
  return typeof amount === 'number' ? amount.toFixed(2) : 'N/A';
};

export default function SalesAnalysis() {
  const [timeRange, setTimeRange] = useState('3');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      const response = await axiosInstance.get(`/api/analysis/sales-data`, {
        params: { time_range: timeRange },
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      setError('Failed to fetch sales data. Please try again later.');
    }
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (!data) return <Typography>Loading...</Typography>;

  const salesOverTimeData = {
    labels: data.salesOverTime.map((item) => item.date),
    datasets: [
      {
        label: 'Sales',
        data: data.salesOverTime.map((item) => item.amount),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const topProductsData = {
    labels: data.topProducts.map((item) => item.product__name),
    datasets: [
      {
        data: data.topProducts.map((item) => item.sales),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
      },
    ],
  };

  const salesByCustomerData = {
    labels: data.salesByCustomer.map((item) => item.customer__customerName),
    datasets: [
      {
        label: 'Sales',
        data: data.salesByCustomer.map((item) => item.sales),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Sales Analysis
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

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="sales analysis tabs">
          <Tab label="Sales Over Time" />
          <Tab label="Top Products" />
          <Tab label="Sales by Customer" />
          <Tab label="Summary" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Sales Over Time
          </Typography>
          <Line data={salesOverTimeData} />
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Top Products
          </Typography>
          <Pie data={topProductsData} />
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Sales by Customer
          </Typography>
          <Bar data={salesByCustomerData} />
        </Paper>
      )}

      {activeTab === 3 && (
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Summary
          </Typography>
          <Typography>Total Sales: ${formatAmount(data.totalSales)}</Typography>
          <Typography>Average Order Value: ${formatAmount(data.averageOrderValue)}</Typography>
          <Typography>Number of Orders: {data.numberOfOrders}</Typography>
        </Paper>
      )}
    </Box>
  );
}
