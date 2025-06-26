'use client';

import React, { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { serviceApi } from '@/utils/apiClient';
import { getCacheValue } from '@/utils/appCache';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)} // For mobile
        className="cursor-help"
      >
        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      
      {showTooltip && (
        <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-4`}>
                <div className={`${position === 'top' ? '' : 'rotate-180'}`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ServiceManagement = () => {
  // State management
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [serviceError, setServiceError] = useState(null);
  
  // Refs
  const isMounted = useRef(true);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: '', // was sku
    price: '',
    salestax: '', // was cost
    duration: '',
    billing_cycle: 'monthly', // was duration_unit
    is_for_sale: true, // was is_active
    is_recurring: false,
    category: '',
    notes: '' // keep for frontend display
  });

  useEffect(() => {
    isMounted.current = true;
    fetchServices();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('[ServiceManagement] Fetching services...');
      
      // Get secure tenant ID
      const tenantId = getSecureTenantId();
      if (!tenantId) {
        console.error('[ServiceManagement] No tenant ID found');
        toast.error('Authentication required. Please log in again.');
        return;
      }
      
      try {
        const response = await fetch('/api/inventory/services', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch services: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check for service unavailable error
        if (data.code === 'SERVICE_UNAVAILABLE') {
          setServiceError({
            title: 'Service Temporarily Unavailable',
            message: data.details || 'The service management feature is currently being upgraded.',
            type: 'maintenance'
          });
          setServices([]);
          return;
        }
        
        // Handle both paginated and direct array responses
        let servicesList = [];
        if (Array.isArray(data)) {
          servicesList = data;  // Direct array response
        } else if (data && Array.isArray(data.results)) {
          servicesList = data.results;  // Django paginated response
          console.log('[ServiceManagement] Paginated response - count:', data.count);
        } else if (data && Array.isArray(data.data)) {
          servicesList = data.data;  // Alternative format
        }
        
        console.log('[ServiceManagement] Fetched services:', servicesList.length);
        
        if (isMounted.current) {
          setServices(servicesList);
          setServiceError(null);
        }
      } catch (apiError) {
        console.error('[ServiceManagement] API error:', apiError);
        if (isMounted.current) {
          setServices([]);
          if (response && response.status === 503) {
            setServiceError({
              title: 'Service Temporarily Unavailable',
              message: 'The service management feature is currently being upgraded. Please try again later.',
              type: 'maintenance'
            });
          } else {
            toast.error('Failed to load services.');
          }
        }
      }
    } catch (error) {
      console.error('[ServiceManagement] Error:', error);
      if (isMounted.current) {
        setServices([]);
        toast.error('Failed to load services.');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Handle form changes
  const handleFormChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  // Handle create service
  const handleCreateService = async (e) => {
    e.preventDefault();
    console.log('[ServiceManagement] Creating service with data:', formData);
    
    try {
      setIsSubmitting(true);
      
      const tenantId = getSecureTenantId();
      if (!tenantId) {
        toast.error('Authentication required.');
        return;
      }
      
      const response = await fetch('/api/inventory/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          unit: formData.unit,
          price: parseFloat(formData.price) || 0,
          salestax: parseFloat(formData.salestax) || 0,
          duration: formData.duration,
          billing_cycle: formData.billing_cycle,
          is_for_sale: formData.is_for_sale,
          is_recurring: formData.is_recurring,
          category: formData.category
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create service: ${response.status}`);
      }
      
      const newService = await response.json();
      console.log('[ServiceManagement] Service created:', newService);
      
      toast.success(`Service "${formData.name}" created successfully!`);
      
      // Reset form and refresh list
      setFormData({
        name: '',
        description: '',
        unit: '',
        price: '',
        salestax: '',
        duration: '',
        billing_cycle: 'monthly',
        is_for_sale: true,
        is_recurring: false,
        category: '',
        notes: ''
      });
      setIsCreating(false);
      fetchServices();
    } catch (error) {
      console.error('[ServiceManagement] Error creating service:', error);
      toast.error('Failed to create service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update service
  const handleUpdateService = async (e) => {
    e.preventDefault();
    console.log('[ServiceManagement] Updating service:', selectedService?.id);
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/inventory/services?id=${selectedService.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          unit: formData.unit,
          price: parseFloat(formData.price) || 0,
          salestax: parseFloat(formData.salestax) || 0,
          duration: formData.duration,
          billing_cycle: formData.billing_cycle,
          is_for_sale: formData.is_for_sale,
          is_recurring: formData.is_recurring,
          category: formData.category
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update service: ${response.status}`);
      }
      
      const updatedService = await response.json();
      console.log('[ServiceManagement] Service updated:', updatedService);
      
      toast.success('Service updated successfully!');
      
      setServices(services.map(s => s.id === selectedService.id ? updatedService : s));
      setIsEditing(false);
      setSelectedService(updatedService);
    } catch (error) {
      console.error('[ServiceManagement] Error updating service:', error);
      toast.error('Failed to update service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete service
  const handleDeleteService = async () => {
    if (!serviceToDelete) return;
    
    console.log('[ServiceManagement] Deleting service:', serviceToDelete.id);
    
    try {
      const response = await fetch(`/api/inventory/services?id=${serviceToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete service: ${response.status}`);
      }
      
      console.log('[ServiceManagement] Service deleted successfully');
      
      toast.success('Service deleted successfully!');
      setServices(services.filter(s => s.id !== serviceToDelete.id));
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
      
      if (selectedService?.id === serviceToDelete.id) {
        setShowServiceDetails(false);
        setSelectedService(null);
      }
    } catch (error) {
      console.error('[ServiceManagement] Error deleting service:', error);
      toast.error('Failed to delete service.');
    }
  };

  // Handle view service details
  const handleViewService = useCallback((service) => {
    console.log('[ServiceManagement] Viewing service:', service);
    setSelectedService(service);
    setShowServiceDetails(true);
    setIsCreating(false);
    setIsEditing(false);
  }, []);

  // Handle edit service
  const handleEditService = useCallback((service) => {
    console.log('[ServiceManagement] Editing service:', service);
    setSelectedService(service);
    setFormData({
      name: service.name || '',
      description: service.description || '',
      unit: service.unit || service.sku || '',
      price: service.price || '',
      salestax: service.salestax || service.cost || '',
      duration: service.duration || '',
      billing_cycle: service.billing_cycle || service.duration_unit || 'monthly',
      is_for_sale: service.is_for_sale !== undefined ? service.is_for_sale : (service.is_active !== false),
      is_recurring: service.is_recurring || false,
      category: service.category || '',
      notes: service.notes || ''
    });
    setIsEditing(true);
    setShowServiceDetails(true);
  }, []);

  // Filter services based on search
  const filteredServices = services.filter(service => 
    service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.unit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render service form
  const renderServiceForm = () => {
    const isEditMode = isEditing && selectedService;
    
    return (
      <form onSubmit={isEditMode ? handleUpdateService : handleCreateService} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Name
              <FieldTooltip text="Enter a clear, descriptive name for your service (e.g., 'Website Development', 'Monthly Maintenance', 'Consulting')" />
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Service name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
              <FieldTooltip text="Group similar services together for better organization and reporting (e.g., 'Consulting', 'Training', 'Support')" />
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Service category"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price
              <FieldTooltip text="Enter the price you charge for this service. For hourly services, enter the hourly rate." />
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleFormChange}
              step="0.01"
              min="0"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sales Tax (%)
              <FieldTooltip text="Enter the tax percentage for this service. Leave as 0 if tax-exempt." />
            </label>
            <input
              type="number"
              name="salestax"
              value={formData.salestax}
              onChange={handleFormChange}
              step="0.01"
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
              <FieldTooltip text="How is this service measured? (e.g., 'hour', 'session', 'project', 'month')" />
            </label>
            <input
              type="text"
              name="unit"
              value={formData.unit}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., hour, session, month"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration
              <FieldTooltip text="How long does this service typically take? (e.g., '1', '2.5', '8')" />
            </label>
            <input
              type="text"
              name="duration"
              value={formData.duration}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 1, 2.5, 8"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Billing Cycle
              <FieldTooltip text="For recurring services, how often is the customer billed?" />
            </label>
            <select
              name="billing_cycle"
              value={formData.billing_cycle}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="one-time">One-time</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Service description..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleFormChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Internal notes..."
          />
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            name="is_for_sale"
            id="is_for_sale"
            checked={formData.is_for_sale}
            onChange={handleFormChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_for_sale" className="ml-2 block text-sm text-gray-900">
            Available for Sale
            <FieldTooltip text="Enable this to make the service available for customers to purchase. Disable to temporarily hide the service." position="bottom" />
          </label>
        </div>
        
        <div className="flex items-center mt-4">
          <input
            type="checkbox"
            name="is_recurring"
            id="is_recurring"
            checked={formData.is_recurring}
            onChange={handleFormChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-900">
            Recurring Service
            <FieldTooltip text="Enable this if the service is billed on a recurring basis (monthly, quarterly, yearly). The billing cycle determines the frequency." position="bottom" />
          </label>
        </div>
        
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setIsEditing(false);
              setShowServiceDetails(false);
              setFormData({
                name: '',
                description: '',
                unit: '',
                price: '',
                salestax: '',
                duration: '',
                billing_cycle: 'monthly',
                is_for_sale: true,
                is_recurring: false,
                category: '',
                notes: ''
              });
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              <span>{isEditMode ? 'Update Service' : 'Create Service'}</span>
            )}
          </button>
        </div>
      </form>
    );
  };

  // Render service details
  const renderServiceDetails = () => {
    if (!selectedService) return null;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Service Name</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedService.name}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Unit</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedService.unit || selectedService.sku || 'Not specified'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Price</h3>
            <p className="mt-1 text-sm text-gray-900">${parseFloat(selectedService.price || 0).toFixed(2)}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Sales Tax</h3>
            <p className="mt-1 text-sm text-gray-900">${parseFloat(selectedService.salestax || selectedService.cost || 0).toFixed(2)}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Duration</h3>
            <p className="mt-1 text-sm text-gray-900">
              {selectedService.duration ? `${selectedService.duration} ${selectedService.duration_unit || 'hours'}` : 'Not specified'}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Category</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedService.category || 'Uncategorized'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              selectedService.is_active !== false
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {selectedService.is_active !== false ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        
        {selectedService.description && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedService.description}</p>
          </div>
        )}
        
        {selectedService.notes && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Notes</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedService.notes}</p>
          </div>
        )}
        
        <div className="pt-6 border-t">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Service Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Times Sold</p>
              <p className="text-lg font-semibold">0</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-lg font-semibold">$0.00</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Profit Margin</p>
              <p className="text-lg font-semibold">
                {selectedService.price && selectedService.cost
                  ? `${(((selectedService.price - selectedService.cost) / selectedService.price) * 100).toFixed(1)}%`
                  : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Last Sold</p>
              <p className="text-lg font-semibold">Never</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render services table
  const renderServicesTable = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading services...</p>
          </div>
        </div>
      );
    }
    
    if (!filteredServices || filteredServices.length === 0) {
      return (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No services found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search.' : 'Get started by creating a new service.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={() => {
                  setIsCreating(true);
                  setShowServiceDetails(false);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Service
              </button>
            </div>
          )}
        </div>
      );
    }
    
    return (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Unit</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Price</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Duration</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Category</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredServices.map((service) => (
            <tr key={service.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-black">{service.name}</div>
                {service.description && (
                  <div className="text-xs text-gray-500 truncate max-w-xs">
                    {service.description}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">{service.unit || service.sku || 'N/A'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">${parseFloat(service.price || 0).toFixed(2)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">
                  {service.duration ? `${service.duration} ${service.duration_unit || 'hours'}` : '-'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">{service.category || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  service.is_for_sale !== false
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {service.is_for_sale !== false ? 'For Sale' : 'Not for Sale'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => handleViewService(service)}
                  className="text-blue-600 hover:text-blue-900 mr-3"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleEditService(service)}
                  className="text-green-600 hover:text-green-900 mr-3"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setServiceToDelete(service);
                    setDeleteDialogOpen(true);
                  }}
                  className="text-red-600 hover:text-red-900"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Delete confirmation dialog
  const renderDeleteDialog = () => (
    <Transition.Root show={deleteDialogOpen} as={Fragment}>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4 text-center sm:items-center sm:p-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setDeleteDialogOpen(false)} />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c0 1.378 1.068 2.508 2.428 2.574 1.351.066 2.7.103 4.051.103 2.787 0 5.532-.138 8.206-.361M12 9c-2.549 0-5.058.168-7.51.486M12 9l3.75-3.75M12 9l-3.75-3.75m9.344 10.301c1.36-.066 2.428-1.196 2.428-2.574V5.25m0 8.526c0 1.378-1.068 2.508-2.428 2.574M19.594 13.776V5.25m0 0a2.25 2.25 0 00-2.25-2.25h-10.5a2.25 2.25 0 00-2.25 2.25v8.526c0 1.378 1.068 2.508 2.428 2.574" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">
                      Delete Service
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete <span className="font-medium">{serviceToDelete?.name}</span>? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                  onClick={handleDeleteService}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </div>
    </Transition.Root>
  );

  return (
    <div className="p-6 bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black mb-2 flex items-center">
          <WrenchScrewdriverIcon className="h-6 w-6 text-blue-600 mr-2" />
          Service Management
        </h1>
        <p className="text-gray-600 text-sm">
          Define and manage the services you offer to customers. Set pricing, duration, and descriptions for each service. Track service availability and categorize by type.
        </p>
      </div>
      
      {/* Service Error/Maintenance Notice */}
      {serviceError && (
        <div className={`border rounded-lg p-6 mb-6 ${
          serviceError.type === 'maintenance' 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {serviceError.type === 'maintenance' ? (
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${
                serviceError.type === 'maintenance' ? 'text-blue-800' : 'text-red-800'
              }`}>
                {serviceError.title}
              </h3>
              <p className={`mt-1 text-sm ${
                serviceError.type === 'maintenance' ? 'text-blue-700' : 'text-red-700'
              }`}>
                {serviceError.message}
              </p>
              {serviceError.type === 'maintenance' && (
                <button
                  onClick={() => {
                    setServiceError(null);
                    fetchServices();
                  }}
                  className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Services</h2>
          <p className="text-3xl font-bold text-blue-600 mt-2">{services.length}</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Active Services</h2>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {services.filter(s => s.is_active !== false).length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">Inactive Services</h2>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {services.filter(s => s.is_active === false).length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">Categories</h2>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {new Set(services.map(s => s.category).filter(Boolean)).size}
          </p>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search Services"
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white text-black focus:ring-blue-500 focus:border-blue-500 min-w-[300px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-2">
          <button
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
            onClick={() => {
              console.log('[ServiceManagement] Filter clicked');
            }}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
          </button>
          <button
            className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={() => {
              console.log('[ServiceManagement] Add Service clicked');
              setIsCreating(true);
              setShowServiceDetails(false);
              setSelectedService(null);
              setIsEditing(false);
            }}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Service
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      {showServiceDetails && selectedService ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-black">{selectedService.name}</h2>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: '',
                        description: '',
                        sku: '',
                        price: '',
                        cost: '',
                        duration: '',
                        duration_unit: 'hours',
                        is_active: true,
                        category: '',
                        notes: ''
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleEditService(selectedService)}
                    className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setServiceToDelete(selectedService);
                      setDeleteDialogOpen(true);
                    }}
                    className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowServiceDetails(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
                  >
                    Back to List
                  </button>
                </>
              )}
            </div>
          </div>
          
          {isEditing ? renderServiceForm() : renderServiceDetails()}
        </div>
      ) : isCreating ? (
        <div className="bg-white shadow rounded-lg mt-6 p-6">
          <h2 className="text-xl font-bold text-black mb-6">Create New Service</h2>
          {renderServiceForm()}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            {renderServicesTable()}
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      {renderDeleteDialog()}
    </div>
  );
};

export default ServiceManagement;