// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/chart/ChartComponent.js
import React, { useState, useEffect } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { axiosInstance } from '@/lib/axiosConfig';

ChartJS.register(
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosInstance.get('/api/chart/transaction-data/', {
          params: { account, date_range: dateRange, start_date: startDate, end_date: endDate },
        });
        setChartData(response.data);
      } catch (error) {
        console.error('Error fetching chart data:', error);
      }
    };

    fetchData();
  }, [account, dateRange, startDate, endDate]);

  if (!chartData) {
    return <div>Loading...</div>;
  }

  const data = {
    labels: chartData.map((item) => item.date),
    datasets: [
      {
        label: 'Transaction Amount',
        data: chartData.map((item) => item.amount),
        backgroundColor: barColor || 'rgba(75,192,192,0.4)',
        borderColor: lineColor || 'rgba(75,192,192,1)',
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
      },
    },
  };

  switch (chartType) {
    case 'bar':
      return <Bar data={data} options={options} />;
    case 'pie':
      return <Pie data={data} options={options} />;
    case 'line':
    default:
      return <Line data={data} options={options} />;
  }
};

export default ChartComponent;
