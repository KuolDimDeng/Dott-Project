'use client';


import React, { useState } from 'react';

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
const BarChart = ({ data, xKey, yKey, height = 200, color = '#3b82f6' }) => {
  if (!data || !data.length) return null;
  
  const maxValue = Math.max(...data.map(item => item[yKey]));
  const chartWidth = 100 / data.length;
  
  return (
    <div className="relative mt-4" style={{ height: height }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-5 w-10 flex flex-col justify-between">
        <span className="text-xs transform -translate-y-1/2">
          ${maxValue.toLocaleString()}
        </span>
        <span className="text-xs transform translate-y-1/2">
          $0
        </span>
      </div>
      
      {/* Chart area */}
      <div className="h-full ml-5 flex items-end">
        {data.map((item, index) => (
          <div 
            key={index} 
            className="flex flex-col items-center" 
            style={{ width: `${chartWidth}%` }}
          >
            <div 
              style={{ 
                width: '60%', 
                height: `${(item[yKey] / maxValue) * 100}%`, 
                backgroundColor: color,
                minHeight: 1,
                transition: 'height 0.3s ease',
              }}
              className="rounded-t-md" 
            />
            <span className="text-xs mt-1">
              {item[xKey]}
            </span>
          </div>
        ))}
      </div>
    </div>
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
    <div className="relative mt-4" style={{ height: height }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-5 w-10 flex flex-col justify-between">
        <span className="text-xs transform -translate-y-1/2">
          ${normalizedMax.toLocaleString()}
        </span>
        <span className="text-xs transform translate-y-1/2">
          ${normalizedMin.toLocaleString()}
        </span>
      </div>
      
      {/* Chart area */}
      <div className="h-full ml-5 mr-2 relative">
        {/* X-axis labels */}
        <div className="absolute -bottom-5 left-0 right-0 flex justify-between">
          {xLabels.map((label, i) => (
            <span key={i} className="text-xs">
              {i % 2 === 0 ? label : ''}
            </span>
          ))}
        </div>
        
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <div 
            key={y} 
            className="absolute left-0 right-0 border-b border-dashed border-gray-200 z-10"
            style={{ top: `${y}%` }}
          />
        ))}
        
        {/* Dataset lines */}
        {datasets.map((dataset, datasetIndex) => (
          <svg 
            key={datasetIndex} 
            viewBox="0 0 100 100" 
            preserveAspectRatio="none" 
            className="absolute top-0 left-0 w-full h-full overflow-visible z-20"
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
      </div>
      
      {/* Legend */}
      <div className="mt-3 flex justify-center space-x-3">
        {datasets.map((dataset, i) => (
          <div key={i} className="flex items-center space-x-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: dataset.color }}
            />
            <span className="text-xs">{dataset.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * KPI Dashboard Component
 * A comprehensive dashboard with financial metrics and visualizations
 */
function KPIDashboard({ userData }) {
  // Define theme colors
  const theme = {
    colors: {
      primary: {
        main: '#3b82f6', // blue-500
        light: '#93c5fd', // blue-300
        dark: '#1d4ed8', // blue-700
      },
      success: {
        main: '#22c55e', // green-500
      },
      error: {
        main: '#ef4444', // red-500
      },
      warning: {
        main: '#f59e0b', // amber-500
      },
      info: {
        main: '#06b6d4', // cyan-500
      }
    }
  };
  
  const [timeframe, setTimeframe] = useState('12m');
  const [activeDashboard, setActiveDashboard] = useState(0);
  
  const handleTimeframeChange = (event) => {
    setTimeframe(event.target.value);
  };
  
  const handleDashboardChange = (index) => {
    setActiveDashboard(index);
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
    <div className="p-3">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-2xl font-bold text-blue-500">
          Financial Analytics Dashboard
        </h1>
        
        <div className="relative">
          <select
            className="w-40 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={timeframe}
            onChange={handleTimeframeChange}
          >
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="12m">Last 12 Months</option>
            <option value="ytd">Year to Date</option>
          </select>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-2 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            <h2 className="text-lg font-medium text-gray-600">Cash Flow</h2>
          </div>
          <p className="text-2xl font-bold">${metrics.cashFlow.current.toLocaleString()}</p>
          <div className="flex items-center mt-1">
            {metrics.cashFlow.percentChange >= 0 ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
              </svg>
            )}
            <span 
              className={metrics.cashFlow.percentChange >= 0 ? 'text-sm text-green-500' : 'text-sm text-red-500'}
            >
              {Math.abs(metrics.cashFlow.percentChange).toFixed(1)}% from last month
            </span>
          </div>
        </div>
        
        <div className="bg-white p-2 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <h2 className="text-lg font-medium text-gray-600">Profit/Loss</h2>
          </div>
          <p className="text-2xl font-bold">${metrics.profitLoss.current.toLocaleString()}</p>
          <div className="flex items-center mt-1">
            {metrics.profitLoss.percentChange >= 0 ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
              </svg>
            )}
            <span 
              className={metrics.profitLoss.percentChange >= 0 ? 'text-sm text-green-500' : 'text-sm text-red-500'}
            >
              {Math.abs(metrics.profitLoss.percentChange).toFixed(1)}% from last month
            </span>
          </div>
        </div>
        
        <div className="bg-white p-2 rounded-lg shadow border-l-4 border-cyan-500">
          <div className="flex items-center mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
            <h2 className="text-lg font-medium text-gray-600">Equity</h2>
          </div>
          <p className="text-2xl font-bold">${metrics.balanceSheet.equity.toLocaleString()}</p>
          <div className="flex items-center mt-1">
            {metrics.balanceSheet.equityChange >= 0 ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
              </svg>
            )}
            <span 
              className={metrics.balanceSheet.equityChange >= 0 ? 'text-sm text-green-500' : 'text-sm text-red-500'}
            >
              {Math.abs(metrics.balanceSheet.equityChange).toFixed(1)}% from last month
            </span>
          </div>
        </div>
      </div>
      
      {/* Chart Tabs */}
      <div className="mt-4 p-2 bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200 mb-2">
          <div className="flex space-x-4">
            <button
              className={`py-2 px-4 font-medium ${
                activeDashboard === 0
                  ? 'text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleDashboardChange(0)}
            >
              Cash Flow
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeDashboard === 1
                  ? 'text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleDashboardChange(1)}
            >
              Profit & Loss
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeDashboard === 2
                  ? 'text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleDashboardChange(2)}
            >
              Balance Sheet
            </button>
          </div>
        </div>
        
        {/* Cash Flow Dashboard */}
        {activeDashboard === 0 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-medium">Cash Flow Analysis</h2>
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  className={`px-3 py-1 text-sm font-medium ${
                    timeframe === '3m'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  } rounded-l-md`}
                  onClick={() => setTimeframe('3m')}
                >
                  3M
                </button>
                <button
                  className={`px-3 py-1 text-sm font-medium ${
                    timeframe === '6m'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border-t border-b border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setTimeframe('6m')}
                >
                  6M
                </button>
                <button
                  className={`px-3 py-1 text-sm font-medium ${
                    timeframe === '12m'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  } rounded-r-md`}
                  onClick={() => setTimeframe('12m')}
                >
                  12M
                </button>
              </div>
            </div>
            
            <LineChart 
              datasets={[
                { 
                  label: 'Inflows', 
                  data: financialData.cashFlow.inflows.slice(-parseInt(timeframe) || -12), 
                  color: theme.colors.success.main 
                },
                { 
                  label: 'Outflows', 
                  data: financialData.cashFlow.outflows.slice(-parseInt(timeframe) || -12), 
                  color: theme.colors.error.main 
                },
                { 
                  label: 'Net Cash Flow', 
                  data: financialData.cashFlow.net.slice(-parseInt(timeframe) || -12), 
                  color: theme.colors.primary.main 
                }
              ]}
              height={300}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="text-sm font-medium">Total Inflows</h3>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xl font-semibold">
                    ${financialData.cashFlow.inflows.slice(-parseInt(timeframe) || -12).reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="text-sm font-medium">Total Outflows</h3>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xl font-semibold">
                    ${financialData.cashFlow.outflows.slice(-parseInt(timeframe) || -12).reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="text-sm font-medium">Net Cash Flow</h3>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xl font-semibold">
                    ${financialData.cashFlow.net.slice(-parseInt(timeframe) || -12).reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Profit & Loss Dashboard */}
        {activeDashboard === 1 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-medium">Profit & Loss</h2>
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  className={`px-3 py-1 text-sm font-medium ${
                    timeframe === '3m'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  } rounded-l-md`}
                  onClick={() => setTimeframe('3m')}
                >
                  3M
                </button>
                <button
                  className={`px-3 py-1 text-sm font-medium ${
                    timeframe === '6m'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border-t border-b border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setTimeframe('6m')}
                >
                  6M
                </button>
                <button
                  className={`px-3 py-1 text-sm font-medium ${
                    timeframe === '12m'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  } rounded-r-md`}
                  onClick={() => setTimeframe('12m')}
                >
                  12M
                </button>
              </div>
            </div>
            
            <LineChart 
              datasets={[
                { 
                  label: 'Revenue', 
                  data: financialData.profitLoss.revenue.slice(-parseInt(timeframe) || -12), 
                  color: theme.colors.success.main 
                },
                { 
                  label: 'Expenses', 
                  data: financialData.profitLoss.expenses.slice(-parseInt(timeframe) || -12), 
                  color: theme.colors.error.main 
                },
                { 
                  label: 'Profit', 
                  data: financialData.profitLoss.profit.slice(-parseInt(timeframe) || -12), 
                  color: theme.colors.warning.main 
                }
              ]}
              height={300}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="text-sm font-medium">Total Revenue</h3>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xl font-semibold">
                    ${financialData.profitLoss.revenue.slice(-parseInt(timeframe) || -12).reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="text-sm font-medium">Total Expenses</h3>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xl font-semibold">
                    ${financialData.profitLoss.expenses.slice(-parseInt(timeframe) || -12).reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="text-sm font-medium">Net Profit</h3>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xl font-semibold">
                    ${financialData.profitLoss.profit.slice(-parseInt(timeframe) || -12).reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Balance Sheet Dashboard */}
        {activeDashboard === 2 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-medium">Balance Sheet</h2>
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  className={`px-3 py-1 text-sm font-medium ${
                    timeframe === '3m'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  } rounded-l-md`}
                  onClick={() => setTimeframe('3m')}
                >
                  3M
                </button>
                <button
                  className={`px-3 py-1 text-sm font-medium ${
                    timeframe === '6m'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border-t border-b border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setTimeframe('6m')}
                >
                  6M
                </button>
                <button
                  className={`px-3 py-1 text-sm font-medium ${
                    timeframe === '12m'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  } rounded-r-md`}
                  onClick={() => setTimeframe('12m')}
                >
                  12M
                </button>
              </div>
            </div>
            
            <BarChart 
              data={financialData.balanceSheet.assets.slice(-parseInt(timeframe) || -12)}
              xKey="month"
              yKey="value"
              height={300}
              color={theme.colors.primary.main}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="text-sm font-medium">Total Assets</h3>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xl font-semibold">
                    ${metrics.balanceSheet.assets.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="text-sm font-medium">Total Liabilities</h3>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xl font-semibold">
                    ${metrics.balanceSheet.liabilities.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="text-sm font-medium">Total Equity</h3>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xl font-semibold">
                    ${metrics.balanceSheet.equity.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-3">
              <h3 className="text-sm font-medium mb-2">Asset Composition</h3>
              <div className="flex h-5 mb-1">
                <div className="w-2/5 bg-blue-500" />
                <div className="w-3/10 bg-blue-300" />
                <div className="w-3/10 bg-blue-700" />
              </div>
              <div className="flex justify-between">
                <span className="text-xs">Current Assets (40%)</span>
                <span className="text-xs">Fixed Assets (30%)</span>
                <span className="text-xs">Other Assets (30%)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default KPIDashboard; 