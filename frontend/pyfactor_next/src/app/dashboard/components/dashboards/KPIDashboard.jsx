'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  CardHeader,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  ButtonGroup,
  Tabs,
  Tab,
  useTheme
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ReceiptIcon from '@mui/icons-material/Receipt';

// Mock data for charts
const generateMockData = (months = 12, min = 5000, max = 50000, trend = 'up') => {
  const result = [];
  let current = Math.floor(Math.random() * (max - min)) + min;
  
  for (let i = 0; i < months; i++) {
    // Apply trend direction
    const change = Math.floor(Math.random() * (max * 0.1));
    if (trend === 'up') {
      current += change;
    } else if (trend === 'down') {
      current -= change;
    } else {
      // Random fluctuation
      current += (Math.random() > 0.5 ? 1 : -1) * change;
    }
    
    // Ensure within bounds
    current = Math.max(min, Math.min(max, current));
    
    result.push({
      month: new Date(2023, i, 1).toLocaleString('default', { month: 'short' }),
      value: current,
    });
  }
  
  return result;
};

// Mock financial data
const financialData = {
  cashFlow: {
    inflows: generateMockData(12, 15000, 45000, 'up'),
    outflows: generateMockData(12, 10000, 35000, 'random'),
    net: generateMockData(12, 5000, 20000, 'up'),
  },
  profitLoss: {
    revenue: generateMockData(12, 25000, 75000, 'up'),
    expenses: generateMockData(12, 20000, 55000, 'random'),
    profit: generateMockData(12, 5000, 25000, 'up'),
  },
  balanceSheet: {
    assets: generateMockData(12, 100000, 250000, 'up'),
    liabilities: generateMockData(12, 50000, 120000, 'random'),
    equity: generateMockData(12, 50000, 130000, 'up'),
  },
};

