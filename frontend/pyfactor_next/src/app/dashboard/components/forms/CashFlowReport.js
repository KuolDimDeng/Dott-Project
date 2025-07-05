import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';

// SVG icons as React components
const KeyboardArrowDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const KeyboardArrowUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
  </svg>
);

const formatAmount = (amount) => {
  if (typeof amount !== 'number') return 'N/A';
  return amount.toFixed(2);
};

const ExpandableRow = ({ name, data }) => {
  const [open, setOpen] = useState(false);

  if (!data || typeof data !== 'object') {
    return null;
  }

  const total =
    data.total ||
    (Array.isArray(data) ? data.reduce((sum, item) => sum + (item.amount || 0), 0) : 0);
  const items = data.items || (Array.isArray(data) ? data : []);

  return (
    <>
      <tr>
        <td className="px-6 py-4 text-sm text-gray-900">
          <button 
            onClick={() => setOpen(!open)} 
            className="p-1 mr-2 rounded-full hover:bg-gray-100 focus:outline-none"
          >
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </button>
          {name}
        </td>
        <td className="px-6 py-4 text-sm text-gray-900 text-right">${formatAmount(total)}</td>
      </tr>
      {items.length > 0 && (
        <tr>
          <td className={`px-0 py-0 ${!open ? 'hidden' : ''}`} colSpan={2}>
            <div className={`transition-all duration-200 ease-in-out ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="m-4">
                <table className="min-w-full">
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="px-4 py-2 text-sm text-gray-700">{item.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 text-right">${formatAmount(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default function CashFlowReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosInstance.get('/api/reports/cash-flow/');
        console.log('API Response:', response);
        if (response.data) {
          setData(response.data);
        } else {
          setError('Unexpected data format received');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.response?.data?.error || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <p className="text-gray-600 p-4">Loading...</p>;
  if (error) return <p className="text-red-600 p-4">Error: {error}</p>;
  if (!data) return <p className="text-gray-600 p-4">No data available for the current date.</p>;

  const operating = data.Operating || {};
  const investing = data.Investing || {};
  const financing = data.Financing || {};

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="overflow-x-auto">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">
          Cash Flow Statement
        </h1>
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
          <tbody className="divide-y divide-gray-200">
            <tr className="bg-gray-50">
              <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-gray-700">
                Operating Activities
              </td>
            </tr>
            <ExpandableRow name="Operating Activities" data={operating} />

            <tr className="bg-gray-50">
              <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-gray-700">
                Investing Activities
              </td>
            </tr>
            <ExpandableRow name="Investing Activities" data={investing} />

            <tr className="bg-gray-50">
              <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-gray-700">
                Financing Activities
              </td>
            </tr>
            <ExpandableRow name="Financing Activities" data={financing} />

            <tr className="bg-blue-50">
              <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                Net Increase/Decrease in Cash
              </td>
              <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                $
                {formatAmount(
                  (operating.total || 0) + (investing.total || 0) + (financing.total || 0)
                )}
              </td>
            </tr>
          </tbody>
        </table>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8">
            <p className="text-sm text-gray-600 mb-2">
              Raw data for debugging:
            </p>
            <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-x-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
