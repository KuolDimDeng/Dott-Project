import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';

const formatAmount = (amount) => {
  return typeof amount === 'number' ? amount.toFixed(2) : 'N/A';
};

const ExpandableRow = ({ name, data }) => {
  const [open, setOpen] = useState(false);

  if (!data || typeof data !== 'object') {
    return null;
  }

  const total =
    data.total ||
    (Array.isArray(data) ? data.reduce((sum, item) => sum + (item.amount || 0), 0) : 0);
  const accounts = data.accounts || (Array.isArray(data) ? data : []);

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
      {accounts.length > 0 && (
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
      )}
    </>
  );
};

export default function BalanceSheetReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosInstance.get('/api/reports/balance-sheet/');
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

  if (loading) return <p className="text-lg text-center py-8">Loading...</p>;
  if (error) return <p className="text-lg text-center py-8 text-red-600">Error: {error}</p>;
  if (!data) return <p className="text-lg text-center py-8">No data available for the current date.</p>;

  const assets = data.Assets || {};
  const liabilities = data.Liabilities || {};
  const equity = data.Equity || {};

  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Balance Sheet</h1>
        </div>
        
        <div className="overflow-x-auto">
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
              <tr className="bg-gray-100">
                <td colSpan={2} className="px-6 py-3 font-semibold">Assets</td>
              </tr>
              <ExpandableRow name="Current Assets" data={assets.Current} />
              <ExpandableRow name="Non-Current Assets" data={assets.NonCurrent} />
              <tr className="bg-gray-50">
                <td className="px-6 py-4 font-semibold">Total Assets</td>
                <td className="px-6 py-4 font-semibold text-right">${formatAmount(assets.total)}</td>
              </tr>

              <tr className="bg-gray-100">
                <td colSpan={2} className="px-6 py-3 font-semibold">Liabilities</td>
              </tr>
              <ExpandableRow name="Current Liabilities" data={liabilities.Current} />
              <ExpandableRow name="Non-Current Liabilities" data={liabilities.NonCurrent} />
              <tr className="bg-gray-50">
                <td className="px-6 py-4 font-semibold">Total Liabilities</td>
                <td className="px-6 py-4 font-semibold text-right">${formatAmount(liabilities.total)}</td>
              </tr>

              <tr className="bg-gray-100">
                <td colSpan={2} className="px-6 py-3 font-semibold">Equity</td>
              </tr>
              <ExpandableRow name="Equity Accounts" data={equity} />
              <tr className="bg-gray-50">
                <td className="px-6 py-4 font-semibold">Total Equity</td>
                <td className="px-6 py-4 font-semibold text-right">${formatAmount(equity.total)}</td>
              </tr>

              <tr className="bg-blue-50">
                <td className="px-6 py-4 font-bold">Total Liabilities and Equity</td>
                <td className="px-6 py-4 font-bold text-right">${formatAmount((liabilities.total || 0) + (equity.total || 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="p-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-2">Raw data for debugging:</p>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-60">{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}