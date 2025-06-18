'use client';


import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/context/TenantContext';
import { logger } from '@/utils/logger';
import AppBar from '@/app/components/AppBar';

export default function CreateTenantPage() {
  const router = useRouter();
  const { createTenant } = useTenant();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    industry: '',
    address: '',
    country: '',
    timezone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim()) {
      setError('Tenant name is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const newTenant = await createTenant(formData);
      logger.info('[CreateTenant] Tenant created successfully:', newTenant);
      
      // Redirect to the new tenant's dashboard
      router.push(`/${newTenant.id}/dashboard`);
    } catch (err) {
      logger.error('[CreateTenant] Error creating tenant:', err);
      setError(err.message || 'Failed to create tenant. Please try again.');
      setLoading(false);
    }
  };
  
  // Cancel and go back
  const handleCancel = () => {
    router.push('/select-tenant');
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <AppBar />
      
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create New Tenant</h1>
            <p className="mt-2 text-gray-600">
              Enter the details for your new tenant
            </p>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-md border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          {/* Tenant creation form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tenant name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Tenant Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="E.g., My Company"
              />
            </div>
            
            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Brief description of your tenant"
              />
            </div>
            
            {/* Industry */}
            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
                Industry
              </label>
              <select
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select Industry</option>
                <option value="retail">Retail</option>
                <option value="healthcare">Healthcare</option>
                <option value="finance">Finance</option>
                <option value="technology">Technology</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="education">Education</option>
                <option value="hospitality">Hospitality</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Business address"
              />
            </div>
            
            {/* Country */}
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                Country
              </label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Country"
              />
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col-reverse sm:flex-row justify-end space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className={`
                  inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white 
                  ${loading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}
                `}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Tenant'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 