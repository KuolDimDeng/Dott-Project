import React, { useState } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';

const RefundForm = () => {
  const [refund, setRefund] = useState({
    sale: '',
    amount: '',
    reason: '',
  });

  const handleChange = (e) => {
    setRefund({ ...refund, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await useApi.post('/api/refunds/create/', refund);
      console.log('Refund created:', response.data);
      // Handle success (e.g., show a success message, clear the form)
    } catch (error) {
      console.error('Error creating refund:', error);
      // Handle error (e.g., show an error message)
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Create Refund</h2>
        </div>
        
        <div>
          <label htmlFor="sale" className="block text-sm font-medium text-gray-700 mb-1">
            Sale ID
          </label>
          <input
            type="text"
            id="sale"
            name="sale"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={refund.sale}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Refund Amount
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={refund.amount}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
            Refund Reason
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={refund.reason}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Refund
          </button>
        </div>
      </div>
    </form>
  );
};

export default RefundForm;
