'use client';

import React, { useState, useEffect } from 'react';
import { jobService } from '@/services/jobService';
import { logger } from '@/utils/logger';
import { XMarkIcon } from '@heroicons/react/24/outline';
import SearchableCheckList from './SearchableCheckList';

const JobForm = ({ job, onClose, onSave, inline = false }) => {
  const [formData, setFormData] = useState({
    job_number: '',
    name: '',
    description: '',
    customer_id: '',
    status: 'quote',
    quote_date: new Date().toISOString().split('T')[0],
    scheduled_date: '',
    start_date: '',
    completion_date: '',
    quoted_amount: '',
    // Address fields
    job_street: '',
    job_city: '',
    job_state: '',
    job_zip: '',
    job_country: 'USA',
    notes: '',
    is_active: true,
    assigned_employees: [], // Multiple employees
    lead_employee_id: '', // Lead employee
    materials: [], // Selected materials/supplies
    vehicle_id: '' // Assigned vehicle
  });

  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatingNumber, setGeneratingNumber] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchEmployees();
    fetchSupplies();
    fetchVehicles();
    if (job) {
      setFormData({
        ...job,
        quote_date: job.quote_date?.split('T')[0] || '',
        scheduled_date: job.scheduled_date?.split('T')[0] || '',
        start_date: job.start_date?.split('T')[0] || '',
        completion_date: job.completion_date?.split('T')[0] || '',
        quoted_amount: job.quoted_amount || '',
        // Parse location back into fields
        job_street: job.job_street || '',
        job_city: job.job_city || '',
        job_state: job.job_state || '',
        job_zip: job.job_zip || '',
        job_country: job.job_country || 'USA',
        assigned_employees: job.assigned_employees || [],
        lead_employee_id: job.lead_employee_id || '',
        materials: job.materials || [],
        vehicle_id: job.vehicle_id || ''
      });
    } else {
      generateJobNumber();
    }
  }, [job]);

  const fetchCustomers = async () => {
    try {
      logger.info('[JobForm] Fetching customers...');
      const customersData = await jobService.getAvailableCustomers();
      logger.info('[JobForm] Customers received:', customersData);
      setCustomers(Array.isArray(customersData) ? customersData : []);
    } catch (err) {
      logger.error('Error fetching customers:', err);
      setError('Failed to load customers. Please try again.');
    }
  };

  const fetchEmployees = async () => {
    try {
      logger.info('[JobForm] Fetching employees...');
      const employeesData = await jobService.getAvailableEmployees();
      logger.info('[JobForm] Employees received:', employeesData);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (err) {
      logger.error('Error fetching employees:', err);
    }
  };

  const fetchSupplies = async () => {
    try {
      logger.info('[JobForm] Fetching supplies...');
      const suppliesData = await jobService.getAvailableSupplies();
      logger.info('[JobForm] Supplies received:', suppliesData);
      setSupplies(Array.isArray(suppliesData) ? suppliesData : []);
    } catch (err) {
      logger.error('Error fetching supplies:', err);
    }
  };

  const fetchVehicles = async () => {
    try {
      logger.info('[JobForm] Fetching vehicles...');
      // Check if vehicles endpoint exists
      const response = await fetch('/api/vehicles/', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const vehiclesData = await response.json();
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      }
    } catch (err) {
      logger.info('Vehicles feature not available');
      // Vehicles feature is optional
    }
  };

  const generateJobNumber = async () => {
    try {
      setGeneratingNumber(true);
      const jobNumber = await jobService.generateJobNumber();
      setFormData(prev => ({ ...prev, job_number: jobNumber }));
    } catch (err) {
      logger.error('Error generating job number:', err);
      // Show error to user
      setError('Failed to generate job number. Please try again.');
    } finally {
      setGeneratingNumber(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const dataToSubmit = {
        ...formData,
        quoted_amount: parseFloat(formData.quoted_amount) || 0
      };

      if (job) {
        await jobService.updateJob(job.id, dataToSubmit);
      } else {
        await jobService.createJob(dataToSubmit);
      }
      
      onSave();
    } catch (err) {
      logger.error('Error saving job:', err);
      setError(err.message || 'Failed to save job');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'quote', label: 'Quote' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'invoiced', label: 'Invoiced' },
    { value: 'paid', label: 'Paid' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'closed', label: 'Closed' }
  ];

  if (inline) {
    // Inline form variant
    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {job ? 'Edit Job' : 'Create New Job'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Job Number and Customer */}
            <div>
              <label htmlFor="job_number" className="block text-sm font-medium text-gray-700">
                Job Number * {!job && <span className="text-xs text-gray-500">(Auto-generated)</span>}
              </label>
              <input
                type="text"
                id="job_number"
                name="job_number"
                value={generatingNumber ? 'Generating...' : formData.job_number}
                onChange={handleChange}
                required
                readOnly={!job} // Read-only for new jobs (auto-generated)
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${!job ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                title={!job ? 'Job number is automatically generated' : 'Job number'}
              />
            </div>

            <div>
              <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700">
                Customer *
              </label>
              <select
                id="customer_id"
                name="customer_id"
                value={formData.customer_id}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customerName || customer.customer_name || customer.business_name || customer.name || 
                     `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 
                     customer.email || 'Unknown Customer'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Name */}
            <div className="lg:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Job Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., Kitchen Renovation, Roof Repair"
              />
            </div>

            {/* Quoted Amount */}
            <div>
              <label htmlFor="quoted_amount" className="block text-sm font-medium text-gray-700">
                Quoted Amount
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="quoted_amount"
                  name="quoted_amount"
                  value={formData.quoted_amount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="mt-1 block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Dates */}
            <div>
              <label htmlFor="quote_date" className="block text-sm font-medium text-gray-700">
                Quote Date
              </label>
              <input
                type="date"
                id="quote_date"
                name="quote_date"
                value={formData.quote_date}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="scheduled_date" className="block text-sm font-medium text-gray-700">
                Scheduled Date
              </label>
              <input
                type="date"
                id="scheduled_date"
                name="scheduled_date"
                value={formData.scheduled_date}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Job Address Fields */}
            <div className="lg:col-span-3">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Job Location</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="lg:col-span-2">
                  <label htmlFor="job_street" className="block text-sm font-medium text-gray-700">
                    Street Address
                  </label>
                  <input
                    type="text"
                    id="job_street"
                    name="job_street"
                    value={formData.job_street}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <label htmlFor="job_city" className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    id="job_city"
                    name="job_city"
                    value={formData.job_city}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Anytown"
                  />
                </div>
                <div>
                  <label htmlFor="job_state" className="block text-sm font-medium text-gray-700">
                    State/Province
                  </label>
                  <input
                    type="text"
                    id="job_state"
                    name="job_state"
                    value={formData.job_state}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="CA"
                  />
                </div>
                <div>
                  <label htmlFor="job_zip" className="block text-sm font-medium text-gray-700">
                    ZIP/Postal Code
                  </label>
                  <input
                    type="text"
                    id="job_zip"
                    name="job_zip"
                    value={formData.job_zip}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="90210"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="lg:col-span-3">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Detailed description of the work to be performed..."
              />
            </div>

            {/* Employee Assignment with Lead Selection */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Employees
              </label>
              <SearchableCheckList
                items={employees}
                selectedItems={formData.assigned_employees}
                onSelectionChange={(selected) => {
                  setFormData(prev => ({ ...prev, assigned_employees: selected }));
                  // If lead is no longer in selected, clear it
                  if (!selected.includes(formData.lead_employee_id)) {
                    setFormData(prev => ({ ...prev, lead_employee_id: '' }));
                  }
                }}
                searchPlaceholder="Search employees..."
                displayKey={(emp) => `${emp.user?.first_name || ''} ${emp.user?.last_name || ''} ${emp.user?.email ? `(${emp.user.email})` : ''}`}
                valueKey="id"
                maxHeight="200px"
                leadSelection={true}
                leadValue={formData.lead_employee_id}
                onLeadChange={(leadId) => setFormData(prev => ({ ...prev, lead_employee_id: leadId }))}
              />
            </div>

            {/* Vehicle Assignment */}
            <div>
              <label htmlFor="vehicle_id" className="block text-sm font-medium text-gray-700">
                Assigned Vehicle
              </label>
              <select
                id="vehicle_id"
                name="vehicle_id"
                value={formData.vehicle_id}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">No vehicle assigned</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} - {vehicle.registration_number}
                  </option>
                ))}
              </select>
            </div>

            {/* Materials/Supplies */}
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Materials/Supplies
              </label>
              <SearchableCheckList
                items={supplies}
                selectedItems={formData.materials}
                onSelectionChange={(selected) => setFormData(prev => ({ ...prev, materials: selected }))}
                searchPlaceholder="Search materials..."
                displayKey={(supply) => `${supply.name} - $${supply.unit_price} (${supply.quantity_on_hand} available)`}
                valueKey="id"
                maxHeight="200px"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (job ? 'Update Job' : 'Create Job')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Modal form variant
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {job ? 'Edit Job' : 'Create New Job'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Job Number */}
            <div>
              <label htmlFor="job_number" className="block text-sm font-medium text-gray-700">
                Job Number * {!job && <span className="text-xs text-gray-500">(Auto-generated)</span>}
              </label>
              <input
                type="text"
                id="job_number"
                name="job_number"
                value={generatingNumber ? 'Generating...' : formData.job_number}
                onChange={handleChange}
                required
                readOnly={!job} // Read-only for new jobs (auto-generated)
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${!job ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                title={!job ? 'Job number is automatically generated' : 'Job number'}
              />
            </div>

            {/* Customer */}
            <div>
              <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700">
                Customer *
              </label>
              <select
                id="customer_id"
                name="customer_id"
                value={formData.customer_id}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customerName || customer.customer_name || customer.business_name || customer.name || 
                     `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 
                     customer.email || 'Unknown Customer'}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Name */}
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Job Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Kitchen Renovation, Roof Repair"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Detailed description of the work to be performed..."
              />
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quoted Amount */}
            <div>
              <label htmlFor="quoted_amount" className="block text-sm font-medium text-gray-700">
                Quoted Amount
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="quoted_amount"
                  name="quoted_amount"
                  value={formData.quoted_amount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="mt-1 block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Quote Date */}
            <div>
              <label htmlFor="quote_date" className="block text-sm font-medium text-gray-700">
                Quote Date
              </label>
              <input
                type="date"
                id="quote_date"
                name="quote_date"
                value={formData.quote_date}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Scheduled Date */}
            <div>
              <label htmlFor="scheduled_date" className="block text-sm font-medium text-gray-700">
                Scheduled Date
              </label>
              <input
                type="date"
                id="scheduled_date"
                name="scheduled_date"
                value={formData.scheduled_date}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Start Date */}
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Completion Date */}
            <div>
              <label htmlFor="completion_date" className="block text-sm font-medium text-gray-700">
                Completion Date
              </label>
              <input
                type="date"
                id="completion_date"
                name="completion_date"
                value={formData.completion_date}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Job Address Fields */}
            <div className="md:col-span-2">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Job Location</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label htmlFor="job_street" className="block text-sm font-medium text-gray-700">
                    Street Address
                  </label>
                  <input
                    type="text"
                    id="job_street"
                    name="job_street"
                    value={formData.job_street}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <label htmlFor="job_city" className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    id="job_city"
                    name="job_city"
                    value={formData.job_city}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Anytown"
                  />
                </div>
                <div>
                  <label htmlFor="job_state" className="block text-sm font-medium text-gray-700">
                    State/Province
                  </label>
                  <input
                    type="text"
                    id="job_state"
                    name="job_state"
                    value={formData.job_state}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="CA"
                  />
                </div>
                <div>
                  <label htmlFor="job_zip" className="block text-sm font-medium text-gray-700">
                    ZIP/Postal Code
                  </label>
                  <input
                    type="text"
                    id="job_zip"
                    name="job_zip"
                    value={formData.job_zip}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="90210"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes or special instructions..."
              />
            </div>

            {/* Employee Assignment with Lead Selection */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Employees
              </label>
              <SearchableCheckList
                items={employees}
                selectedItems={formData.assigned_employees}
                onSelectionChange={(selected) => {
                  setFormData(prev => ({ ...prev, assigned_employees: selected }));
                  // If lead is no longer in selected, clear it
                  if (!selected.includes(formData.lead_employee_id)) {
                    setFormData(prev => ({ ...prev, lead_employee_id: '' }));
                  }
                }}
                searchPlaceholder="Search employees..."
                displayKey={(emp) => `${emp.user?.first_name || ''} ${emp.user?.last_name || ''} ${emp.user?.email ? `(${emp.user.email})` : ''}`}
                valueKey="id"
                maxHeight="200px"
                leadSelection={true}
                leadValue={formData.lead_employee_id}
                onLeadChange={(leadId) => setFormData(prev => ({ ...prev, lead_employee_id: leadId }))}
              />
            </div>

            {/* Materials/Supplies */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Materials/Supplies
              </label>
              <SearchableCheckList
                items={supplies}
                selectedItems={formData.materials}
                onSelectionChange={(selected) => setFormData(prev => ({ ...prev, materials: selected }))}
                searchPlaceholder="Search materials..."
                displayKey={(supply) => `${supply.name} - $${supply.unit_price} (${supply.quantity_on_hand} available)`}
                valueKey="id"
                maxHeight="200px"
              />
            </div>

            {/* Vehicle Assignment */}
            <div>
              <label htmlFor="vehicle_id" className="block text-sm font-medium text-gray-700">
                Assigned Vehicle
              </label>
              <select
                id="vehicle_id"
                name="vehicle_id"
                value={formData.vehicle_id}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No vehicle assigned</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} - {vehicle.registration_number}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : (job ? 'Update Job' : 'Create Job')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobForm;