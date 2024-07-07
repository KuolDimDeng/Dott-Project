// /src/app/dashboard/components/ChartComponent.jsx
import React from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';

const ChartComponent = ({ data, type }) => {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Transaction Data',
        data: data.values,
        backgroundColor: 'rgba(75,192,192,0.4)',
        borderColor: 'rgba(75,192,192,1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
  };

  switch (type) {
    case 'bar':
      return <Bar data={chartData} options={options} />;
    case 'pie':
      return <Pie data={chartData} options={options} />;
    case 'line':
    default:
      return <Line data={chartData} options={options} />;
  }
};

export default ChartComponent;
