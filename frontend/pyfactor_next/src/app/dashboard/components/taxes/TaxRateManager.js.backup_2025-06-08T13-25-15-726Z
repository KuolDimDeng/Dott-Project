// components/taxes/TaxRatesManager.js
import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { axiosInstance } from '@/lib/axiosConfig';

const TaxRatesManager = () => {
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [taxRates, setTaxRates] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentRate, setCurrentRate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  
  useEffect(() => {
    fetchStates();
  }, []);
  
  useEffect(() => {
    if (selectedState) {
      fetchTaxRates();
    }
  }, [selectedState, taxYear]);
  
  const fetchStates = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get('/api/taxes/states/');
      setStates(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching states:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching states',
        severity: 'error'
      });
      setIsLoading(false);
    }
  };
  
  const fetchTaxRates = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(`/api/taxes/states/${selectedState}/tax_rates/`, {
        params: { tax_year: taxYear }
      });
      setTaxRates(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching tax rates:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching tax rates',
        severity: 'error'
      });
      setIsLoading(false);
    }
  };
  
  const handleOpenDialog = (rate = null) => {
    setCurrentRate(rate || {
      state: selectedState,
      tax_year: taxYear,
      effective_date: new Date().toISOString().split('T')[0],
      is_flat_rate: true,
      rate_value: 0,
      filing_status: 'single'
    });
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentRate(null);
  };
  
  const handleSaveRate = async () => {
    try {
      setIsLoading(true);
      
      // Format the data
      const rateData = {
        ...currentRate,
        rate_value: parseFloat(currentRate.rate_value),
        income_min: currentRate.income_min ? parseFloat(currentRate.income_min) : null,
        income_max: currentRate.income_max ? parseFloat(currentRate.income_max) : null,
      };
      
      if (currentRate.id) {
        // Update existing rate
        await axiosInstance.put(`/api/taxes/tax-rates/${currentRate.id}/`, rateData);
        setSnackbar({
          open: true,
          message: 'Tax rate updated successfully',
          severity: 'success'
        });
      } else {
        // Create new rate
        await axiosInstance.post('/api/taxes/tax-rates/', rateData);
        setSnackbar({
          open: true,
          message: 'Tax rate created successfully',
          severity: 'success'
        });
      }
      
      handleCloseDialog();
      fetchTaxRates();
    } catch (error) {
      console.error('Error saving tax rate:', error);
      setSnackbar({
        open: true,
        message: 'Error saving tax rate',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setCurrentRate(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const renderServiceType = (state) => {
    if (state.service_type === 'full') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-main text-white">Full-Service</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-main text-white">Self-Service</span>;
    }
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Tax Rates Manager
      </h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div>
            <label htmlFor="state-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              State
            </label>
            <select
              id="state-select"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-main focus:border-primary-main sm:text-sm"
            >
              <option value="">Select a State</option>
              {states.map(state => (
                <option key={state.id} value={state.id}>
                  {state.name} ({state.code})
                  {state.full_service_enabled ? ' - Full Service' : ' - Self Service'}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="tax-year" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tax Year
            </label>
            <input
              id="tax-year"
              type="number"
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-main focus:border-primary-main sm:text-sm"
            />
          </div>
          
          <div className="flex items-end h-full">
            <button 
              onClick={() => handleOpenDialog()}
              disabled={!selectedState}
              className="w-full py-2 px-4 bg-primary-main hover:bg-primary-dark text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Add New Tax Rate
            </button>
          </div>
        </div>
      </div>
      
      {selectedState && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Filing Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tax Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Income Range</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Effective Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {taxRates.length > 0 ? (
                  taxRates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {rate.filing_status.replace('_', ' ').charAt(0).toUpperCase() + 
                         rate.filing_status.replace('_', ' ').slice(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {rate.is_flat_rate ? 'Flat Rate' : 'Progressive'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {(rate.rate_value * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {rate.is_flat_rate 
                          ? 'All Income' 
                          : rate.income_max 
                            ? `$${rate.income_min.toLocaleString()} - $${rate.income_max.toLocaleString()}`
                            : `$${rate.income_min.toLocaleString()}+`
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {new Date(rate.effective_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <button 
                          onClick={() => handleOpenDialog(rate)}
                          className="text-primary-main hover:text-primary-dark font-medium hover:underline"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No tax rates found for this state and year.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Modal Dialog */}
      <Transition appear show={openDialog} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={handleCloseDialog}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title 
                    as="h3" 
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4"
                  >
                    {currentRate?.id ? 'Edit Tax Rate' : 'Add New Tax Rate'}
                  </Dialog.Title>
                  
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="filing-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Filing Status
                      </label>
                      <select
                        id="filing-status"
                        name="filing_status"
                        value={currentRate?.filing_status || 'single'}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-main focus:border-primary-main sm:text-sm"
                      >
                        <option value="single">Single</option>
                        <option value="married_joint">Married Filing Jointly</option>
                        <option value="married_separate">Married Filing Separately</option>
                        <option value="head_household">Head of Household</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="effective-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Effective Date
                      </label>
                      <input
                        id="effective-date"
                        name="effective_date"
                        type="date"
                        value={currentRate?.effective_date || ''}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-main focus:border-primary-main sm:text-sm"
                      />
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="is_flat_rate"
                          checked={currentRate?.is_flat_rate || false}
                          onChange={handleInputChange}
                          className="rounded border-gray-300 text-primary-main focus:ring-primary-main h-4 w-4"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Flat Tax Rate</span>
                      </label>
                    </div>
                    
                    <div>
                      <label htmlFor="rate-value" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tax Rate (decimal)
                      </label>
                      <input
                        id="rate-value"
                        name="rate_value"
                        type="number"
                        step="0.0001"
                        min="0"
                        max="1"
                        value={currentRate?.rate_value || 0}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-main focus:border-primary-main sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Enter as decimal (e.g., 0.05 for 5%)</p>
                    </div>
                    
                    {!currentRate?.is_flat_rate && (
                      <>
                        <div>
                          <label htmlFor="income-min" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Minimum Income
                          </label>
                          <input
                            id="income-min"
                            name="income_min"
                            type="number"
                            min="0"
                            value={currentRate?.income_min || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-main focus:border-primary-main sm:text-sm"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="income-max" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Maximum Income (leave blank for highest bracket)
                          </label>
                          <input
                            id="income-max"
                            name="income_max"
                            type="number"
                            min="0"
                            value={currentRate?.income_max || ''}
                            onChange={handleInputChange}
                            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-main focus:border-primary-main sm:text-sm"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCloseDialog}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-main"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveRate}
                      disabled={isLoading}
                      className="px-4 py-2 bg-primary-main hover:bg-primary-dark text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      
      {/* Toast Notification */}
      {snackbar.open && (
        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-md shadow-lg ${
          snackbar.severity === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          snackbar.severity === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <div className="flex items-center">
            <span>{snackbar.message}</span>
            <button 
              onClick={() => setSnackbar({ ...snackbar, open: false })}
              className="ml-4 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxRatesManager;