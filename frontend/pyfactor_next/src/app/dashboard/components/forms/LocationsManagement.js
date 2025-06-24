'use client';

import React, { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { locationApi } from '@/utils/apiClient';
import { logger } from '@/utils/logger';

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

// Custom Typography component to match ProductManagement
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

const LocationsManagement = () => {
  // State management
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState(2); // 0: Create, 1: Details, 2: List
  const [editedLocation, setEditedLocation] = useState(null);
  
  // Refs
  const isMounted = useRef(true);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    is_active: true
  });

  useEffect(() => {
    isMounted.current = true;
    fetchLocations();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('[LocationsManagement] Fetching locations...');
      
      const data = await locationApi.getAll();
      console.log('[LocationsManagement] Raw API response:', data);
      
      if (isMounted.current) {
        // Handle different response formats (direct array or paginated)
        let locations = [];
        if (Array.isArray(data)) {
          locations = data;
        } else if (data && Array.isArray(data.results)) {
          // DRF paginated response
          locations = data.results;
        } else if (data && Array.isArray(data.data)) {
          // Alternative format
          locations = data.data;
        }
        console.log('[LocationsManagement] Extracted locations array:', locations);
        setLocations(locations);
      }
    } catch (error) {
      console.error('[LocationsManagement] Error:', error);
      if (isMounted.current) {
        setLocations([]);
        toast.error('Failed to load locations.');
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

  // Handle create location
  const handleCreateLocation = useCallback(async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Location name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const newLocation = await locationApi.create(formData);
      toast.success('Location created successfully');
      
      setLocations(prev => [...prev, newLocation]);
      setActiveTab(2); // Go to list view
      setFormData({
        name: '',
        description: '',
        address: '',
        is_active: true
      });
    } catch (error) {
      console.error('[LocationsManagement] Create error:', error);
      toast.error(error.message || 'Failed to create location');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData]);

  // Handle edit click
  const handleEditClick = useCallback((location) => {
    setSelectedLocation(location);
    setEditedLocation({ ...location });
    setActiveTab(0); // Switch to create/edit tab
    setIsEditing(true);
  }, []);

  // Handle view details
  const handleViewDetails = useCallback((location) => {
    setSelectedLocation(location);
    setActiveTab(1); // Switch to details tab
  }, []);

  // Handle save edit
  const handleSaveEdit = useCallback(async () => {
    if (!editedLocation?.id) return;

    try {
      setIsSubmitting(true);
      const updatedLocation = await locationApi.update(editedLocation.id, editedLocation);
      toast.success('Location updated successfully');
      
      setLocations(prev => prev.map(loc => 
        loc.id === editedLocation.id ? updatedLocation : loc
      ));
      setActiveTab(2); // Go back to list
      setIsEditing(false);
      setSelectedLocation(null);
      setEditedLocation(null);
    } catch (error) {
      console.error('[LocationsManagement] Update error:', error);
      toast.error(error.message || 'Failed to update location');
    } finally {
      setIsSubmitting(false);
    }
  }, [editedLocation]);

  // Handle delete location
  const handleDeleteLocation = useCallback(async () => {
    if (!locationToDelete?.id) return;

    try {
      setIsSubmitting(true);
      await locationApi.delete(locationToDelete.id);
      toast.success('Location deleted successfully');
      
      setLocations(prev => prev.filter(loc => loc.id !== locationToDelete.id));
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
      
      // If deleted location was selected, clear selection
      if (selectedLocation && selectedLocation.id === locationToDelete.id) {
        setSelectedLocation(null);
        setActiveTab(2); // Go back to list
      }
    } catch (error) {
      console.error('[LocationsManagement] Delete error:', error);
      toast.error(error.message || 'Failed to delete location');
    } finally {
      setIsSubmitting(false);
    }
  }, [locationToDelete, selectedLocation]);

  // Filter locations based on search
  const filteredLocations = locations.filter(location =>
    location.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render create/edit form
  const renderForm = () => {
    const isEditMode = isEditing && editedLocation;
    const currentData = isEditMode ? editedLocation : formData;
    const handleChange = isEditMode 
      ? (e) => {
          const { name, value, type, checked } = e.target;
          setEditedLocation(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
          }));
        }
      : handleFormChange;

    return (
      <form onSubmit={isEditMode ? (e) => { e.preventDefault(); handleSaveEdit(); } : handleCreateLocation}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-black mb-1">
              <span className="flex items-center">
                Location Name *
                <FieldTooltip 
                  text="Enter a descriptive name for this location or warehouse. This name will appear in product listings, inventory reports, and transfer documents. Examples: 'Main Warehouse', 'Store Front', 'North Distribution Center'"
                  position="bottom"
                />
              </span>
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={currentData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Main Warehouse"
              required
            />
          </div>
          
          <div>
            <label htmlFor="is_active" className="block text-sm font-medium text-black mb-1">
              <span className="flex items-center">
                Status
                <FieldTooltip 
                  text="Active locations can receive inventory and be selected in product forms. Inactive locations are hidden from selection but maintain historical data. Deactivate locations that are temporarily closed or being phased out."
                  position="bottom"
                />
              </span>
            </label>
            <div className="flex items-center mt-2">
              <input
                id="is_active"
                type="checkbox"
                name="is_active"
                checked={currentData.is_active}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Active Location
              </label>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-black mb-1">
            <span className="flex items-center">
              Description
              <FieldTooltip 
                text="Provide additional details about this location such as storage capacity, special handling capabilities, operating hours, or any specific notes that help staff identify or work with this location."
                position="bottom"
              />
            </span>
          </label>
          <textarea
            id="description"
            name="description"
            value={currentData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Brief description of the location..."
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="address" className="block text-sm font-medium text-black mb-1">
            <span className="flex items-center">
              Address
              <FieldTooltip 
                text="Enter the complete physical address of this location. This helps with shipping logistics, delivery coordination, and tax calculations. Include street address, city, state/province, postal code, and country if applicable."
                position="bottom"
              />
            </span>
          </label>
          <textarea
            id="address"
            name="address"
            value={currentData.address}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Full address of the location..."
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setIsEditing(false);
              setEditedLocation(null);
              setActiveTab(2); // Go back to list
              setFormData({
                name: '',
                description: '',
                address: '',
                is_active: true
              });
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Location' : 'Create Location')}
          </button>
        </div>
      </form>
    );
  };

  // Render location details
  const renderLocationDetails = () => {
    if (!selectedLocation) {
      return (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">No location selected</p>
        </div>
      );
    }

    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-black">{selectedLocation.name}</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => handleEditClick(selectedLocation)}
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setActiveTab(2)}
              className="px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
            >
              Back to List
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Typography variant="subtitle1" color="textSecondary" gutterBottom>
              Description
            </Typography>
            <Typography variant="body1">
              {selectedLocation.description || 'No description provided'}
            </Typography>
          </div>
          
          <div>
            <Typography variant="subtitle1" color="textSecondary" gutterBottom>
              Status
            </Typography>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              selectedLocation.is_active 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {selectedLocation.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          <div className="md:col-span-2">
            <Typography variant="subtitle1" color="textSecondary" gutterBottom>
              Address
            </Typography>
            <Typography variant="body1">
              {selectedLocation.address || 'No address provided'}
            </Typography>
          </div>
          
          <div>
            <Typography variant="subtitle1" color="textSecondary" gutterBottom>
              Created At
            </Typography>
            <Typography variant="body1">
              {selectedLocation.created_at 
                ? new Date(selectedLocation.created_at).toLocaleDateString()
                : 'N/A'}
            </Typography>
          </div>
          
          <div>
            <Typography variant="subtitle1" color="textSecondary" gutterBottom>
              Updated At
            </Typography>
            <Typography variant="body1">
              {selectedLocation.updated_at 
                ? new Date(selectedLocation.updated_at).toLocaleDateString()
                : 'N/A'}
            </Typography>
          </div>
        </div>
      </div>
    );
  };

  // Render locations list
  const renderLocationsList = () => {
    return (
      <div className="overflow-hidden mt-1 ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  Loading locations...
                </td>
              </tr>
            ) : filteredLocations.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  No locations found
                </td>
              </tr>
            ) : (
              filteredLocations.map((location) => (
                <tr key={location.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{location.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{location.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{location.address || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      location.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {location.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetails(location)}
                        className="px-2 py-1 text-xs font-medium rounded border border-blue-700 text-blue-700 hover:bg-blue-50"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEditClick(location)}
                        className="px-2 py-1 text-xs font-medium rounded border border-purple-700 text-purple-700 hover:bg-purple-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setLocationToDelete(location);
                          setDeleteDialogOpen(true);
                        }}
                        className="px-2 py-1 text-xs font-medium rounded border border-red-700 text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50">
      <h1 className="text-2xl font-bold text-black mb-4">
        Location Management
      </h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">
            Total Locations
          </h2>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {locations.length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">
            Active Locations
          </h2>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {locations.filter(l => l.is_active).length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">
            Inactive Locations
          </h2>
          <p className="text-3xl font-bold text-gray-600 mt-2">
            {locations.filter(l => !l.is_active).length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">
            With Address
          </h2>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {locations.filter(l => l.address).length}
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
            placeholder="Search Locations"
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white text-black focus:ring-blue-500 focus:border-blue-500 min-w-[300px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button
          onClick={() => {
            setActiveTab(0);
            setIsCreating(true);
            setIsEditing(false);
            setSelectedLocation(null);
            setEditedLocation(null);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Create New Location
        </button>
      </div>
      
      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab(0)}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 0
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {isEditing ? 'Edit Location' : 'Create New Location'}
            </button>
            {selectedLocation && (
              <button
                onClick={() => setActiveTab(1)}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 1
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Location Details
              </button>
            )}
            <button
              onClick={() => setActiveTab(2)}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 2
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Locations
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 0 && renderForm()}
          {activeTab === 1 && renderLocationDetails()}
          {activeTab === 2 && (
            <div>
              {(!locations.length && !isLoading) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">No locations found</h3>
                      <div className="mt-1 text-sm text-blue-700">
                        <p>No locations have been added yet. Click the "Create New Location" button to add one.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {renderLocationsList()}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Transition.Root show={deleteDialogOpen} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-50" 
          onClose={setDeleteDialogOpen}
        >
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

          <div className="fixed inset-0 z-10 overflow-y-auto">
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
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                        Delete Location
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete "{locationToDelete?.name}"? This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                      onClick={handleDeleteLocation}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                      onClick={() => {
                        setDeleteDialogOpen(false);
                        setLocationToDelete(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
};

export default LocationsManagement;