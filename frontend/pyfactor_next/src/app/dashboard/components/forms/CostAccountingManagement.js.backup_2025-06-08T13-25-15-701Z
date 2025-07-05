import React, { useState, useEffect } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
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
          {children}
        </div>
      )}
    </div>
  );
}

const CostAccountingManagement = () => {
  const [value, setValue] = useState(0);
  const [costEntries, setCostEntries] = useState([]);
  const [costCategories, setCostCategories] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    cost_type: '',
    cost_nature: '',
    amount: '',
    date: '',
    department: '',
    project: '',
    cost_driver: '',
    job_process_id: '',
    budgeted_amount: '',
    notes: '',
    allocations: [],
  });

  useEffect(() => {
    fetchCostEntries();
    fetchCostCategories();
  }, []);

  const fetchCostEntries = async () => {
    try {
      const response = await axiosInstance.get('/api/finance/cost-entries/');
      setCostEntries(response.data);
    } catch (error) {
      console.error('Error fetching cost entries:', error);
    }
  };

  const fetchCostCategories = async () => {
    try {
      const response = await axiosInstance.get('/api/finance/cost-categories/');
      setCostCategories(response.data);
    } catch (error) {
      console.error('Error fetching cost categories:', error);
    }
  };

  const handleChange = (newValue) => {
    setValue(newValue);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAllocationChange = (index, field, value) => {
    const updatedAllocations = [...formData.allocations];
    updatedAllocations[index] = { ...updatedAllocations[index], [field]: value };
    setFormData({ ...formData, allocations: updatedAllocations });
  };

  const handleAddAllocation = () => {
    setFormData({
      ...formData,
      allocations: [
        ...formData.allocations,
        { allocation_base: '', allocation_percentage: '', allocated_amount: '' },
      ],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedEntry) {
        await axiosInstance.put(`/api/finance/cost-entries/${selectedEntry.cost_id}/`, formData);
      } else {
        await axiosInstance.post('/api/finance/cost-entries/', formData);
      }
      fetchCostEntries();
      setFormData({
        description: '',
        category: '',
        cost_type: '',
        cost_nature: '',
        amount: '',
        date: '',
        department: '',
        project: '',
        cost_driver: '',
        job_process_id: '',
        budgeted_amount: '',
        notes: '',
        allocations: [],
      });
      setSelectedEntry(null);
      setValue(1); // Switch to the List tab
    } catch (error) {
      console.error('Error saving cost entry:', error);
    }
  };

  const handleEdit = (entry) => {
    setSelectedEntry(entry);
    setFormData(entry);
    setValue(0); // Switch to the Create/Edit tab
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this cost entry?')) {
      try {
        await axiosInstance.delete(`/api/finance/cost-entries/${id}/`);
        fetchCostEntries();
      } catch (error) {
        console.error('Error deleting cost entry:', error);
      }
    }
  };

  const renderCostBreakdownChart = () => {
    const data = {
      labels: ['Direct Costs', 'Indirect Costs'],
      datasets: [
        {
          data: [
            costEntries
              .filter((entry) => entry.cost_type === 'direct')
              .reduce((sum, entry) => sum + parseFloat(entry.amount), 0),
            costEntries
              .filter((entry) => entry.cost_type === 'indirect')
              .reduce((sum, entry) => sum + parseFloat(entry.amount), 0),
          ],
          backgroundColor: ['#FF6384', '#36A2EB'],
          hoverBackgroundColor: ['#FF6384', '#36A2EB'],
        },
      ],
    };

    return <Pie data={data} />;
  };

  const renderCostVarianceChart = () => {
    const data = {
      labels: costEntries.map((entry) => entry.description),
      datasets: [
        {
          label: 'Actual Cost',
          data: costEntries.map((entry) => entry.amount),
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
        },
        {
          label: 'Budgeted Cost',
          data: costEntries.map((entry) => entry.budgeted_amount),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
        },
      ],
    };

    const options = {
      scales: {
        y: {
          beginAtZero: true,
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
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out focus:outline-none ${
              value === 0
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleChange(0)}
          >
            Create/Edit Cost Entry
          </button>
          <button
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out focus:outline-none ${
              value === 1
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleChange(1)}
          >
            Cost Entry List
          </button>
          <button
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out focus:outline-none ${
              value === 2
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleChange(2)}
          >
            Cost Analysis
          </button>
          <button
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out focus:outline-none ${
              value === 3
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleChange(3)}
          >
            Cost Allocation
          </button>
        </nav>
      </div>
      <TabPanel value={value} index={0}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              id="description"
              name="description"
              type="text"
              value={formData.description}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select a category</option>
              {costCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="cost_type" className="block text-sm font-medium text-gray-700 mb-1">
              Cost Type
            </label>
            <select
              id="cost_type"
              name="cost_type"
              value={formData.cost_type}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select cost type</option>
              <option value="direct">Direct</option>
              <option value="indirect">Indirect</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="cost_nature" className="block text-sm font-medium text-gray-700 mb-1">
              Cost Nature
            </label>
            <select
              id="cost_nature"
              name="cost_nature"
              value={formData.cost_nature}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select cost nature</option>
              <option value="fixed">Fixed</option>
              <option value="variable">Variable</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <input
              id="project"
              name="project"
              type="text"
              value={formData.project}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="cost_driver" className="block text-sm font-medium text-gray-700 mb-1">
              Cost Driver
            </label>
            <input
              id="cost_driver"
              name="cost_driver"
              type="text"
              value={formData.cost_driver}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="job_process_id" className="block text-sm font-medium text-gray-700 mb-1">
              Job/Process ID
            </label>
            <input
              id="job_process_id"
              name="job_process_id"
              type="text"
              value={formData.job_process_id}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="budgeted_amount" className="block text-sm font-medium text-gray-700 mb-1">
              Budgeted Amount
            </label>
            <input
              id="budgeted_amount"
              name="budgeted_amount"
              type="number"
              value={formData.budgeted_amount}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows="4"
              value={formData.notes}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            ></textarea>
          </div>
          
          <div>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {selectedEntry ? 'Update Cost Entry' : 'Create Cost Entry'}
            </button>
          </div>
        </form>
      </TabPanel>
      <TabPanel value={value} index={1}>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {costEntries.length > 0 ? (
                costEntries.map((entry) => (
                  <tr key={entry.cost_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {costCategories.find((cat) => cat.id === entry.category)?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`capitalize ${entry.cost_type === 'direct' ? 'text-green-600' : 'text-blue-600'}`}>
                        {entry.cost_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${entry.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEdit(entry)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(entry.cost_id)}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-sm text-gray-500 text-center">
                    No cost entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </TabPanel>
      <TabPanel value={value} index={2}>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Cost Breakdown
        </h2>
        <div className="mb-8 max-w-lg mx-auto">
          {renderCostBreakdownChart()}
        </div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Cost Variance Analysis
        </h2>
        <div className="max-w-4xl mx-auto">
          {renderCostVarianceChart()}
        </div>
      </TabPanel>
      <TabPanel value={value} index={3}>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Cost Allocation
        </h2>
        <div className="space-y-4">
          {formData.allocations.map((allocation, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allocation Base
                </label>
                <input
                  type="text"
                  value={allocation.allocation_base}
                  onChange={(e) => handleAllocationChange(index, 'allocation_base', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allocation Percentage
                </label>
                <input
                  type="number"
                  value={allocation.allocation_percentage}
                  onChange={(e) => handleAllocationChange(index, 'allocation_percentage', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allocated Amount
                </label>
                <input
                  type="number"
                  value={allocation.allocated_amount}
                  onChange={(e) => handleAllocationChange(index, 'allocated_amount', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleAddAllocation}
          className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Allocation
        </button>
      </TabPanel>
    </div>
  );
};

export default CostAccountingManagement;
