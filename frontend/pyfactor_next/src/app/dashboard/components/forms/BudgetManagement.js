import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      className={`${value !== index ? 'hidden' : ''}`}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}

const BudgetManagement = () => {
  const [value, setValue] = useState(0);
  const [budgets, setBudgets] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    period: '',
    start_date: '',
    end_date: '',
    department: '',
    notes: '',
    items: [],
  });

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const response = await axiosInstance.get('/api/finance/budgets/');
      setBudgets(response.data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  };

  const handleChange = (newValue) => {
    setValue(newValue);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, items: updatedItems });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { account_code: '', account_name: '', budgeted_amount: 0 }],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedBudget) {
        await axiosInstance.put(`/api/finance/budgets/${selectedBudget.id}/`, formData);
      } else {
        await axiosInstance.post('/api/finance/budgets/', formData);
      }
      fetchBudgets();
      setFormData({
        name: '',
        period: '',
        start_date: '',
        end_date: '',
        department: '',
        notes: '',
        items: [],
      });
      setSelectedBudget(null);
      setValue(1); // Switch to the List tab
    } catch (error) {
      console.error('Error saving budget:', error);
    }
  };

  const handleEdit = (budget) => {
    setSelectedBudget(budget);
    setFormData(budget);
    setValue(0); // Switch to the Create/Edit tab
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await axiosInstance.delete(`/api/finance/budgets/${id}/`);
        fetchBudgets();
      } catch (error) {
        console.error('Error deleting budget:', error);
      }
    }
  };

  // Format date for input type="date"
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-4">
          <button
            className={`py-2 px-4 font-medium ${
              value === 0
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleChange(0)}
          >
            Create/Edit Budget
          </button>
          <button
            className={`py-2 px-4 font-medium ${
              value === 1
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleChange(1)}
          >
            Budget List
          </button>
          <button
            className={`py-2 px-4 font-medium ${
              value === 2
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleChange(2)}
          >
            Budget Details
          </button>
          <button
            className={`py-2 px-4 font-medium ${
              value === 3
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleChange(3)}
          >
            Budget vs Actual
          </button>
        </div>
      </div>

      {/* Create/Edit Budget Panel */}
      <TabPanel value={value} index={0}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Budget Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-1">
              Period
            </label>
            <select
              id="period"
              name="period"
              value={formData.period}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="">Select a period</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>

          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              value={formatDate(formData.start_date)}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              id="end_date"
              name="end_date"
              type="date"
              value={formatDate(formData.end_date)}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <input
              id="department"
              name="department"
              type="text"
              value={formData.department}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Budget Items</h2>
            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={index} className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Code
                    </label>
                    <input
                      type="text"
                      value={item.account_code}
                      onChange={(e) => handleItemChange(index, 'account_code', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={item.account_name}
                      onChange={(e) => handleItemChange(index, 'account_name', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Budgeted Amount
                    </label>
                    <input
                      type="number"
                      value={item.budgeted_amount}
                      onChange={(e) => handleItemChange(index, 'budgeted_amount', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="mt-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Add Budget Item
            </button>
          </div>

          <div className="mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {selectedBudget ? 'Update Budget' : 'Create Budget'}
            </button>
          </div>
        </form>
      </TabPanel>

      {/* Budget List Panel */}
      <TabPanel value={value} index={1}>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  End Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {budgets.map((budget) => (
                <tr key={budget.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {budget.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {budget.period}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {budget.start_date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {budget.end_date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {budget.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(budget)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
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

      {/* Budget Details Panel */}
      <TabPanel value={value} index={2}>
        <p className="text-gray-700">Select a budget from the list to view details.</p>
      </TabPanel>

      {/* Budget vs Actual Panel */}
      <TabPanel value={value} index={3}>
        <p className="text-gray-700">Budget vs Actual comparison will be shown here.</p>
      </TabPanel>
    </div>
  );
};

export default BudgetManagement;