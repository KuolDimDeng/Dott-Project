'use client';

import React, { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { locationApi } from '@/utils/apiClient';
import { logger } from '@/utils/logger';

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
      setIsCreating(false);
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

  // Handle update location
  const handleUpdateLocation = useCallback(async (e) => {
    e.preventDefault();
    
    if (!selectedLocation?.id) return;

    try {
      setIsSubmitting(true);
      const updatedLocation = await locationApi.update(selectedLocation.id, formData);
      toast.success('Location updated successfully');
      
      setLocations(prev => prev.map(loc => 
        loc.id === selectedLocation.id ? updatedLocation : loc
      ));
      setIsEditing(false);
      setSelectedLocation(null);
    } catch (error) {
      console.error('[LocationsManagement] Update error:', error);
      toast.error(error.message || 'Failed to update location');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedLocation, formData]);

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
    } catch (error) {
      console.error('[LocationsManagement] Delete error:', error);
      toast.error(error.message || 'Failed to delete location');
    } finally {
      setIsSubmitting(false);
    }
  }, [locationToDelete]);

  // Prepare edit
  const prepareEdit = useCallback((location) => {
    setSelectedLocation(location);
    setFormData({
      name: location.name || '',
      description: location.description || '',
      address: location.address || '',
      is_active: location.is_active !== false
    });
    setIsEditing(true);
    setShowLocationDetails(false);
  }, []);

  // Filter locations based on search
  const filteredLocations = locations.filter(location =>
    location.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderForm = () => (
    <form onSubmit={isEditing ? handleUpdateLocation : handleCreateLocation}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Main Warehouse"
            required
          />
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
            placeholder="Brief description of the location..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleFormChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Full address of the location..."
          />
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            name="is_active"
            id="is_active"
            checked={formData.is_active}
            onChange={handleFormChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
            Active Location
          </label>
        </div>
        
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setIsEditing(false);
              setShowLocationDetails(false);
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
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Locations Management</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <span className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Location
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Locations Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
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
                <tr key={location.id}>
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
                    <button
                      onClick={() => prepareEdit(location)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setLocationToDelete(location);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Dialog */}
      <Transition.Root show={isCreating || isEditing} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-50" 
          onClose={() => {
            setIsCreating(false);
            setIsEditing(false);
          }}
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
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      {isEditing ? 'Edit Location' : 'Create New Location'}
                    </h3>
                    {renderForm()}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

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