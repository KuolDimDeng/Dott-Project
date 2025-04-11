import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { serviceApi } from '@/utils/apiClient';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';
import ModernFormLayout from '@/app/components/ModernFormLayout';

// Icon components using SVG instead of MUI icons
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const ArrowDropDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const AddCircleOutlineIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
  </svg>
);

const FilterListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
  </svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
  </svg>
);

const DesignServicesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
);

// Constants for rendering optimization
const THROTTLE_LOG_INTERVAL = 1000; // 1 second between log messages
let lastLogTime = 0;

// Add throttled logger function
const throttledDebugLog = (message, data) => {
  const now = Date.now();
  if (now - lastLogTime > THROTTLE_LOG_INTERVAL) {
    lastLogTime = now;
    logger.debug(message, data);
  }
};

const ServiceManagement = ({ salesContext = false, mode, newService: isNewService = false }) => {
  // Determine initial tab based on mode
  const initialTab = mode === 'create' || isNewService ? 0 : 2;
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    price: '',
    is_for_sale: true,
    is_recurring: false,
    salestax: '',
    duration: '',
    billing_cycle: 'monthly',
  });
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedService, setEditedService] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    logger.info('[ServiceManagement] Component mounted, fetching services');
    fetchServices();
    
    return () => {
      logger.info('[ServiceManagement] Component unmounting');
    };
  }, []);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      console.log('[ServiceManagement] Fetching services...');
      
      try {
        const data = await serviceApi.getAll();
        console.log('[ServiceManagement] Services data:', data);
        setServices(Array.isArray(data) ? data : []);
      } catch (apiError) {
        // Handle errors in API client
        console.error('[ServiceManagement] Error in API call:', apiError);
        setServices([]);
        
        if (apiError.message?.includes('relation') && 
            apiError.message?.includes('does not exist')) {
          toast.info('Your service database is being set up. This should only happen once.');
        } else {
          toast.error('Failed to load services. Please try again.');
        }
      }
    } catch (error) {
      console.error('[ServiceManagement] Error fetching services:', error);
      setServices([]);
      toast.error('Failed to load services. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = useCallback((event, newValue) => {
    throttledDebugLog('[ServiceManagement] Tab changed to:', newValue);
    setActiveTab(newValue);
  }, []);

  const handleInputChange = useCallback((event) => {
    const { name, value, checked, type } = event.target;
    throttledDebugLog('[ServiceManagement] Input changed:', name);
    
    if (isEditing) {
      setEditedService((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    } else {
      setNewService((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  }, [isEditing]);

  const handleCreateService = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    logger.info('[ServiceManagement] Creating service:', newService);
    try {
      // Map form field names to API expected field names
      const mappedService = {
        service_name: newService.name,
        description: newService.description,
        price: parseFloat(newService.price) || 0,
        is_for_sale: newService.is_for_sale,
        is_recurring: newService.is_recurring,
        salestax: parseFloat(newService.salestax) || 0,
        duration: newService.duration,
        billing_cycle: newService.billing_cycle,
      };
      
      logger.debug('[ServiceManagement] Sending POST request to /api/services/ with mapped data:', mappedService);
      const response = await serviceApi.create(mappedService);
      logger.info('[ServiceManagement] Service created successfully:', response);
      toast.success('Service created successfully');
      setNewService({
        name: '',
        description: '',
        price: '',
        is_for_sale: true,
        is_recurring: false,
        salestax: '',
        duration: '',
        billing_cycle: 'monthly',
      });
      fetchServices();
      // Switch to List tab after creation
      setActiveTab(2);
    } catch (error) {
      logger.error('[ServiceManagement] Error creating service:', error);
      let errorMessage = 'Error creating service';
      if (error.response) {
        logger.error('[ServiceManagement] Error response:', error.response.status, error.response.data);
        errorMessage += ` (${error.response.status}): ${JSON.stringify(error.response.data)}`;
      }
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleServiceSelect = (service) => {
    logger.debug('[ServiceManagement] Service selected:', service.id);
    setSelectedService(service);
    setActiveTab(1);
  };

  const handleEdit = () => {
    logger.debug('[ServiceManagement] Editing service:', selectedService.id);
    setIsEditing(true);
    setEditedService({ ...selectedService });
  };

  const handleCancelEdit = () => {
    logger.debug('[ServiceManagement] Cancelling edit');
    setIsEditing(false);
    setEditedService(null);
  };

  const handleSaveEdit = async () => {
    setIsSubmitting(true);
    logger.info('[ServiceManagement] Saving edited service:', editedService);
    try {
      // Map form field names to API expected field names
      const mappedService = {
        service_name: editedService.name,
        description: editedService.description,
        price: parseFloat(editedService.price) || 0,
        is_for_sale: editedService.is_for_sale,
        is_recurring: editedService.is_recurring,
        salestax: parseFloat(editedService.salestax) || 0,
        duration: editedService.duration,
        billing_cycle: editedService.billing_cycle,
      };
      
      logger.debug('[ServiceManagement] Updating service with mapped data:', mappedService);
      const response = await serviceApi.update(selectedService.id, mappedService);
      logger.info('[ServiceManagement] Service updated successfully:', response);
      setSelectedService(response);
      setIsEditing(false);
      fetchServices();
      toast.success('Service updated successfully');
    } catch (error) {
      logger.error('[ServiceManagement] Error updating service:', error);
      let errorMessage = 'Error updating service';
      if (error.response) {
        logger.error('[ServiceManagement] Error response:', error.response.status, error.response.data);
        errorMessage += ` (${error.response.status})`;
      }
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    logger.debug('[ServiceManagement] Opening delete dialog for service:', selectedService.id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsSubmitting(true);
    try {
      await serviceApi.delete(selectedService.id);
      toast.success('Service deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedService(null);
      fetchServices();
      setActiveTab(2);
    } catch (error) {
      logger.error('Error deleting service', error);
      toast.error('Error deleting service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportClick = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const handleExport = (format) => {
    // Implement export logic here
    console.log(`Exporting to ${format}`);
    handleExportClose();
  };

  const filteredServices = useMemo(() => services.filter(service => 
    service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ), [services, searchQuery]);

  throttledDebugLog('[ServiceManagement] Rendering with activeTab:', activeTab);
  
  // Create Service Form
  const renderCreateServiceForm = () => (
    <ModernFormLayout 
      title="Create New Service" 
      subtitle="Add a new service to your business offerings"
      onSubmit={handleCreateService}
      isLoading={isSubmitting}
      submitLabel="Create Service"
    >
      <div className="col-span-12 md:col-span-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            type="text"
            value={newService.name}
            onChange={handleInputChange}
            required
            placeholder="Enter service name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      <div className="col-span-12 md:col-span-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">$</span>
            </div>
            <input
              name="price"
              type="number"
              value={newService.price}
              onChange={handleInputChange}
              required
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
      <div className="col-span-12">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={newService.description}
            onChange={handleInputChange}
            rows={3}
            placeholder="Enter service description"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>
      </div>
      <div className="col-span-12 md:col-span-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sales Tax (%)
          </label>
          <div className="relative">
            <input
              name="salestax"
              type="number"
              value={newService.salestax}
              onChange={handleInputChange}
              placeholder="0.00"
              className="w-full pr-7 pl-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500">%</span>
            </div>
          </div>
        </div>
      </div>
      <div className="col-span-12 md:col-span-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (minutes)
          </label>
          <div className="relative">
            <input
              name="duration"
              type="number"
              value={newService.duration}
              onChange={handleInputChange}
              placeholder="60"
              className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500">min</span>
            </div>
          </div>
        </div>
      </div>
      <div className="col-span-12">
        <h3 className="font-semibold text-gray-800 mb-2 mt-4">
          Service Options
        </h3>
      </div>
      <div className="col-span-12 md:col-span-6">
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              name="is_for_sale"
              checked={newService.is_for_sale}
              onChange={handleInputChange}
            />
            <div className={`w-10 h-5 bg-gray-200 rounded-full shadow-inner ${newService.is_for_sale ? 'bg-blue-500' : ''}`}></div>
            <div className={`absolute left-0 top-0 w-5 h-5 bg-white rounded-full shadow transform ${newService.is_for_sale ? 'translate-x-5' : ''} transition`}></div>
          </div>
          <span className="ml-3 text-sm font-medium text-gray-700">Available for Sale</span>
        </label>
      </div>
      <div className="col-span-12 md:col-span-6">
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              name="is_recurring"
              checked={newService.is_recurring}
              onChange={handleInputChange}
            />
            <div className={`w-10 h-5 bg-gray-200 rounded-full shadow-inner ${newService.is_recurring ? 'bg-blue-500' : ''}`}></div>
            <div className={`absolute left-0 top-0 w-5 h-5 bg-white rounded-full shadow transform ${newService.is_recurring ? 'translate-x-5' : ''} transition`}></div>
          </div>
          <span className="ml-3 text-sm font-medium text-gray-700">Recurring Service</span>
        </label>
      </div>
      {newService.is_recurring && (
        <div className="col-span-12 md:col-span-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Billing Cycle
            </label>
            <select
              name="billing_cycle"
              value={newService.billing_cycle}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>
        </div>
      )}
    </ModernFormLayout>
  );

  // Service Details Form
  const renderServiceDetailsForm = () => {
    if (!selectedService) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-6">
          <p className="text-lg text-gray-500 mb-4">
            No service selected
          </p>
          <button 
            onClick={() => setActiveTab(2)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <DesignServicesIcon />
            <span className="ml-2">Select a service from the list</span>
          </button>
        </div>
      );
    }

    return (
      <ModernFormLayout 
        title={isEditing ? "Edit Service" : "Service Details"} 
        subtitle={isEditing ? "Update service information" : `Service ID: ${selectedService.id || 'N/A'}`}
        onSubmit={e => {
          e.preventDefault();
          if (isEditing) handleSaveEdit();
        }}
        isLoading={isSubmitting}
        submitLabel="Save Changes"
        footer={
          isEditing ? (
            <button 
              type="button"
              onClick={handleCancelEdit}
              className="px-4 py-2 mr-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <div className="flex">
              <button 
                type="button"
                onClick={handleEdit}
                className="inline-flex items-center px-4 py-2 mr-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <EditIcon />
                <span className="ml-2">Edit</span>
              </button>
              <button 
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <DeleteIcon />
                <span className="ml-2">Delete</span>
              </button>
            </div>
          )
        }
      >
        <div className="col-span-12 md:col-span-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Name
            </label>
            <input
              name="name"
              type="text"
              value={isEditing ? editedService.name : selectedService.name}
              onChange={handleInputChange}
              required
              disabled={!isEditing}
              className={`w-full px-3 py-2 border ${!isEditing ? 'bg-gray-100 text-gray-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>
        </div>
        <div className="col-span-12 md:col-span-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                name="price"
                type="number"
                value={isEditing ? editedService.price : selectedService.price}
                onChange={handleInputChange}
                required
                disabled={!isEditing}
                className={`w-full pl-7 pr-3 py-2 border ${!isEditing ? 'bg-gray-100 text-gray-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              />
            </div>
          </div>
        </div>
        <div className="col-span-12">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={isEditing ? editedService.description : selectedService.description}
              onChange={handleInputChange}
              rows={3}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border ${!isEditing ? 'bg-gray-100 text-gray-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            ></textarea>
          </div>
        </div>
        <div className="col-span-12 md:col-span-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sales Tax (%)
            </label>
            <div className="relative">
              <input
                name="salestax"
                type="number"
                value={isEditing ? editedService.salestax : selectedService.salestax}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full pr-7 pl-3 py-2 border ${!isEditing ? 'bg-gray-100 text-gray-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500">%</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-12 md:col-span-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <div className="relative">
              <input
                name="duration"
                type="number"
                value={isEditing ? editedService.duration : selectedService.duration}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full pr-10 pl-3 py-2 border ${!isEditing ? 'bg-gray-100 text-gray-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500">min</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-12">
          <h3 className="font-semibold text-gray-800 mb-2 mt-4">
            Service Options
          </h3>
        </div>
        <div className="col-span-12 md:col-span-6">
          <label className={`flex items-center cursor-pointer ${!isEditing ? 'opacity-60' : ''}`}>
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                name="is_for_sale"
                checked={isEditing ? editedService.is_for_sale : selectedService.is_for_sale}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
              <div className={`w-10 h-5 bg-gray-200 rounded-full shadow-inner ${(isEditing ? editedService.is_for_sale : selectedService.is_for_sale) ? 'bg-blue-500' : ''}`}></div>
              <div className={`absolute left-0 top-0 w-5 h-5 bg-white rounded-full shadow transform ${(isEditing ? editedService.is_for_sale : selectedService.is_for_sale) ? 'translate-x-5' : ''} transition`}></div>
            </div>
            <span className="ml-3 text-sm font-medium text-gray-700">Available for Sale</span>
          </label>
        </div>
        <div className="col-span-12 md:col-span-6">
          <label className={`flex items-center cursor-pointer ${!isEditing ? 'opacity-60' : ''}`}>
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                name="is_recurring"
                checked={isEditing ? editedService.is_recurring : selectedService.is_recurring}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
              <div className={`w-10 h-5 bg-gray-200 rounded-full shadow-inner ${(isEditing ? editedService.is_recurring : selectedService.is_recurring) ? 'bg-blue-500' : ''}`}></div>
              <div className={`absolute left-0 top-0 w-5 h-5 bg-white rounded-full shadow transform ${(isEditing ? editedService.is_recurring : selectedService.is_recurring) ? 'translate-x-5' : ''} transition`}></div>
            </div>
            <span className="ml-3 text-sm font-medium text-gray-700">Recurring Service</span>
          </label>
        </div>
        {(isEditing ? editedService.is_recurring : selectedService.is_recurring) && (
          <div className="col-span-12 md:col-span-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Cycle
              </label>
              <select
                name="billing_cycle"
                value={isEditing ? editedService.billing_cycle : selectedService.billing_cycle}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 border ${!isEditing ? 'bg-gray-100 text-gray-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
          </div>
        )}
      </ModernFormLayout>
    );
  };

  // Service List
  const renderServiceList = () => {
    // Show loading state
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
    
    // Show empty state with helpful message
    if (!services || services.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-16 w-16 text-gray-300 mx-auto mb-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
              />
            </svg>
            <h3 className="text-xl font-semibold mb-2">No Services Yet</h3>
            <p className="text-gray-500 max-w-md">
              You haven't added any services to your catalog yet. Get started by clicking the "Create Service" button above.
            </p>
          </div>
          <button 
            onClick={() => setActiveTab(0)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create Your First Service
          </button>
        </div>
      );
    }
    
    // Existing table rendering code
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm mb-6 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
            <h1 className="text-xl font-semibold text-gray-800">
              Services
            </h1>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full min-w-[200px]"
                />
              </div>
              
              <button 
                onClick={() => setActiveTab(0)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <AddCircleOutlineIcon />
                <span className="ml-2">New Service</span>
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-between mb-4 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-full text-sm bg-white hover:bg-gray-50">
                <FilterListIcon />
                <span className="ml-2">All Services</span>
              </button>
              <button className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-full text-sm bg-white hover:bg-gray-50">
                <FilterListIcon />
                <span className="ml-2">Recurring</span>
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={fetchServices} 
                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              >
                <RefreshIcon />
              </button>
              
              <div className="relative">
                <button
                  onClick={handleExportClick}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50"
                >
                  Export
                  <ArrowDropDownIcon />
                </button>
                
                {exportAnchorEl && (
                  <div className="absolute right-0 z-10 mt-2 w-32 bg-white rounded-md shadow-lg">
                    <div className="py-1">
                      <button 
                        onClick={() => handleExport('PDF')} 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        PDF
                      </button>
                      <button 
                        onClick={() => handleExport('CSV')} 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        CSV
                      </button>
                      <button 
                        onClick={() => handleExport('Excel')} 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        Excel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
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
                {filteredServices.map((service) => (
                  <tr 
                    key={service.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4" onClick={() => handleServiceSelect(service)}>
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900">
                          {service.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={() => handleServiceSelect(service)}>
                      ${parseFloat(service.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4" onClick={() => handleServiceSelect(service)}>
                      <div className="flex items-center">
                        <span>{service.duration} min</span>
                        {service.is_recurring && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Recurring
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={() => handleServiceSelect(service)}>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${service.is_for_sale ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {service.is_for_sale ? "For Sale" : "Not For Sale"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => handleServiceSelect(service)} 
                        className="text-blue-600 hover:text-blue-900 p-1.5 rounded-full hover:bg-blue-50 mr-1"
                      >
                        <EditIcon />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedService(service);
                          handleDelete();
                        }} 
                        className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-50"
                      >
                        <DeleteIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-3 rounded-xl shadow-md overflow-hidden bg-white">
        <div className="flex border-b border-gray-200">
          <button 
            onClick={(e) => handleTabChange(e, 0)} 
            className={`flex-1 py-4 px-4 text-center font-semibold text-base transition-colors duration-200 focus:outline-none ${activeTab === 0 ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-500 hover:bg-blue-50'}`}
          >
            Create
          </button>
          <button 
            onClick={(e) => handleTabChange(e, 1)} 
            className={`flex-1 py-4 px-4 text-center font-semibold text-base transition-colors duration-200 focus:outline-none ${activeTab === 1 ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-500 hover:bg-blue-50'}`}
          >
            Details
          </button>
          <button 
            onClick={(e) => handleTabChange(e, 2)} 
            className={`flex-1 py-4 px-4 text-center font-semibold text-base transition-colors duration-200 focus:outline-none ${activeTab === 2 ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-500 hover:bg-blue-50'}`}
          >
            List
          </button>
        </div>
      </div>

      {activeTab === 0 && renderCreateServiceForm()}
      {activeTab === 1 && renderServiceDetailsForm()}
      {activeTab === 2 && renderServiceList()}

      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-xl font-semibold text-red-600">
                Confirm Delete
              </h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700">
                Are you sure you want to delete this service? This action cannot be undone.
              </p>
              
              {selectedService && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <p className="font-semibold">
                    {selectedService.name}
                  </p>
                  <p className="text-gray-600 text-sm">
                    ${parseFloat(selectedService.price).toFixed(2)} · {selectedService.duration} min
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 pt-2 flex justify-end space-x-3">
              <button 
                onClick={() => setDeleteDialogOpen(false)} 
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete} 
                className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </div>
                ) : 'Delete Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ServiceManagement);
