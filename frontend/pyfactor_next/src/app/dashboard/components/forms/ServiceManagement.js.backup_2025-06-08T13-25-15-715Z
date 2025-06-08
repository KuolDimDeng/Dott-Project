'use client';

import React, { useState, useEffect, Fragment, useRef, useCallback, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { serviceApi } from '@/utils/apiClient';
import { logger } from '@/utils/logger';
import { extractTenantId, getSecureTenantId } from '@/utils/tenantUtils';
import { getCacheValue } from '@/utils/appCache';

// Import UI components needed for the Tailwind version
const Typography = ({ variant, component, className, color, children, gutterBottom, ...props }) => {
  let baseClasses = '';
  
  // Handle variants
  if (variant === 'h4' || (component === 'h1' && !variant)) {
    baseClasses = 'text-2xl font-bold';
  } else if (variant === 'h5') {
    baseClasses = 'text-xl font-semibold';
  } else if (variant === 'h6') {
    baseClasses = 'text-lg font-medium';
  } else if (variant === 'subtitle1' || variant === 'subtitle2') {
    baseClasses = 'text-sm font-medium';
  } else if (variant === 'body1') {
    baseClasses = 'text-base';
  } else if (variant === 'body2') {
    baseClasses = 'text-sm';
  }
  
  // Handle colors
  if (color === 'textSecondary') {
    baseClasses += ' text-gray-500';
  } else if (color === 'primary') {
    baseClasses += ' text-blue-600';
  } else if (color === 'error') {
    baseClasses += ' text-red-600';
  }
  
  // Handle gutterBottom
  if (gutterBottom) {
    baseClasses += ' mb-2';
  }
  
  const Tag = component || 'p';
  
  return (
    <Tag className={`${baseClasses} ${className || ''}`} {...props}>
      {children}
    </Tag>
  );
};

const Alert = ({ severity, className, children }) => {
  let bgColor = 'bg-blue-50';
  let borderColor = 'border-blue-400';
  let textColor = 'text-blue-800';
  
  if (severity === 'error') {
    bgColor = 'bg-red-50';
    borderColor = 'border-red-400';
    textColor = 'text-red-800';
  } else if (severity === 'warning') {
    bgColor = 'bg-yellow-50';
    borderColor = 'border-yellow-400';
    textColor = 'text-yellow-800';
  } else if (severity === 'success') {
    bgColor = 'bg-green-50';
    borderColor = 'border-green-400';
    textColor = 'text-green-800';
  } else if (severity === 'info') {
    bgColor = 'bg-blue-50';
    borderColor = 'border-blue-400';
    textColor = 'text-blue-800';
  }
  
  return (
    <div className={`p-4 mb-4 ${bgColor} border-l-4 ${borderColor} ${textColor} ${className || ''}`}>
      {children}
    </div>
  );
};

const Paper = ({ elevation, className, children }) => {
  const shadowClass = elevation === 3 ? 'shadow-md' : 'shadow-sm';
  
  return (
    <div className={`bg-white rounded-lg ${shadowClass} ${className || ''}`}>
      {children}
    </div>
  );
};

const FormControl = ({ component, fullWidth, className, children }) => {
  const width = fullWidth ? 'w-full' : '';
  const Tag = component || 'div';
  
  return (
    <Tag className={`${width} ${className || ''}`}>
      {children}
    </Tag>
  );
};

const FormGroup = ({ row, className, children }) => {
  const direction = row ? 'flex flex-row' : 'flex flex-col';
  
  return (
    <div className={`${direction} ${className || ''}`}>
      {children}
    </div>
  );
};

const FormControlLabel = ({ control, label }) => {
  return (
    <label className="inline-flex items-center">
      {control}
      <span className="ml-2">{label}</span>
    </label>
  );
};

const TextField = ({ label, fullWidth, multiline, rows, value, onChange, required, placeholder, name, type, inputProps, variant, className, onClick, autoComplete }) => {
  const width = fullWidth ? 'w-full' : '';
  
  return (
    <div className={`mb-4 ${width} ${className || ''}`}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}
      {multiline ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          onClick={onClick}
          placeholder={placeholder}
          rows={rows || 3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      ) : (
        <input
          type={type || 'text'}
          name={name}
          value={value}
          onChange={onChange}
          onClick={onClick}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          {...inputProps}
        />
      )}
    </div>
  );
};

