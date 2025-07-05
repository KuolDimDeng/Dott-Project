import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

const UnpaidInvoicesList = ({ onSelect }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const toast = useToast();

  const fetchInvoices = async (pageNum) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('https://127.0.0.1:8000/api/unpaid-invoices/', {
        params: { page: pageNum, page_size: 10 },
      });
      if (pageNum === 1) {
        setInvoices(response.data.results);
      } else {
        setInvoices((prev) => [...prev, ...response.data.results]);
      }
      setHasMore(response.data.next);
    } catch (error) {
      console.error('Error fetching unpaid invoices:', error);
      toast.error(`Error fetching unpaid invoices: ${error.message}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices(1);
  }, []);

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
      fetchInvoices(page + 1);
    }
  };

  return (
    <div className="max-h-[300px] overflow-auto">
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {invoices.map((invoice) => (
          <li 
            key={invoice.id} 
            className="py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            onClick={() => onSelect(invoice)}
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Invoice #{invoice.id}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Amount: ${invoice.amount} - Date: {invoice.date}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {loading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-main"></div>
        </div>
      )}
      {!loading && hasMore && (
        <button 
          onClick={loadMore}
          className="w-full py-2 px-4 mt-2 bg-primary-main hover:bg-primary-dark text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50 dark:bg-primary-dark dark:hover:bg-primary-main"
        >
          Load More
        </button>
      )}
    </div>
  );
};

export default UnpaidInvoicesList;
