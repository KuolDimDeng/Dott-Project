// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/chart/component/ChartComponents.js
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { axiosInstance } from '@/lib/axiosConfig';

const ChartComponent = ({
  account,
  dateRange,
  startDate,
  endDate,
  chartType,
  lineColor,
  barColor,
}) => {
  const [chartData, setChartData] = useState(null);
  const chartRegistered = useRef(false);

  // Register Chart.js components when component mounts
  useEffect(() => {
    if (!chartRegistered.current) {
      const registerChart = async () => {
        try {
          // Dynamically import Chart.js
          const {
            Chart,
            CategoryScale,
            LinearScale,
            PointElement,
            LineElement,
            BarElement,
            ArcElement,
            Title,
            Tooltip,
            Legend
          } = await import('chart.js');

          // Register all necessary components
          Chart.register(
            CategoryScale,
            LinearScale,
            PointElement,
            LineElement,
            BarElement,
            ArcElement,
            Title,
            Tooltip,
            Legend
          );
          
          chartRegistered.current = true;
        } catch (error) {
          console.error("Error registering Chart.js components:", error);
        }
      };

      registerChart();
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosInstance.get('/api/chart/transaction-data/', {
          params: { account, date_range: dateRange, start_date: startDate, end_date: endDate },
        });
        setChartData(response.data);
      } catch (error) {
        console.error('Error fetching chart data:', error);
        // Provide mock data when API call fails for development
        setChartData([
          { date: '2023-01', amount: 500 },
          { date: '2023-02', amount: 650 },
          { date: '2023-03', amount: 800 },
          { date: '2023-04', amount: 750 },
          { date: '2023-05', amount: 900 },
        ]);
      }
    };

    fetchData();
  }, [account, dateRange, startDate, endDate]);

  if (!chartData || !chartRegistered.current) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading chart data...</span>
      </div>
    );
  }

  const data = {
    labels: chartData.map((item) => item.date),
    datasets: [
      {
        label: 'Transaction Amount',
        data: chartData.map((item) => item.amount),
        backgroundColor: barColor || 'rgba(59, 130, 246, 0.4)',
        borderColor: lineColor || 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#6B7280',
        },
        grid: {
          color: 'rgba(209, 213, 219, 0.5)',
        }
      },
      x: {
        ticks: {
          color: '#6B7280',
        },
        grid: {
          color: 'rgba(209, 213, 219, 0.5)',
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: '#4B5563',
          font: {
            family: 'Inter, system-ui, sans-serif',
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        titleFont: {
          family: 'Inter, system-ui, sans-serif',
        },
        bodyFont: {
          family: 'Inter, system-ui, sans-serif',
        },
        padding: 10,
        cornerRadius: 4
      }
    }
  };

  const chartContainer = "h-full w-full min-h-[300px] p-4 bg-white rounded-lg shadow-sm";

  switch (chartType) {
    case 'bar':
      return <div className={chartContainer}><Bar data={data} options={options} /></div>;
    case 'pie':
      return <div className={chartContainer}><Pie data={data} options={options} /></div>;
    case 'line':
    default:
      return <div className={chartContainer}><Line data={data} options={options} /></div>;
  }
};

export default ChartComponent;