const Button = ({ variant, color, size, onClick, disabled, type, className, startIcon, children }) => {
  let baseClasses = 'inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Size classes
  if (size === 'small') {
    baseClasses += ' px-2.5 py-1.5 text-xs';
  } else if (size === 'large') {
    baseClasses += ' px-6 py-3 text-base';
  } else {
    baseClasses += ' px-4 py-2 text-sm'; // Medium (default)
  }
  
  // Variant and color classes
  if (variant === 'contained') {
    if (color === 'primary') {
      baseClasses += ' bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
    } else if (color === 'secondary') {
      baseClasses += ' bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500';
    } else if (color === 'error') {
      baseClasses += ' bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
    } else if (color === 'info') {
      baseClasses += ' bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500';
    } else {
      baseClasses += ' bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500';
    }
  } else if (variant === 'outlined') {
    if (color === 'primary') {
      baseClasses += ' border border-blue-500 text-blue-700 hover:bg-blue-50 focus:ring-blue-500';
    } else if (color === 'secondary') {
      baseClasses += ' border border-purple-500 text-purple-700 hover:bg-purple-50 focus:ring-purple-500';
    } else if (color === 'error') {
      baseClasses += ' border border-red-500 text-red-700 hover:bg-red-50 focus:ring-red-500';
    } else if (color === 'info') {
      baseClasses += ' border border-sky-500 text-sky-700 hover:bg-sky-50 focus:ring-sky-500';
    } else {
      baseClasses += ' border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500';
    }
  } else { // text button
    if (color === 'primary') {
      baseClasses += ' text-blue-700 hover:bg-blue-50 focus:ring-blue-500';
    } else if (color === 'secondary') {
      baseClasses += ' text-purple-700 hover:bg-purple-50 focus:ring-purple-500';
    } else if (color === 'error') {
      baseClasses += ' text-red-700 hover:bg-red-50 focus:ring-red-500';
    } else {
      baseClasses += ' text-gray-700 hover:bg-gray-50 focus:ring-gray-500';
    }
  }
  
  // Handle disabled state
  if (disabled) {
    baseClasses = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-gray-200 text-gray-500 cursor-not-allowed';
  }
  
  return (
    <button
      type={type || 'button'}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${className || ''}`}
    >
      {startIcon && <span className="mr-2">{startIcon}</span>}
      {children}
    </button>
  );
};

const CircularProgress = ({ size, color, className }) => {
  const sizeClass = size === 'small' ? 'h-4 w-4' : 'h-6 w-6';
  const colorClass = color === 'primary' ? 'border-blue-500' : 'border-gray-300';
  
  return (
    <div className={`animate-spin rounded-full ${sizeClass} border-t-2 border-b-2 ${colorClass} ${className || ''}`}></div>
  );
};

const DialogTitle = ({ className, children }) => {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 ${className || ''}`}>
      <h3 className="text-lg font-medium text-gray-900">{children}</h3>
    </div>
  );
};

const DialogContent = ({ className, children }) => {
  return (
    <div className={`px-6 py-4 ${className || ''}`}>
      {children}
    </div>
  );
};

const DialogActions = ({ className, children }) => {
  return (
    <div className={`px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-2 ${className || ''}`}>
      {children}
    </div>
  );
};

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

// Modern form layout similar to ProductManagement
const ModernFormLayout = ({ children, title, subtitle, onSubmit, isLoading, submitLabel }) => {
  return (
    <Paper className="p-6 max-w-5xl mx-auto">
      <form onSubmit={onSubmit}>
        <div className="mb-6">
          <Typography variant="h5" component="h2" className="text-gray-900">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" className="text-gray-500 mt-1">
              {subtitle}
            </Typography>
          )}
        </div>
        
        <div className="space-y-6">
          {children}
        </div>
        
        {onSubmit && (
          <div className="mt-8 flex justify-end">
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isLoading}
              className="relative"
            >
              {isLoading && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <CircularProgress size="small" color="primary" />
                </span>
              )}
              <span className={isLoading ? 'opacity-0' : ''}>
                {submitLabel || 'Submit'}
              </span>
            </Button>
          </div>
        )}
      </form>
    </Paper>
  );
};

