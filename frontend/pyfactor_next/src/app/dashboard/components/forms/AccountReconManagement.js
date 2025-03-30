import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';

const AccountReconManagement = () => {
  const [reconciliations, setReconciliations] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    bank_account: '',
    reconciliation_date: null,
    statement_balance: '',
    book_balance: '',
  });

  useEffect(() => {
    fetchReconciliations();
  }, []);

  const fetchReconciliations = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/api/finance/reconciliations/');
      setReconciliations(response.data);
    } catch (error) {
      console.error('Failed to fetch reconciliations', error);
    }
    setLoading(false);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleDateChange = (e) => {
    setFormData({ ...formData, reconciliation_date: e.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await axiosInstance.post('/api/finance/reconciliations/', formData);
      console.log('Reconciliation created successfully');
      setFormData({
        bank_account: '',
        reconciliation_date: null,
        statement_balance: '',
        book_balance: '',
      });
      fetchReconciliations();
    } catch (error) {
      console.error('Failed to create reconciliation', error);
    }
  };

  const handleReconcile = (id) => {
    // Implement reconciliation logic here
    console.info('Reconciliation feature not implemented yet');
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Account Reconciliation</h1>
      
      <form onSubmit={handleSubmit} className="mb-6 bg-white p-4 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="bank_account" className="block text-sm font-medium text-gray-700 mb-1">
              Bank Account ID
            </label>
            <input
              id="bank_account"
              name="bank_account"
              type="text"
              className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={formData.bank_account}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div>
            <label htmlFor="reconciliation_date" className="block text-sm font-medium text-gray-700 mb-1">
              Reconciliation Date
            </label>
            <input
              id="reconciliation_date"
              name="reconciliation_date"
              type="date"
              className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={formData.reconciliation_date || ''}
              onChange={handleDateChange}
              required
            />
          </div>
          
          <div>
            <label htmlFor="statement_balance" className="block text-sm font-medium text-gray-700 mb-1">
              Statement Balance
            </label>
            <input
              id="statement_balance"
              name="statement_balance"
              type="number"
              step="0.01"
              className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={formData.statement_balance}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div>
            <label htmlFor="book_balance" className="block text-sm font-medium text-gray-700 mb-1">
              Book Balance
            </label>
            <input
              id="book_balance"
              name="book_balance"
              type="number"
              step="0.01"
              className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={formData.book_balance}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>
        
        <div className="mt-4">
          <button 
            type="submit" 
            className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Create Reconciliation
          </button>
        </div>
      </form>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bank Account
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reconciliation Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statement Balance
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Book Balance
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    </div>
                  </td>
                </tr>
              ) : reconciliations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No reconciliations found
                  </td>
                </tr>
              ) : (
                reconciliations.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.bank_account.account_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.reconciliation_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.statement_balance}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.book_balance}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${row.is_reconciled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {row.is_reconciled ? 'Reconciled' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button 
                        onClick={() => handleReconcile(row.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Reconcile
                      </button>
                    </td>
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

export default AccountReconManagement;