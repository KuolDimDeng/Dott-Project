import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <div className="p-6">
          <div>{children}</div>
        </div>
      )}
    </div>
  );
}

const IntercompanyManagement = () => {
  const [value, setValue] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [formData, setFormData] = useState({
    transaction_type: '',
    entity_from: '',
    entity_to: '',
    amount: '',
    currency: '',
    converted_amount: '',
    exchange_rate: '',
    date: '',
    document_reference: '',
    reconciliation_status: '',
    transfer_pricing: '',
    notes: '',
  });

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axiosInstance.get('/api/finance/intercompany-transactions/');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching intercompany transactions:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await axiosInstance.get('/api/finance/intercompany-accounts/');
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching intercompany accounts:', error);
    }
  };

  const handleChange = (newValue) => {
    setValue(newValue);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedTransaction) {
        await axiosInstance.put(
          `/api/finance/intercompany-transactions/${selectedTransaction.transaction_id}/`,
          formData
        );
      } else {
        await axiosInstance.post('/api/finance/intercompany-transactions/', formData);
      }
      fetchTransactions();
      setFormData({
        transaction_type: '',
        entity_from: '',
        entity_to: '',
        amount: '',
        currency: '',
        converted_amount: '',
        exchange_rate: '',
        date: '',
        document_reference: '',
        reconciliation_status: '',
        transfer_pricing: '',
        notes: '',
      });
      setSelectedTransaction(null);
      setValue(1); // Switch to the List tab
    } catch (error) {
      console.error('Error saving intercompany transaction:', error);
    }
  };

  const handleEdit = (transaction) => {
    setSelectedTransaction(transaction);
    setFormData(transaction);
    setValue(0); // Switch to the Create/Edit tab
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await axiosInstance.delete(`/api/finance/intercompany-transactions/${id}/`);
        fetchTransactions();
      } catch (error) {
        console.error('Error deleting intercompany transaction:', error);
      }
    }
  };

  const renderTransactionVolumeChart = () => {
    const data = {
      labels: ['Sales', 'Purchases', 'Loans', 'Asset Transfers', 'Services', 'Cost Allocations'],
      datasets: [
        {
          label: 'Transaction Volume',
          data: [
            transactions.filter((t) => t.transaction_type === 'sale').length,
            transactions.filter((t) => t.transaction_type === 'purchase').length,
            transactions.filter((t) => t.transaction_type === 'loan').length,
            transactions.filter((t) => t.transaction_type === 'asset_transfer').length,
            transactions.filter((t) => t.transaction_type === 'service').length,
            transactions.filter((t) => t.transaction_type === 'cost_allocation').length,
          ],
          backgroundColor: 'rgba(75,192,192,0.6)',
        },
      ],
    };

    const options = {
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Transactions',
          },
        },
      },
    };

    return <Bar data={data} options={options} />;
  };

  return (
    <div className="w-full">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            className={`py-2 px-4 font-medium text-sm mr-2 ${
              value === 0
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleChange(0)}
          >
            Create/Edit Transaction
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm mr-2 ${
              value === 1
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleChange(1)}
          >
            Transaction List
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm mr-2 ${
              value === 2
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleChange(2)}
          >
            Transaction Analysis
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm ${
              value === 3
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleChange(3)}
          >
            Account Balances
          </button>
        </nav>
      </div>
      
      <TabPanel value={value} index={0}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="w-full">
            <label htmlFor="transaction_type" className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type
            </label>
            <select
              id="transaction_type"
              name="transaction_type"
              value={formData.transaction_type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Transaction Type</option>
              <option value="sale">Sale</option>
              <option value="purchase">Purchase</option>
              <option value="loan">Loan</option>
              <option value="asset_transfer">Asset Transfer</option>
              <option value="service">Service</option>
              <option value="cost_allocation">Cost Allocation</option>
            </select>
          </div>
          
          <div className="w-full">
            <label htmlFor="entity_from" className="block text-sm font-medium text-gray-700 mb-1">
              From Entity
            </label>
            <input
              type="text"
              id="entity_from"
              name="entity_from"
              value={formData.entity_from}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="w-full">
            <label htmlFor="entity_to" className="block text-sm font-medium text-gray-700 mb-1">
              To Entity
            </label>
            <input
              type="text"
              id="entity_to"
              name="entity_to"
              value={formData.entity_to}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="w-full">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="w-full">
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <input
              type="text"
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="w-full">
            <label htmlFor="converted_amount" className="block text-sm font-medium text-gray-700 mb-1">
              Converted Amount
            </label>
            <input
              type="number"
              id="converted_amount"
              name="converted_amount"
              value={formData.converted_amount}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="w-full">
            <label htmlFor="exchange_rate" className="block text-sm font-medium text-gray-700 mb-1">
              Exchange Rate
            </label>
            <input
              type="number"
              id="exchange_rate"
              name="exchange_rate"
              value={formData.exchange_rate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="w-full">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="w-full">
            <label htmlFor="document_reference" className="block text-sm font-medium text-gray-700 mb-1">
              Document Reference
            </label>
            <input
              type="text"
              id="document_reference"
              name="document_reference"
              value={formData.document_reference}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="w-full">
            <label htmlFor="reconciliation_status" className="block text-sm font-medium text-gray-700 mb-1">
              Reconciliation Status
            </label>
            <select
              id="reconciliation_status"
              name="reconciliation_status"
              value={formData.reconciliation_status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Status</option>
              <option value="unmatched">Unmatched</option>
              <option value="matched">Matched</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          
          <div className="w-full">
            <label htmlFor="transfer_pricing" className="block text-sm font-medium text-gray-700 mb-1">
              Transfer Pricing
            </label>
            <textarea
              id="transfer_pricing"
              name="transfer_pricing"
              value={formData.transfer_pricing}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="w-full">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {selectedTransaction ? 'Update Transaction' : 'Create Transaction'}
          </button>
        </form>
      </TabPanel>
      
      <TabPanel value={value} index={1}>
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.transaction_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{transaction.transaction_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{transaction.transaction_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{transaction.entity_from}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{transaction.entity_to}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{`${transaction.amount} ${transaction.currency}`}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{transaction.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{transaction.reconciliation_status}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => handleEdit(transaction)} 
                      className="text-blue-600 hover:text-blue-900 mr-2"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(transaction.transaction_id)} 
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabPanel>
      
      <TabPanel value={value} index={2}>
        <h6 className="text-lg font-medium mb-4">
          Transaction Volume by Type
        </h6>
        <div className="h-96">
          {renderTransactionVolumeChart()}
        </div>
      </TabPanel>
      
      <TabPanel value={value} index={3}>
        <h6 className="text-lg font-medium mb-4">
          Intercompany Account Balances
        </h6>
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{account.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{account.account_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{account.entity}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{account.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabPanel>
    </div>
  );
};

export default IntercompanyManagement;