// Simple Bar Chart component
const BarChart = ({ data, xKey, yKey, height = 200, color = '#2196f3' }) => {
  if (!data || !data.length) return null;
  
  const maxValue = Math.max(...data.map(item => item[yKey]));
  const chartWidth = 100 / data.length;
  
  return (
    <Box sx={{ height: height, position: 'relative', mt: 4 }}>
      {/* Y-axis labels */}
      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 20, width: 40, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ transform: 'translateY(-50%)' }}>
          ${maxValue.toLocaleString()}
        </Typography>
        <Typography variant="caption" sx={{ transform: 'translateY(50%)' }}>
          $0
        </Typography>
      </Box>
      
      {/* Chart area */}
      <Box sx={{ height: '100%', ml: 5, display: 'flex', alignItems: 'flex-end' }}>
        {data.map((item, index) => (
          <Box key={index} sx={{ width: `${chartWidth}%`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box 
              sx={{ 
                width: '60%', 
                height: `${(item[yKey] / maxValue) * 100}%`, 
                backgroundColor: color,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                minHeight: 1,
                transition: 'height 0.3s ease',
              }} 
            />
            <Typography variant="caption" sx={{ mt: 1 }}>
              {item[xKey]}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// Line Chart component
const LineChart = ({ datasets, height = 200 }) => {
  if (!datasets || !datasets.length || !datasets[0].data.length) return null;
  
  const allValues = datasets.flatMap(dataset => dataset.data.map(item => item.value));
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = maxValue - minValue;
  const padding = range * 0.1;
  
  const normalizedMax = maxValue + padding;
  const normalizedMin = Math.max(0, minValue - padding);
  const normalizedRange = normalizedMax - normalizedMin;
  
  const xLabels = datasets[0].data.map(d => d.month);
  const pointWidth = 100 / (xLabels.length - 1);
  
  const getYPosition = (value) => {
    return 100 - ((value - normalizedMin) / normalizedRange) * 100;
  };
  
  return (
    <Box sx={{ height: height, position: 'relative', mt: 4 }}>
      {/* Y-axis labels */}
      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 20, width: 40, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ transform: 'translateY(-50%)' }}>
          ${normalizedMax.toLocaleString()}
        </Typography>
        <Typography variant="caption" sx={{ transform: 'translateY(50%)' }}>
          ${normalizedMin.toLocaleString()}
        </Typography>
      </Box>
      
      {/* Chart area */}
      <Box sx={{ height: '100%', ml: 5, mr: 2, position: 'relative' }}>
        {/* X-axis labels */}
        <Box sx={{ position: 'absolute', bottom: -20, left: 0, right: 0, display: 'flex', justifyContent: 'space-between' }}>
          {xLabels.map((label, i) => (
            <Typography key={i} variant="caption">
              {i % 2 === 0 ? label : ''}
            </Typography>
          ))}
        </Box>
        
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <Box 
            key={y} 
            sx={{ 
              position: 'absolute', 
              left: 0, 
              right: 0, 
              top: `${y}%`, 
              borderBottom: '1px dashed rgba(0,0,0,0.1)',
              zIndex: 1
            }} 
          />
        ))}
        
        {/* Dataset lines */}
        {datasets.map((dataset, datasetIndex) => (
          <svg 
            key={datasetIndex} 
            viewBox="0 0 100 100" 
            preserveAspectRatio="none" 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%',
              overflow: 'visible',
              zIndex: 2
            }}
          >
            {/* Line */}
            <polyline
              points={dataset.data.map((point, i) => 
                `${i * pointWidth},${getYPosition(point.value)}`
              ).join(' ')}
              fill="none"
              stroke={dataset.color}
              strokeWidth="2"
            />
            
            {/* Points */}
            {dataset.data.map((point, i) => (
              <circle
                key={i}
                cx={`${i * pointWidth}`}
                cy={`${getYPosition(point.value)}`}
                r="3"
                fill={dataset.color}
              />
            ))}
          </svg>
        ))}
      </Box>
      
      {/* Legend */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 3 }}>
        {datasets.map((dataset, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: dataset.color }} />
            <Typography variant="caption">{dataset.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

/**
 * KPI Dashboard Component
 * A comprehensive dashboard with financial metrics and visualizations
 */
function KPIDashboard({ userData }) {
  const theme = useTheme();
  const [timeframe, setTimeframe] = useState('12m');
  const [activeDashboard, setActiveDashboard] = useState(0);
  
  const handleTimeframeChange = (event) => {
    setTimeframe(event.target.value);
  };
  
  const handleDashboardChange = (event, newValue) => {
    setActiveDashboard(newValue);
  };
  
  // Current period metrics
  const currentMonthIndex = financialData.cashFlow.net.length - 1;
  const previousMonthIndex = currentMonthIndex - 1;
  
  const metrics = {
    cashFlow: {
      current: financialData.cashFlow.net[currentMonthIndex].value,
      previous: financialData.cashFlow.net[previousMonthIndex].value,
      percentChange: ((financialData.cashFlow.net[currentMonthIndex].value - financialData.cashFlow.net[previousMonthIndex].value) / financialData.cashFlow.net[previousMonthIndex].value) * 100
    },
    profitLoss: {
      current: financialData.profitLoss.profit[currentMonthIndex].value,
      previous: financialData.profitLoss.profit[previousMonthIndex].value,
      percentChange: ((financialData.profitLoss.profit[currentMonthIndex].value - financialData.profitLoss.profit[previousMonthIndex].value) / financialData.profitLoss.profit[previousMonthIndex].value) * 100
    },
    balanceSheet: {
      assets: financialData.balanceSheet.assets[currentMonthIndex].value,
      liabilities: financialData.balanceSheet.liabilities[currentMonthIndex].value,
      equity: financialData.balanceSheet.equity[currentMonthIndex].value,
      equityChange: ((financialData.balanceSheet.equity[currentMonthIndex].value - financialData.balanceSheet.equity[previousMonthIndex].value) / financialData.balanceSheet.equity[previousMonthIndex].value) * 100
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: theme.palette.primary.main }}>
          Financial Analytics Dashboard
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Time Period</InputLabel>
          <Select
            value={timeframe}
            label="Time Period"
            onChange={handleTimeframeChange}
          >
            <MenuItem value="3m">Last 3 Months</MenuItem>
            <MenuItem value="6m">Last 6 Months</MenuItem>
            <MenuItem value="12m">Last 12 Months</MenuItem>
            <MenuItem value="ytd">Year to Date</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      {/* KPI Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'white',
              borderLeft: `4px solid ${theme.palette.primary.main}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <ShowChartIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
              <Typography variant="h6" color="text.secondary">Cash Flow</Typography>
            </Box>
            <Typography variant="h4">${metrics.cashFlow.current.toLocaleString()}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              {metrics.cashFlow.percentChange >= 0 ? (
                <TrendingUpIcon sx={{ color: 'success.main', mr: 0.5 }} />
              ) : (
                <TrendingDownIcon sx={{ color: 'error.main', mr: 0.5 }} />
              )}
              <Typography 
                variant="body2" 
                sx={{ color: metrics.cashFlow.percentChange >= 0 ? 'success.main' : 'error.main' }}
              >
                {Math.abs(metrics.cashFlow.percentChange).toFixed(1)}% from last month
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'white',
              borderLeft: `4px solid ${theme.palette.success.main}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <ReceiptIcon sx={{ color: theme.palette.success.main, mr: 1 }} />
              <Typography variant="h6" color="text.secondary">Profit/Loss</Typography>
            </Box>
            <Typography variant="h4">${metrics.profitLoss.current.toLocaleString()}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              {metrics.profitLoss.percentChange >= 0 ? (
                <TrendingUpIcon sx={{ color: 'success.main', mr: 0.5 }} />
              ) : (
                <TrendingDownIcon sx={{ color: 'error.main', mr: 0.5 }} />
              )}
              <Typography 
                variant="body2" 
                sx={{ color: metrics.profitLoss.percentChange >= 0 ? 'success.main' : 'error.main' }}
              >
                {Math.abs(metrics.profitLoss.percentChange).toFixed(1)}% from last month
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'white',
              borderLeft: `4px solid ${theme.palette.info.main}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccountBalanceIcon sx={{ color: theme.palette.info.main, mr: 1 }} />
              <Typography variant="h6" color="text.secondary">Equity</Typography>
            </Box>
            <Typography variant="h4">${metrics.balanceSheet.equity.toLocaleString()}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              {metrics.balanceSheet.equityChange >= 0 ? (
                <TrendingUpIcon sx={{ color: 'success.main', mr: 0.5 }} />
              ) : (
                <TrendingDownIcon sx={{ color: 'error.main', mr: 0.5 }} />
              )}
              <Typography 
                variant="body2" 
                sx={{ color: metrics.balanceSheet.equityChange >= 0 ? 'success.main' : 'error.main' }}
              >
                {Math.abs(metrics.balanceSheet.equityChange).toFixed(1)}% from last month
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Chart Tabs */}
      <Paper elevation={0} sx={{ mt: 4, p: 2 }}>
        <Tabs 
          value={activeDashboard} 
          onChange={handleDashboardChange}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab label="Cash Flow" />
          <Tab label="Profit & Loss" />
          <Tab label="Balance Sheet" />
        </Tabs>
        
        {/* Cash Flow Dashboard */}
        {activeDashboard === 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Cash Flow Analysis</Typography>
              <ButtonGroup size="small">
                <Button variant={timeframe === '3m' ? 'contained' : 'outlined'} onClick={() => setTimeframe('3m')}>3M</Button>
                <Button variant={timeframe === '6m' ? 'contained' : 'outlined'} onClick={() => setTimeframe('6m')}>6M</Button>
                <Button variant={timeframe === '12m' ? 'contained' : 'outlined'} onClick={() => setTimeframe('12m')}>12M</Button>
              </ButtonGroup>
            </Box>
            
            <LineChart 
              datasets={[
                { 
                  label: 'Inflows', 
                  data: financialData.cashFlow.inflows.slice(-parseInt(timeframe) || -12), 
                  color: theme.palette.success.main 
                },
                { 
                  label: 'Outflows', 
                  data: financialData.cashFlow.outflows.slice(-parseInt(timeframe) || -12), 
                  color: theme.palette.error.main 
                },
                { 
                  label: 'Net Cash Flow', 
                  data: financialData.cashFlow.net.slice(-parseInt(timeframe) || -12), 
                  color: theme.palette.primary.main 
                }
              ]}
              height={300}
            />
            
            <Grid container spacing={3} sx={{ mt: 3 }}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardHeader title="Total Inflows" titleTypographyProps={{ variant: 'subtitle1' }} />
                  <CardContent>
                    <Typography variant="h5">${financialData.cashFlow.inflows.slice(-parseInt(timeframe) || -12).reduce((sum, item) => sum + item.value, 0).toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardHeader title="Total Outflows" titleTypographyProps={{ variant: 'subtitle1' }} />
                  <CardContent>
                    <Typography variant="h5">${financialData.cashFlow.outflows.slice(-parseInt(timeframe) || -12).reduce((sum, item) => sum + item.value, 0).toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardHeader title="Net Cash Flow" titleTypographyProps={{ variant: 'subtitle1' }} />
                  <CardContent>
                    <Typography variant="h5">${financialData.cashFlow.net.slice(-parseInt(timeframe) || -12).reduce((sum, item) => sum + item.value, 0).toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* Profit & Loss Dashboard */}
        {activeDashboard === 1 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Profit & Loss</Typography>
              <ButtonGroup size="small">
                <Button variant={timeframe === '3m' ? 'contained' : 'outlined'} onClick={() => setTimeframe('3m')}>3M</Button>
                <Button variant={timeframe === '6m' ? 'contained' : 'outlined'} onClick={() => setTimeframe('6m')}>6M</Button>
                <Button variant={timeframe === '12m' ? 'contained' : 'outlined'} onClick={() => setTimeframe('12m')}>12M</Button>
              </ButtonGroup>
            </Box>
            
            <LineChart 
              datasets={[
                { 
                  label: 'Revenue', 
                  data: financialData.profitLoss.revenue.slice(-parseInt(timeframe) || -12), 
                  color: theme.palette.success.main 
                },
                { 
                  label: 'Expenses', 
                  data: financialData.profitLoss.expenses.slice(-parseInt(timeframe) || -12), 
                  color: theme.palette.error.main 
                },
                { 
                  label: 'Profit', 
                  data: financialData.profitLoss.profit.slice(-parseInt(timeframe) || -12), 
                  color: theme.palette.warning.main 
                }
              ]}
              height={300}
            />
            
            <Grid container spacing={3} sx={{ mt: 3 }}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardHeader title="Total Revenue" titleTypographyProps={{ variant: 'subtitle1' }} />
                  <CardContent>
                    <Typography variant="h5">${financialData.profitLoss.revenue.slice(-parseInt(timeframe) || -12).reduce((sum, item) => sum + item.value, 0).toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardHeader title="Total Expenses" titleTypographyProps={{ variant: 'subtitle1' }} />
                  <CardContent>
                    <Typography variant="h5">${financialData.profitLoss.expenses.slice(-parseInt(timeframe) || -12).reduce((sum, item) => sum + item.value, 0).toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardHeader title="Net Profit" titleTypographyProps={{ variant: 'subtitle1' }} />
                  <CardContent>
                    <Typography variant="h5">${financialData.profitLoss.profit.slice(-parseInt(timeframe) || -12).reduce((sum, item) => sum + item.value, 0).toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* Balance Sheet Dashboard */}
        {activeDashboard === 2 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Balance Sheet</Typography>
              <ButtonGroup size="small">
                <Button variant={timeframe === '3m' ? 'contained' : 'outlined'} onClick={() => setTimeframe('3m')}>3M</Button>
                <Button variant={timeframe === '6m' ? 'contained' : 'outlined'} onClick={() => setTimeframe('6m')}>6M</Button>
                <Button variant={timeframe === '12m' ? 'contained' : 'outlined'} onClick={() => setTimeframe('12m')}>12M</Button>
              </ButtonGroup>
            </Box>
            
            <BarChart 
              data={financialData.balanceSheet.assets.slice(-parseInt(timeframe) || -12)}
              xKey="month"
              yKey="value"
              height={300}
              color={theme.palette.primary.main}
            />
            
            <Grid container spacing={3} sx={{ mt: 3 }}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardHeader title="Total Assets" titleTypographyProps={{ variant: 'subtitle1' }} />
                  <CardContent>
                    <Typography variant="h5">${metrics.balanceSheet.assets.toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardHeader title="Total Liabilities" titleTypographyProps={{ variant: 'subtitle1' }} />
                  <CardContent>
                    <Typography variant="h5">${metrics.balanceSheet.liabilities.toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardHeader title="Total Equity" titleTypographyProps={{ variant: 'subtitle1' }} />
                  <CardContent>
                    <Typography variant="h5">${metrics.balanceSheet.equity.toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Asset Composition</Typography>
              <Box sx={{ display: 'flex', height: 20, mb: 1 }}>
                <Box sx={{ width: '40%', bgcolor: theme.palette.primary.main }} />
                <Box sx={{ width: '30%', bgcolor: theme.palette.primary.light }} />
                <Box sx={{ width: '30%', bgcolor: theme.palette.primary.dark }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption">Current Assets (40%)</Typography>
                <Typography variant="caption">Fixed Assets (30%)</Typography>
                <Typography variant="caption">Other Assets (30%)</Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default KPIDashboard; 