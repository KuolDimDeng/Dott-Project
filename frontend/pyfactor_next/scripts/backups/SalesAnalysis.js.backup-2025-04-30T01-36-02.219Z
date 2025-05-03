import React, { useState, useEffect } from 'react';
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

const MetricCard = ({ title, value, iconType, trend, trendValue, colorClass }) => {
  const trendColorClass = trend === 'up' ? 'text-green-600' : 'text-red-600';
  
  // Helper function to render the correct icon based on iconType
  const renderIcon = (type) => {
    switch(type) {
      case 'money':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'cart':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'inventory':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'people':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow h-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium text-gray-600">
          {title}
        </h3>
        <div className={`${colorClass} bg-opacity-20 p-2 rounded-full`}>
          {renderIcon(iconType)}
        </div>
      </div>
      <p className="text-2xl font-bold">
        {value}
      </p>
      {trend && (
        <div className={`flex items-center mt-2 ${trendColorClass}`}>
          {trend === 'up' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          )}
          <span className="text-sm">
            {trendValue}
          </span>
        </div>
      )}
    </div>
  );
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

  const handleTabChange = (index) => {
    setActiveTab(index);
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
    
    return <p className="text-xl">Loading...</p>;
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
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Sales Dashboard</h1>
        <div className="relative w-48">
          <select 
            value={timeRange} 
            onChange={handleTimeRangeChange}
            className="w-full bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div>
          <MetricCard
            title="Total Sales"
            value={`$${formatAmount(data.totalSales)}`}
            iconType="money"
            trend={data.salesGrowth >= 0 ? 'up' : 'down'}
            trendValue={`${Math.abs(data.salesGrowth).toFixed(1)}% from last period`}
            colorClass="text-blue-600"
          />
        </div>
        <div>
          <MetricCard
            title="Average Order Value"
            value={`$${formatAmount(data.averageOrderValue)}`}
            iconType="cart"
            trend={data.aovGrowth >= 0 ? 'up' : 'down'}
            trendValue={`${Math.abs(data.aovGrowth).toFixed(1)}% from last period`}
            colorClass="text-green-600"
          />
        </div>
        <div>
          <MetricCard
            title="Number of Orders"
            value={data.numberOfOrders}
            iconType="inventory"
            trend={data.ordersGrowth >= 0 ? 'up' : 'down'}
            trendValue={`${Math.abs(data.ordersGrowth).toFixed(1)}% from last period`}
            colorClass="text-yellow-600"
          />
        </div>
        <div>
          <MetricCard
            title="Active Customers"
            value={data.activeCustomers}
            iconType="people"
            trend={data.customersGrowth >= 0 ? 'up' : 'down'}
            trendValue={`${Math.abs(data.customersGrowth).toFixed(1)}% from last period`}
            colorClass="text-purple-600"
          />
        </div>
      </div>

      <div className="border-b border-gray-200 mb-4">
        <div className="flex">
          {["Overview", "Products", "Customers", "Categories"].map((tab, index) => (
            <button
              key={index}
              className={`py-2 px-4 font-medium border-b-2 mr-2 ${
                activeTab === index
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => handleTabChange(index)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-lg font-medium text-gray-700 mb-3">
                Sales Trend
              </h2>
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
            </div>
          </div>
          <div>
            <div className="bg-white p-4 rounded-lg shadow-md h-full">
              <h2 className="text-lg font-medium text-gray-700 mb-3">
                Top Products
              </h2>
              <div className="h-64">
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
              </div>
            </div>
          </div>
          <div>
            <div className="bg-white p-4 rounded-lg shadow-md h-full">
              <h2 className="text-lg font-medium text-gray-700 mb-3">
                Sales by Category
              </h2>
              <div className="h-64">
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
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-medium text-gray-700 mb-3">
            Top Products
          </h2>
          <div className="h-80">
            <Doughnut 
              data={topProductsData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-medium text-gray-700 mb-3">
            Sales by Customer
          </h2>
          <div className="h-80">
            <Bar 
              data={salesByCustomerData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {activeTab === 3 && (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-medium text-gray-700 mb-3">
            Sales by Category
          </h2>
          <div className="h-80">
            <Pie 
              data={salesByCategoryData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