const ServiceManagement = ({ salesContext = false, mode, newService: isNewService = false }) => {
  // Determine initial tab based on mode
  const initialTab = mode === 'create' || isNewService ? 0 : 2;
  
  const notifySuccess = (message) => toast.success(message);
  const notifyError = (message) => toast.error(message);
  const notifyInfo = (message) => toast.loading(message);
  const notifyWarning = (message) => toast.error(message, { icon: '⚠️' });
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentService, setCurrentService] = useState(null);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    price: '',
    is_for_sale: true,
    is_recurring: false,
    salestax: '',
    duration: '',
    billing_cycle: 'monthly',
    unit: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedService, setEditedService] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiHealthStatus, setApiHealthStatus] = useState({ status: 'pending' });

  // Filter services based on search query
  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (!searchQuery) return services;
    
    return services.filter(service => 
      service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.unit?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [services, searchQuery]);

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
      logger.info('[ServiceManagement] Fetching services...');
      
      try {
        const response = await serviceApi.getAll();
        logger.debug('[ServiceManagement] Services data:', response);
        
        // Check for the new response format with data field
        const servicesData = response.data || response;
        setServices(Array.isArray(servicesData) ? servicesData : []);
        setApiHealthStatus({ status: 'healthy' });
      } catch (apiError) {
        // Handle errors in API client
        logger.error('[ServiceManagement] Error in API call:', apiError);
        
        // Use mock data if the API call fails with a 500 error
        if (apiError.response?.status === 500) {
          logger.info('[ServiceManagement] API returned 500 error, using mock data');
          const mockServices = [
            {
              id: 'mock-1',
              name: 'Sample Service 1',
              description: 'This is a sample service for demonstration',
              price: 99.99,
              is_for_sale: true,
              is_recurring: false,
              salestax: 5,
              duration: '1 hour',
              billing_cycle: 'monthly',
              unit: 'hour',
              created_at: new Date().toISOString()
            },
            {
              id: 'mock-2',
              name: 'Sample Service 2',
              description: 'Another sample service for demonstration',
              price: 149.99,
              is_for_sale: true,
              is_recurring: true,
              salestax: 7,
              duration: '30 min',
              billing_cycle: 'monthly',
              unit: 'session',
              created_at: new Date().toISOString()
            }
          ];
          setServices(mockServices);
          setApiHealthStatus({ status: 'mock', message: 'Using mock data' });
          
          if (apiError.message?.includes('relation') && 
              apiError.message?.includes('does not exist')) {
            notifyInfo('Your service database is being set up. This should only happen once.');
          } else {
            notifyWarning('Using demo data while database connection is being established.');
          }
          return;
        }
        
        setServices([]);
        setApiHealthStatus({ status: 'error', message: apiError.message });
        
        if (apiError.message?.includes('relation') && 
            apiError.message?.includes('does not exist')) {
          notifyInfo('Your service database is being set up. This should only happen once.');
        } else {
          notifyError('Failed to load services. Please try again.');
        }
      }
    } catch (error) {
      logger.error('[ServiceManagement] Error fetching services:', error);
      setServices([]);
      setApiHealthStatus({ status: 'error', message: error.message });
      notifyError('Failed to load services. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = useCallback((newValue) => {
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
    if (e) e.preventDefault();
    setIsSubmitting(true);
    logger.info('[ServiceManagement] Creating service:', newService);
    try {
      // Map form field names to API expected field names
      const mappedService = {
        name: newService.name,
        description: newService.description,
        price: parseFloat(newService.price) || 0,
        is_for_sale: newService.is_for_sale,
        is_recurring: newService.is_recurring,
        salestax: parseFloat(newService.salestax) || 0,
        duration: newService.duration,
        billing_cycle: newService.billing_cycle,
        unit: newService.unit || ''
      };
      
      logger.debug('[ServiceManagement] Sending POST request to create service with mapped data:', mappedService);
      const response = await serviceApi.create(mappedService);
      logger.info('[ServiceManagement] Service created successfully:', response);
      notifySuccess('Service created successfully');
      setNewService({
        name: '',
        description: '',
        price: '',
        is_for_sale: true,
        is_recurring: false,
        salestax: '',
        duration: '',
        billing_cycle: 'monthly',
        unit: ''
      });
      fetchServices();
      // Switch to List tab after creation
      setActiveTab(2);
    } catch (error) {
      logger.error('[ServiceManagement] Error creating service:', error);
      let errorMessage = 'Error creating service';
      if (error.response) {
        logger.error('[ServiceManagement] Error response:', error.response.status, error.response.data);
        errorMessage = error.response.data?.message || errorMessage;
      }
      notifyError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleServiceSelect = useCallback((service) => {
    logger.info('[ServiceManagement] Service selected:', service.id);
    setCurrentService(service);
    setActiveTab(1);
  }, []);

  const handleEditService = useCallback(() => {
    logger.info('[ServiceManagement] Editing service:', currentService?.id);
    setIsEditing(true);
    setEditedService({ ...currentService });
  }, [currentService]);

  const handleCancelEdit = useCallback(() => {
    logger.info('[ServiceManagement] Canceling edit');
    setIsEditing(false);
    setEditedService(null);
  }, []);

  const handleSaveEdit = async () => {
    logger.info('[ServiceManagement] Saving edited service:', editedService);
    setIsSubmitting(true);
    try {
      // Map form field names to API expected field names
      const mappedService = {
        id: editedService.id,
        name: editedService.name,
        description: editedService.description,
        price: parseFloat(editedService.price) || 0,
        is_for_sale: editedService.is_for_sale,
        is_recurring: editedService.is_recurring,
        salestax: parseFloat(editedService.salestax) || 0,
        duration: editedService.duration,
        billing_cycle: editedService.billing_cycle,
        unit: editedService.unit || ''
      };
      
      const response = await serviceApi.update(mappedService.id, mappedService);
      logger.info('[ServiceManagement] Service updated successfully:', response);
      notifySuccess('Service updated successfully');
      
      // Update local state
      setIsEditing(false);
      setEditedService(null);
      
      // Update selected service with the new data
      setCurrentService(response.data || mappedService);
      
      // Refresh services list
      fetchServices();
    } catch (error) {
      logger.error('[ServiceManagement] Error updating service:', error);
      let errorMessage = 'Error updating service';
      if (error.response) {
        logger.error('[ServiceManagement] Error response:', error.response.status, error.response.data);
        errorMessage = error.response.data?.message || errorMessage;
      }
      notifyError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!currentService) return;
    
    logger.info('[ServiceManagement] Deleting service:', currentService.id);
    setIsSubmitting(true);
    try {
      await serviceApi.delete(currentService.id);
      notifySuccess('Service deleted successfully');
      setDeleteDialogOpen(false);
      setCurrentService(null);
      setActiveTab(2);
      fetchServices();
    } catch (error) {
      logger.error('[ServiceManagement] Error deleting service:', error);
      notifyError('Error deleting service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportClick = useCallback((event) => {
    setExportAnchorEl(event.currentTarget);
  }, []);

  const handleExportClose = useCallback(() => {
    setExportAnchorEl(null);
  }, []);

  const handleExport = useCallback((format) => {
    logger.info(`[ServiceManagement] Exporting in ${format} format`);
    notifyInfo(`Exporting services as ${format}...`);
    handleExportClose();
    // Implement export functionality here
    setTimeout(() => {
      notifySuccess(`Services exported as ${format} successfully`);
    }, 1500);
  }, []);

  throttledDebugLog('[ServiceManagement] Rendering with activeTab:', activeTab);
  
  // Create Service Form
  const renderCreateServiceForm = () => {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create New Service</h2>
              <p className="text-sm text-gray-500 mt-1">
                Add a new service to your business catalog
              </p>
            </div>
            <button
              onClick={() => setActiveTab(2)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View Service List
            </button>
          </div>
        </div>

        <div className="p-6">
          {apiHealthStatus?.status === 'error' && <DatabaseErrorFallback />}
          
          <form onSubmit={handleCreateService}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                {/* Service Name */}
                <div className="sm:col-span-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Service Name
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={newService.name}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="e.g. Web Design Consultation"
                      required
                    />
                  </div>
                </div>

                {/* Service Description */}
                <div className="sm:col-span-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Service Description
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      value={newService.description}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Describe your service"
                    />
                  </div>
                </div>

                {/* Duration and Unit */}
                <div className="sm:col-span-3">
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                    Duration (optional)
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="duration"
                      id="duration"
                      value={newService.duration}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="e.g. 1 hour"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                    Unit (optional)
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="unit"
                      id="unit"
                      value={newService.unit}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="e.g. hour, session, project"
                    />
                  </div>
                </div>

                {/* Price */}
                <div className="sm:col-span-3">
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                    Price ($)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="price"
                      id="price"
                      min="0"
                      step="0.01"
                      value={newService.price}
                      onChange={handleInputChange}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Sales Tax */}
                <div className="sm:col-span-3">
                  <label htmlFor="salestax" className="block text-sm font-medium text-gray-700">
                    Sales Tax (%)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      name="salestax"
                      id="salestax"
                      min="0"
                      step="0.01"
                      value={newService.salestax}
                      onChange={handleInputChange}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                      placeholder="0.00"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">%</span>
                    </div>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="sm:col-span-6">
                  <div className="space-y-4">
                    <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="is_for_sale"
                          name="is_for_sale"
                          type="checkbox"
                          checked={newService.is_for_sale}
                          onChange={(e) => handleInputChange({
                            target: { name: e.target.name, value: e.target.checked }
                          })}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="is_for_sale" className="font-medium text-gray-700">
                          Available for Sale
                        </label>
                        <p className="text-gray-500">Make this service available in your catalog</p>
                      </div>
                    </div>

                    <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="is_recurring"
                          name="is_recurring"
                          type="checkbox"
                          checked={newService.is_recurring}
                          onChange={(e) => handleInputChange({
                            target: { name: e.target.name, value: e.target.checked }
                          })}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="is_recurring" className="font-medium text-gray-700">
                          Recurring Service
                        </label>
                        <p className="text-gray-500">This service will be billed on a regular schedule</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Billing Cycle (conditional) */}
                {newService.is_recurring && (
                  <div className="sm:col-span-3">
                    <label htmlFor="billing_cycle" className="block text-sm font-medium text-gray-700">
                      Billing Cycle
                    </label>
                    <div className="mt-1">
                      <select
                        id="billing_cycle"
                        name="billing_cycle"
                        value={newService.billing_cycle || ''}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      >
                        <option value="">Select Billing Cycle</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="biannually">Bi-annually</option>
                        <option value="annually">Annually</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-5">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab(2)}
                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`ml-3 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      'Create Service'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Service Details
  const renderServiceData = () => {
    if (!currentService) {
      return (
        <div className="text-center p-8">
          <p className="text-gray-500">Please select a service to view its details</p>
        </div>
      );
    }

    return (
      <div className="bg-white shadow rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{currentService.name}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Service details and configuration
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab(2)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to List
              </button>
              <button
                onClick={() => handleEditService(currentService)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Edit Service
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {apiHealthStatus?.status === 'error' && <DatabaseErrorFallback />}
          
          <div className="border-b border-gray-200 pb-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Service Information</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Service ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{currentService.id || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {currentService.created_at 
                    ? new Date(currentService.created_at).toLocaleDateString() 
                    : 'N/A'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {currentService.description || 'No description provided'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Duration</dt>
                <dd className="mt-1 text-sm text-gray-900">{currentService.duration || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Unit</dt>
                <dd className="mt-1 text-sm text-gray-900">{currentService.unit || 'N/A'}</dd>
              </div>
            </dl>
          </div>

          <div className="border-b border-gray-200 pb-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing Information</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Price</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  ${parseFloat(currentService.price || 0).toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Sales Tax</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {currentService.salestax ? `${currentService.salestax}%` : 'No tax'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    currentService.is_for_sale 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {currentService.is_for_sale ? 'Available for Sale' : 'Not Available'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Service Type</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    currentService.is_recurring 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {currentService.is_recurring ? 'Recurring' : 'One-time'}
                  </span>
                </dd>
              </div>
              {currentService.is_recurring && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Billing Cycle</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">
                    {currentService.billing_cycle || 'N/A'}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setActiveTab(2)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Service List
            </button>
            <button
              onClick={() => handleDeleteService(currentService.id)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Service
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Service List
  const renderServicesList = () => {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Services</h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage your business services
              </p>
            </div>
            <button
              onClick={() => setActiveTab(1)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add New Service
            </button>
          </div>
        </div>

        {apiHealthStatus?.status === 'error' && <DatabaseErrorFallback />}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No services found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new service.</p>
            <div className="mt-6">
              <button
                onClick={() => setActiveTab(1)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Service
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {services.map((service) => (
                  <tr 
                    key={service.id} 
                    className={`hover:bg-gray-50 ${currentService?.id === service.id ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {service.name}
                          </div>
                          {service.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {service.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${parseFloat(service.price).toFixed(2)}
                      </div>
                      {service.salestax > 0 && (
                        <div className="text-xs text-gray-500">
                          +{service.salestax}% tax
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {service.is_recurring ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Recurring
                          {service.billing_cycle && (
                            <span className="ml-1">({service.billing_cycle})</span>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          One-time
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {service.is_for_sale ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setCurrentService(service);
                          setActiveTab(3);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          setIsConfirmDeleteOpen(true);
                          setServiceToDelete(service);
                        }}
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
        )}
      </div>
    );
  };

  // Database error fallback component
  const DatabaseErrorFallback = () => (
    <Alert severity="error" className="mb-6">
      <div className="flex flex-col">
        <Typography variant="subtitle1" className="font-semibold mb-1">
          Database Connection Error
        </Typography>
        <Typography variant="body2">
          We're having trouble connecting to your services database. This could be because:
        </Typography>
        <ul className="list-disc list-inside mt-2 text-sm">
          <li>Your database is still being initialized</li>
          <li>There's a temporary connection issue</li>
          <li>Your service tables need to be set up</li>
        </ul>
        <div className="mt-4">
          <Button 
            variant="contained" 
            color="primary"
            onClick={fetchServices} 
            size="small"
            startIcon={<RefreshIcon />}
          >
            Retry Connection
          </Button>
        </div>
      </div>
    </Alert>
  );

  // Delete confirmation dialog
  const renderDeleteDialog = () => {
    return (
      <Transition.Root show={deleteDialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setDeleteDialogOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                  <DialogTitle>Confirm Delete</DialogTitle>
                  <DialogContent>
                    <Typography variant="body1" className="mb-4">
                      Are you sure you want to delete this service? This action cannot be undone.
                    </Typography>
                    
                    {currentService && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <Typography variant="subtitle1" className="font-medium">
                          {currentService.name}
                        </Typography>
                        <Typography variant="body2" className="text-gray-600">
                          ${parseFloat(currentService.price).toFixed(2)} · {currentService.duration ? `${currentService.duration} min` : 'No duration'}
                        </Typography>
                      </div>
                    )}
                  </DialogContent>
                  <DialogActions>
                    <Button 
                      variant="outlined"
                      onClick={() => setDeleteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="contained"
                      color="error"
                      onClick={handleConfirmDelete}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <CircularProgress size="small" color="primary" className="mr-2" />
                          <span>Deleting...</span>
                        </div>
                      ) : (
                        'Delete Service'
                      )}
                    </Button>
                  </DialogActions>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    );
  };

  return (
    <div className="p-6 bg-gray-50">
      <h1 className="text-2xl font-bold text-black mb-4">
        Service Management
      </h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">
            Total Services
          </h2>
          <p className="text-3xl font-bold text-black mt-2">
            {services.length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">
            For Sale
          </h2>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {services.filter(s => s.is_for_sale).length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">
            Recurring Services
          </h2>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {services.filter(s => s.is_recurring).length}
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-2">
          <button
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
            onClick={fetchServices}
          >
            <RefreshIcon className="h-5 w-5 mr-2" />
            Refresh
          </button>
          <button
            className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={() => {
              setCurrentService(null);
              setIsEditing(false);
              setActiveTab(0);
            }}
          >
            <AddCircleOutlineIcon className="h-5 w-5 mr-2" />
            Add Service
          </button>
        </div>
      </div>
      
      {apiHealthStatus?.status === 'error' && <DatabaseErrorFallback />}
      
      {/* Content area */}
      {activeTab === 0 && renderCreateServiceForm()}
      {activeTab === 1 && renderServiceData()}
      {activeTab === 2 && renderServicesList()}

      {/* Render dialogs */}
      {renderDeleteDialog()}
    </div>
  );
};

// Export with React.memo for performance optimization
export default React.memo(ServiceManagement);
