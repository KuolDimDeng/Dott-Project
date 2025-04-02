import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';

const IncomeByCustomer = () => {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchIncomes();
  }, []);

  const fetchIncomes = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/api/income-by-customer/');
      setIncomes(response.data);
    } catch (error) {
      logger.error('Error fetching incomes:', error);
      toast.error('Failed to fetch incomes');
    }
    setLoading(false);
  };

  const columns = [
    { id: 'customerName', label: 'Customer', minWidth: 170 },
    { id: 'email', label: 'Email', minWidth: 170 },
    { id: 'phone', label: 'Phone', minWidth: 130 },
    {
      id: 'total_income',
      label: 'Total Income',
      minWidth: 100,
      align: 'right',
      format: (value) => `$${value.toFixed(2)}`,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">
        Income by Customer
      </h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.id}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      column.align === 'right' ? 'text-right' : 'text-left'
                    }`}
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
                  <td colSpan={4} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : (
                incomes.map((row) => (
                  <tr 
                    key={row.id} 
                    className="hover:bg-gray-50 transition-colors"
                    tabIndex={-1}
                  >
                    {columns.map((column) => {
                      const value = row[column.id];
                      return (
                        <td 
                          key={column.id} 
                          className={`px-6 py-4 whitespace-nowrap text-sm ${
                            column.align === 'right' ? 'text-right' : 'text-left'
                          }`}
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

export default IncomeByCustomer;
