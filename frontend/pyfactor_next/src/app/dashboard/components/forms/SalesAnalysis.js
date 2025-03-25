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
  Card,
  CardContent,
  CardHeader,
  Divider,
  useTheme,
} from '@mui/material';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
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
  RadialLinearScale,
} from 'chart.js';
import { axiosInstance } from '@/lib/axiosConfig';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PeopleIcon from '@mui/icons-material/People';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  RadialLinearScale
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

const MetricCard = ({ title, value, icon, trend, trendValue, color }) => {
  const theme = useTheme();
  const TrendIcon = trend === 'up' ? TrendingUpIcon : TrendingDownIcon;
  const trendColor = trend === 'up' ? theme.palette.success.main : theme.palette.error.main;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" color="text.secondary">
            {title}
          </Typography>
          <Box sx={{ color: color || 'primary.main', backgroundColor: `${color || 'primary.main'}20`, p: 1, borderRadius: '50%' }}>
            {icon}
          </Box>
        </Box>
        <Typography variant="h4" component="div" fontWeight="bold">
          {value}
        </Typography>
        {trend && (
          <Box display="flex" alignItems="center" mt={1}>
            <TrendIcon sx={{ color: trendColor, fontSize: 18, mr: 0.5 }} />
            <Typography variant="body2" sx={{ color: trendColor }}>
              {trendValue}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default function SalesAnalysis() {
  const [timeRange, setTimeRange] = useState('3');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const theme = useTheme();

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

  if (!data) {
    // Mock data for development and demonstration
    setData({
      totalSales: 125436.78,
      previousPeriodSales: 115000.25,
      salesGrowth: 9.1,
      averageOrderValue: 245.67,
      previousAverageOrderValue: 220.32,
      aovGrowth: 11.5,
      numberOfOrders: 510,
      previousNumberOfOrders: 522,
      ordersGrowth: -2.3,
      activeCustomers: 350,
      previousActiveCustomers: 320,
      customersGrowth: 9.4,
      topProducts: [
        { product__name: 'Product A', sales: 12500 },
        { product__name: 'Product B', sales: 8700 },
        { product__name: 'Product C', sales: 6300 },
        { product__name: 'Product D', sales: 4100 },
        { product__name: 'Product E', sales: 3200 },
      ],
      salesByCustomer: [
        { customer__customerName: 'Customer 1', sales: 15000 },
        { customer__customerName: 'Customer 2', sales: 12000 },
        { customer__customerName: 'Customer 3', sales: 9500 },
        { customer__customerName: 'Customer 4', sales: 7800 },
        { customer__customerName: 'Customer 5', sales: 6200 },
      ],
      salesOverTime: Array.from({ length: 12 }, (_, i) => ({
        date: `${i + 1}/1/2023`,
        amount: 8000 + Math.random() * 4000
      })),
      salesByCategory: [
        { category: 'Electronics', sales: 35000 },
        { category: 'Furniture', sales: 22000 },
        { category: 'Clothing', sales: 18000 },
        { category: 'Books', sales: 12000 },
        { category: 'Other', sales: 8000 },
      ],
    });
    
    return <Typography>Loading...</Typography>;
  }

  const salesOverTimeData = {
    labels: data.salesOverTime.map((item) => item.date),
    datasets: [
      {
        label: 'Sales',
        data: data.salesOverTime.map((item) => item.amount),
        fill: true,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.4,
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
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
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
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const salesByCategoryData = {
    labels: data.salesByCategory ? data.salesByCategory.map((item) => item.category) : [],
    datasets: [
      {
        data: data.salesByCategory ? data.salesByCategory.map((item) => item.sales) : [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderWidth: 0,
      },
    ],
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Sales Dashboard</Typography>
        <FormControl sx={{ width: 200 }}>
          <InputLabel>Time Range</InputLabel>
          <Select value={timeRange} onChange={handleTimeRangeChange}>
            {timeRanges.map((range) => (
              <MenuItem key={range.value} value={range.value}>
                {range.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Sales"
            value={`$${formatAmount(data.totalSales)}`}
            icon={<AttachMoneyIcon />}
            trend={data.salesGrowth >= 0 ? 'up' : 'down'}
            trendValue={`${Math.abs(data.salesGrowth).toFixed(1)}% from last period`}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Average Order Value"
            value={`$${formatAmount(data.averageOrderValue)}`}
            icon={<ShoppingCartIcon />}
            trend={data.aovGrowth >= 0 ? 'up' : 'down'}
            trendValue={`${Math.abs(data.aovGrowth).toFixed(1)}% from last period`}
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Number of Orders"
            value={data.numberOfOrders}
            icon={<InventoryIcon />}
            trend={data.ordersGrowth >= 0 ? 'up' : 'down'}
            trendValue={`${Math.abs(data.ordersGrowth).toFixed(1)}% from last period`}
            color={theme.palette.warning.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Active Customers"
            value={data.activeCustomers}
            icon={<PeopleIcon />}
            trend={data.customersGrowth >= 0 ? 'up' : 'down'}
            trendValue={`${Math.abs(data.customersGrowth).toFixed(1)}% from last period`}
            color={theme.palette.info.main}
          />
        </Grid>
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="sales analysis tabs">
          <Tab label="Overview" />
          <Tab label="Products" />
          <Tab label="Customers" />
          <Tab label="Categories" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Sales Trend
              </Typography>
              <Line 
                data={salesOverTimeData} 
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                    title: {
                      display: false,
                    },
                  },
                }}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Top Products
              </Typography>
              <Doughnut 
                data={topProductsData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                    },
                  },
                }}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Sales by Category
              </Typography>
              <Pie 
                data={salesByCategoryData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                    },
                  },
                }}
              />
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Top Products
          </Typography>
          <Doughnut data={topProductsData} />
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Sales by Customer
          </Typography>
          <Bar 
            data={salesByCustomerData} 
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                },
              },
            }}
          />
        </Paper>
      )}

      {activeTab === 3 && (
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Sales by Category
          </Typography>
          <Pie data={salesByCategoryData} />
        </Paper>
      )}
    </Box>
  );
}
