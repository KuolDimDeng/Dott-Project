import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';

const formatAmount = (amount) => {
  return typeof amount === 'number' ? amount.toFixed(2) : 'N/A';
};

const ExpandableRow = ({ name, data }) => {
  const [open, setOpen] = useState(false);

  // Check if data exists and has a total property
  const total = data && data.total ? data.total : 0;
  const accounts = data && data.accounts ? data.accounts : [];

  return (
    <>
      <tr className="border-b border-gray-200">
        <td className="px-6 py-4">
          <button
            type="button"
            className="inline-flex items-center focus:outline-none"
            onClick={() => setOpen(!open)}
          >
            <span className="mr-2">
              {open ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </span>
            {name}
          </button>
        </td>
        <td className="px-6 py-4 text-right">${formatAmount(total)}</td>
      </tr>
      <tr className={open ? '' : 'hidden'}>
        <td colSpan={2} className="bg-gray-50 px-0 py-0">
          <div className={`transition-all duration-200 ease-in-out ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="divide-y divide-gray-200">
                {accounts.map((account, index) => (
                  <tr key={index} className="bg-gray-50">
                    <td className="pl-12 pr-6 py-3 text-sm text-gray-600">{account.name}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-600">${formatAmount(account.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    </>
  );
};

export default function ProfitAndLossReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosInstance.get('/api/reports/profit-and-loss/');
        console.log('API Response:', response.data); // Log the response data
        setData(response.data);
      } catch (error) {
        console.error('Error fetching data:', error.response || error);
        setError(error.response?.data?.error || error.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <p className="text-lg text-center py-8">Loading...</p>;
  if (error) return <p className="text-lg text-center py-8 text-red-600">Error: {error}</p>;
  if (!data) return <p className="text-lg text-center py-8">No data available for the current date.</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Profit and Loss Statement</h1>
        </div>
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
            {data.Revenue && <ExpandableRow name="Revenue" data={data.Revenue} />}
            {data['Cost of Goods Sold'] && (
              <ExpandableRow name="Cost of Goods Sold" data={data['Cost of Goods Sold']} />
            )}
            <tr className="border-b border-gray-200 bg-gray-50">
              <td className="px-6 py-4 font-medium">Gross Profit</td>
              <td className="px-6 py-4 text-right font-medium">${formatAmount(data['Gross Profit'])}</td>
            </tr>
            {data['Operating Expenses'] && (
              <ExpandableRow name="Operating Expenses" data={data['Operating Expenses']} />
            )}
            <tr className="border-b border-gray-200 bg-blue-50">
              <td className="px-6 py-4 font-bold">Net Income</td>
              <td className="px-6 py-4 text-right font-bold">${formatAmount(data['Net Income'])}</td>
            </tr>
          </tbody>
        </table>
        <div className="p-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-2">Raw data for debugging:</p>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-60">{JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}