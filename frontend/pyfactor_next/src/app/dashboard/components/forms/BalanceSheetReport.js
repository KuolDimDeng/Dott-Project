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

  const totalLiabilitiesEquity = (liabilities.total || 0) + (equity.total || 0);

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Balance Sheet
        </h3>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="spinner"></div>
          </div>
        ) : error ? (
          <div className="mt-4 text-sm text-red-600">
            {error}
          </div>
        ) : data ? (
          <>
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">Assets</h4>
              {renderSection(data.assets)}
            </div>
            
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">Liabilities</h4>
              {renderSection(data.liabilities)}
            </div>
            
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">Equity</h4>
              {renderSection(data.equity)}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between font-semibold">
                <span>Total Liabilities + Equity</span>
                <span>${formatAmount(totalLiabilitiesEquity)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 text-sm text-gray-600">
            No balance sheet data available. Please check back later.
          </div>
        )}
      </div>
    </div>
  );
}