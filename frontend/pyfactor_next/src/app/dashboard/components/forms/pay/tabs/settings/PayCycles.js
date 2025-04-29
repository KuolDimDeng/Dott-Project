'use client';

import React, { useState, useEffect } from 'react';

/**
 * PayCycles Component
 * Allows configuration of company payment cycles and schedules
 * Used within the PaySettings parent component
 */
const PayCycles = ({ userData }) => {
  const [loading, setLoading] = useState(true);
  const [payCycles, setPayCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Load pay cycle data
  useEffect(() => {
    const fetchPayCycles = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          // Sample data - would be fetched from API in production
          const samplePayCycles = [
            { 
              id: 1, 
              name: 'Bi-Weekly Standard', 
              frequency: 'bi-weekly', 
              payDay: 'Friday',
              periodStart: 'Monday',
              periodEnd: 'Sunday',
              isDefault: true,
              nextPayDate: '2023-07-28'
            },
            { 
              id: 2, 
              name: 'Monthly Executives', 
              frequency: 'monthly', 
              payDay: 'Last day of month',
              periodStart: '1st day of month',
              periodEnd: 'Last day of month',
              isDefault: false,
              nextPayDate: '2023-07-31'
            },
            { 
              id: 3, 
              name: 'Weekly Contractors', 
              frequency: 'weekly', 
              payDay: 'Friday',
              periodStart: 'Monday',
              periodEnd: 'Sunday',
              isDefault: false,
              nextPayDate: '2023-07-21'
            }
          ];
          
          setPayCycles(samplePayCycles);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('[PayCycles] Error fetching pay cycles:', error);
        setLoading(false);
      }
    };
    
    fetchPayCycles();
  }, []);
  
  const handleSelectCycle = (cycle) => {
    setSelectedCycle(cycle);
    setIsEditing(false);
  };
  
  const handleEditCycle = () => {
    setIsEditing(true);
  };
  
  const handleSaveCycle = async () => {
    setIsSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the pay cycles list with the edited cycle
      setPayCycles(cycles => 
        cycles.map(c => c.id === selectedCycle.id ? selectedCycle : c)
      );
      
      setIsSaving(false);
      setIsEditing(false);
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('[PayCycles] Error saving pay cycle:', error);
      setIsSaving(false);
    }
  };
  
  const handleCancelEdit = () => {
    // Reset any changes by re-selecting the original cycle from the list
    const originalCycle = payCycles.find(c => c.id === selectedCycle.id);
    setSelectedCycle(originalCycle);
    setIsEditing(false);
  };
  
  const handleInputChange = (field, value) => {
    setSelectedCycle(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Pay Cycles List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Payment Cycles</h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {payCycles.map((cycle) => (
            <li 
              key={cycle.id}
              className={`px-4 py-4 cursor-pointer hover:bg-gray-50 ${selectedCycle?.id === cycle.id ? 'bg-blue-50' : ''}`}
              onClick={() => handleSelectCycle(cycle)}
            >
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{cycle.name}</p>
                  <p className="text-sm text-gray-500">{cycle.frequency} payments</p>
                </div>
                {cycle.isDefault && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Default
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Pay Cycle Details */}
      <div className="md:col-span-2">
        {selectedCycle ? (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Pay Cycle Details</h3>
              {!isEditing && (
                <button
                  type="button"
                  onClick={handleEditCycle}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Edit
                </button>
              )}
            </div>
            
            <div className="px-4 py-5 sm:p-6">
              {saveSuccess && (
                <div className="mb-4 rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">Pay cycle updated successfully</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={selectedCycle.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{selectedCycle.name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Frequency</label>
                  {isEditing ? (
                    <select
                      value={selectedCycle.frequency}
                      onChange={(e) => handleInputChange('frequency', e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="bi-weekly">Bi-Weekly</option>
                      <option value="semi-monthly">Semi-Monthly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{selectedCycle.frequency}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Pay Day</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={selectedCycle.payDay}
                      onChange={(e) => handleInputChange('payDay', e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{selectedCycle.payDay}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Next Pay Date</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedCycle.nextPayDate}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Period Start</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={selectedCycle.periodStart}
                      onChange={(e) => handleInputChange('periodStart', e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{selectedCycle.periodStart}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Period End</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={selectedCycle.periodEnd}
                      onChange={(e) => handleInputChange('periodEnd', e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{selectedCycle.periodEnd}</p>
                  )}
                </div>
                
                {isEditing && (
                  <div className="sm:col-span-2">
                    <div className="flex items-center">
                      <input
                        id="default-cycle"
                        name="default-cycle"
                        type="checkbox"
                        checked={selectedCycle.isDefault}
                        onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="default-cycle" className="ml-2 block text-sm text-gray-900">
                        Set as default payment cycle
                      </label>
                    </div>
                  </div>
                )}
              </div>
              
              {isEditing && (
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCycle}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6 flex items-center justify-center text-gray-500">
            Select a payment cycle to view or edit details
          </div>
        )}
      </div>
    </div>
  );
};

export default PayCycles; 