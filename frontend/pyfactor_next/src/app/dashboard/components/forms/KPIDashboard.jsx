import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import axiosInstance from '@/lib/axiosConfig';;

const StyledTab = styled(Tab)(({ theme }) => ({
  '&.Mui-selected': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
    fontWeight: 'bold',
  },
  '&:hover': {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.common.white,
  },
}));

const KPIDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch user profile
      const profileResponse = await axiosInstance.get('/api/profile/');
      const userProfile = profileResponse.data;

      if (userProfile.is_onboarded) {
        // Fetch KPI data only if user is onboarded
        const kpiResponse = await axiosInstance.get('/api/analysis/kpi-data');
        setKpiData(kpiResponse.data);
      } else {
        setError('Onboarding not complete. KPI data not available.');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };


  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const kpis = [
    {
      title: 'Revenue Growth Rate',
      value: kpiData?.revenueGrowthRate,
      format: (value) => (typeof value === 'number' ? formatPercentage(value) : 'N/A'),
      description: 'Percentage increase in sales revenue over a specific period',
      color: theme.palette.success.main,
    },
    {
      title: 'Gross Profit Margin',
      value: kpiData?.grossProfitMargin,
      format: (value) => (typeof value === 'number' ? formatPercentage(value) : 'N/A'),
      description: 'Percentage of revenue that exceeds the cost of goods sold',
      color: theme.palette.info.main,
    },
    {
      title: 'Net Profit Margin',
      value: kpiData?.netProfitMargin,
      format: (value) => (typeof value === 'number' ? formatPercentage(value) : 'N/A'),
      description: 'Percentage of revenue left after all expenses are deducted',
      color: theme.palette.warning.main,
    },
    {
      title: 'Current Ratio',
      value: kpiData?.currentRatio,
      format: (value) => (typeof value === 'number' ? value.toFixed(2) : 'N/A'),
      description: "Company's ability to pay short-term obligations",
      color: theme.palette.secondary.main,
    },
    {
      title: 'Debt-to-Equity Ratio',
      value: kpiData?.debtToEquityRatio,
      format: (value) => (typeof value === 'number' ? value.toFixed(2) : 'N/A'),
      description: 'Proportion of debt used to finance assets relative to equity',
      color: theme.palette.error.main,
    },
    {
      title: 'Cash Flow',
      value: kpiData?.cashFlow,
      format: (value) => (typeof value === 'number' ? formatCurrency(value) : 'N/A'),
      description: 'Real-time tracking of cash inflows and outflows',
      color: theme.palette.primary.main,
    },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>
        KPI Dashboard
      </Typography>
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="KPI tabs"
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTabs-indicator': {
              backgroundColor: theme.palette.common.white,
            },
          }}
        >
          {kpis.map((kpi, index) => (
            <StyledTab 
              key={index} 
              label={kpi.title} 
              sx={{ 
                textTransform: 'none',
                borderRadius: '4px 4px 0 0',
                marginRight: '2px',
              }} 
            />
          ))}
        </Tabs>
      </Paper>
      {kpis.map((kpi, index) => (
        <TabPanel key={index} value={activeTab} index={index}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: kpi.color }}>
                    {kpi.title}
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', my: 2 }}>
                    {kpi.format(kpi.value)}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  {kpi.value > 0 ? (
                    <TrendingUpIcon sx={{ color: theme.palette.success.main, mr: 1 }} />
                  ) : (
                    <TrendingDownIcon sx={{ color: theme.palette.error.main, mr: 1 }} />
                  )}
                  <Typography variant="body2" color="textSecondary">
                    {kpi.description}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ p: 3, height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={kpiData?.historicalData?.[kpi.title.toLowerCase().replace(/ /g, '_')]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke={kpi.color} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      ))}
    </Box>
  );
};

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`kpi-tabpanel-${index}`}
      aria-labelledby={`kpi-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

export default KPIDashboard;