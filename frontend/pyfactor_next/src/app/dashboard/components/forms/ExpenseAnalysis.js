'use client';
import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
import { useToast } from '@/components/Toast/ToastProvider';

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

export default function ExpenseAnalysis() {
  const [timeRange, setTimeRange] = useState('3');
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const toast = useToast();

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      const response = await axiosInstance.get(`/api/analysis/expense-data`, {
        params: { time_range: timeRange },
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch expense data');
    }
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (!data) return <Typography>Loading...</Typography>;

  const expensesOverTimeData = {
    labels: data.expensesOverTime.map((item) => item.date),
    datasets: [
      {
        label: 'Expenses',
        data: data.expensesOverTime.map((item) => item.amount),
        fill: false,
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1,
      },
    ],
  };

  const expensesByCategoryData = {
    labels: data.expensesByCategory.map((item) => item.category),
    datasets: [
      {
        data: data.expensesByCategory.map((item) => item.amount),
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

  const expensesByVendorData = {
    labels: data.expensesByVendor.map((item) => item.vendor),
    datasets: [
      {
        label: 'Expenses',
        data: data.expensesByVendor.map((item) => item.amount),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Expense Analysis
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
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="expense analysis tabs">
          <Tab label="Expenses Over Time" />
          <Tab label="Expenses by Category" />
          <Tab label="Expenses by Vendor" />
          <Tab label="Summary" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Expenses Over Time
          </Typography>
          <Line data={expensesOverTimeData} />
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Expenses by Category
          </Typography>
          <Pie data={expensesByCategoryData} />
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Expenses by Vendor
          </Typography>
          <Bar data={expensesByVendorData} />
        </Box>
      )}

      {activeTab === 3 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Summary
          </Typography>
          <Typography>Total Expenses: ${formatAmount(data.totalExpenses)}</Typography>
          <Typography>Average Expense: ${formatAmount(data.averageExpense)}</Typography>
          <Typography>Number of Expenses: {data.numberOfExpenses}</Typography>
        </Box>
      )}
    </Paper>
  );
}
