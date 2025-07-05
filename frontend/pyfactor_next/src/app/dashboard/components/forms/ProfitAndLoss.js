import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';

export default function ProfitAndLoss() {
  // or BalanceSheet or CashFlow
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosInstance.get('/api/financial-statements/profit-and-loss/'); // adjust URL for each component
        console.log('API Response:', response);
        if (response.data && response.data.data) {
          setData(response.data.data);
        } else {
          setError('Unexpected data format received');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        console.log('Error response:', error.response);
        setError(error.response?.data?.error || 'An error occurred');
      }
    };
    fetchData();
  }, []);

  if (error) return <p className="text-red-600">Error: {error}</p>;
  if (!data) return <p className="text-gray-700">Loading...</p>;

  if (Object.keys(data).length === 0) {
    return <p className="text-gray-700">No data available for the current date.</p>;
  }

  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(data).map(([key, value]) => (
              <tr key={key} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{key}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}