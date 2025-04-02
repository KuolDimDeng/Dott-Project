// In BusinessSettings.js

import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

const CustomChargeSettings = () => {
  const [customPlans, setCustomPlans] = useState([]);
  const [newPlan, setNewPlan] = useState({ name: '', quantity: 0, unit: '', period: '', price: 0 });
  const toast = useToast();

  useEffect(() => {
    fetchCustomPlans();
  }, []);

  const fetchCustomPlans = async () => {
    try {
      const response = await axiosInstance.get('/api/custom-charge-plans/');
      setCustomPlans(response.data);
    } catch (error) {
      toast.error('Error fetching custom charge plans');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPlan((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreatePlan = async () => {
    try {
      await axiosInstance.post('/api/custom-charge-plans/', newPlan);
      toast.success('Custom charge plan created successfully');
      fetchCustomPlans();
      setNewPlan({ name: '', quantity: 0, unit: '', period: '', price: 0 });
    } catch (error) {
      toast.error('Error creating custom charge plan');
    }
  };

  const handleDeletePlan = async (planId) => {
    try {
      await axiosInstance.delete(`/api/custom-charge-plans/${planId}/`);
      toast.success('Custom charge plan deleted successfully');
      fetchCustomPlans();
    } catch (error) {
      toast.error('Error deleting custom charge plan');
    }
  };

  return (
    <div className="w-full">
      <h6 className="text-lg font-medium mb-4">
        Custom Charge Settings
      </h6>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="col-span-1">
          <label htmlFor="plan-name" className="block text-sm font-medium text-gray-700 mb-1">
            Plan Name
          </label>
          <input
            id="plan-name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            name="name"
            value={newPlan.name}
            onChange={handleInputChange}
          />
        </div>
        <div className="col-span-1">
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
            Quantity
          </label>
          <input
            id="quantity"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            name="quantity"
            type="number"
            value={newPlan.quantity}
            onChange={handleInputChange}
          />
        </div>
        <div className="col-span-1">
          <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
            Unit
          </label>
          <input
            id="unit"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            name="unit"
            value={newPlan.unit}
            onChange={handleInputChange}
          />
        </div>
        <div className="col-span-1">
          <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-1">
            Period
          </label>
          <input
            id="period"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            name="period"
            value={newPlan.period}
            onChange={handleInputChange}
          />
        </div>
        <div className="col-span-1">
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
            Price
          </label>
          <input
            id="price"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            name="price"
            type="number"
            value={newPlan.price}
            onChange={handleInputChange}
          />
        </div>
        <div className="col-span-1 sm:col-span-2">
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={handleCreatePlan}
          >
            Create Custom Plan
          </button>
        </div>
      </div>
      <ul className="divide-y divide-gray-200">
        {customPlans.map((plan) => (
          <li key={plan.id} className="py-4 flex justify-between items-center">
            <div>
              <p className="text-base font-medium text-gray-900">{plan.name}</p>
              <p className="text-sm text-gray-500">
                {`${plan.quantity} ${plan.unit} per ${plan.period} - $${plan.price}`}
              </p>
            </div>
            <button
              className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded-full"
              onClick={() => handleDeletePlan(plan.id)}
              aria-label="delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CustomChargeSettings;