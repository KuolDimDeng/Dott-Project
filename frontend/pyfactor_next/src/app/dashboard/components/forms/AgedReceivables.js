import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

const AgedReceivables = () => {
  const [receivables, setReceivables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState(new Date());
  const toast = useToast();

  useEffect(() => {
    fetchAgedReceivables();
  }, [asOfDate]);

  const fetchAgedReceivables = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/api/reports/aged-receivables/', {
        params: { as_of_date: asOfDate.toISOString().split('T')[0] },
      });
      setReceivables(response.data);
      logger.debug('Fetched aged receivables:', response.data);
    } catch (error) {
      logger.error('Error fetching aged receivables:', error);
      toast.error('Failed to fetch aged receivables');
    }
    setLoading(false);
  };

  const columns = [
    { id: 'customer_name', label: 'Customer', minWidth: 170 },
    { id: 'invoice_number', label: 'Invoice #', minWidth: 100 },
    { id: 'invoice_date', label: 'Invoice Date', minWidth: 100 },
    { id: 'due_date', label: 'Due Date', minWidth: 100 },
    {
      id: 'invoice_amount',
      label: 'Invoice Amount',
      minWidth: 100,
      align: 'right',
      format: (value) => `$${value.toFixed(2)}`,
    },
    {
      id: 'current',
      label: 'Current',
      minWidth: 100,
      align: 'right',
      format: (value) => `$${value.toFixed(2)}`,
    },
    {
      id: 'days_0_30',
      label: '0-30 Days',
      minWidth: 100,
      align: 'right',
      format: (value) => `$${value.toFixed(2)}`,
    },
    {
      id: 'days_31_60',
      label: '31-60 Days',
      minWidth: 100,
      align: 'right',
      format: (value) => `$${value.toFixed(2)}`,
    },
    {
      id: 'days_61_90',
      label: '61-90 Days',
      minWidth: 100,
      align: 'right',
      format: (value) => `$${value.toFixed(2)}`,
    },
    {
      id: 'days_over_90',
      label: 'Over 90 Days',
      minWidth: 100,
      align: 'right',
      format: (value) => `$${value.toFixed(2)}`,
    },
    {
      id: 'total_outstanding',
      label: 'Total Outstanding',
      minWidth: 100,
      align: 'right',
      format: (value) => `$${value.toFixed(2)}`,
    },
  ];

  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Aged Receivables</h1>
      
      <div className="mb-4">
        <label htmlFor="asOfDate" className="block text-sm font-medium text-gray-700 mb-1">
          As of Date
        </label>
        <input
          id="asOfDate"
          type="date"
          className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          value={asOfDate.toISOString().split('T')[0]}
          onChange={(e) => setAsOfDate(new Date(e.target.value))}
        />
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                    style={{ minWidth: column.minWidth }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <CenteredSpinner size="medium" />
                    </div>
                  </td>
                </tr>
              ) : (
                receivables.map((row) => (
                  <tr key={row.invoice_number} className="hover:bg-gray-50">
                    {columns.map((column) => {
                      const value = row[column.id];
                      return (
                        <td 
                          key={column.id} 
                          className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                        >
                          {column.format && typeof value === 'number' ? column.format(value) : value}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AgedReceivables;