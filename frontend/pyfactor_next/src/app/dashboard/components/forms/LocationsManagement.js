'use client';

import React, { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { getCacheValue } from '@/utils/appCache';
import { getSecureTenantId } from '@/utils/tenantUtils';
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
    type: 'warehouse',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'USA',
    manager: '',
    phone: '',
    email: '',
    capacity: '',
    is_active: true,
    notes: ''
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
      
      if (!tenantId) {
        console.error('[LocationsManagement] No tenant ID found');
        toast.error('Authentication required. Please log in again.');
        return;
      }
      
      const response = await fetch('/api/inventory/locations', {
        headers: {
          'x-tenant-id': tenantId
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch locations: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[LocationsManagement] Fetched locations:', data?.length || 0);
      
      if (isMounted.current) {
        setLocations(Array.isArray(data) ? data : []);
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
  const handleCreateLocation = async (e) => {
    e.preventDefault();
    console.log('[LocationsManagement] Creating location with data:', formData);
    
    try {
      setIsSubmitting(true);
      
      if (!tenantId) {
        toast.error('Authentication required.');
        return;
      }
      
      const response = await fetch('/api/inventory/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create location: ${response.status}`);
      }
      
      const newLocation = await response.json();
      console.log('[LocationsManagement] Location created:', newLocation);
      
      toast.success(`Location "${formData.name}" created successfully!`);
      
      // Reset form and refresh list
      setFormData({
        name: '',
        type: 'warehouse',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'USA',
        manager: '',
        phone: '',
        email: '',
        capacity: '',
        is_active: true,
        notes: ''
      });
      setIsCreating(false);
      fetchLocations();
    } catch (error) {
      console.error('[LocationsManagement] Error creating location:', error);
      toast.error('Failed to create location.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update location
  const handleUpdateLocation = async (e) => {
    e.preventDefault();
    console.log('[LocationsManagement] Updating location:', selectedLocation?.id);
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/inventory/locations/${selectedLocation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update location: ${response.status}`);
      }
      
      const updatedLocation = await response.json();
      console.log('[LocationsManagement] Location updated:', updatedLocation);
      
      toast.success('Location updated successfully!');
      
      setLocations(locations.map(l => l.id === selectedLocation.id ? updatedLocation : l));
      setIsEditing(false);
      setSelectedLocation(updatedLocation);
    } catch (error) {
      console.error('[LocationsManagement] Error updating location:', error);
      toast.error('Failed to update location.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete location
  const handleDeleteLocation = async () => {
    if (!locationToDelete) return;
    
    console.log('[LocationsManagement] Deleting location:', locationToDelete.id);
    
    try {
      const response = await fetch(`/api/inventory/locations/${locationToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': tenantId
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete location: ${response.status}`);
      }
      
      console.log('[LocationsManagement] Location deleted successfully');
      
      toast.success('Location deleted successfully!');
      setLocations(locations.filter(l => l.id !== locationToDelete.id));
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
      
      if (selectedLocation?.id === locationToDelete.id) {
        setShowLocationDetails(false);
        setSelectedLocation(null);
      }
    } catch (error) {
      console.error('[LocationsManagement] Error deleting location:', error);
      toast.error('Failed to delete location.');
    }
  };

  // Handle view location details
  const handleViewLocation = useCallback((location) => {
    console.log('[LocationsManagement] Viewing location:', location);
    setSelectedLocation(location);
    setShowLocationDetails(true);
    setIsCreating(false);
    setIsEditing(false);
  }, []);

  // Handle edit location
  const handleEditLocation = useCallback((location) => {
    console.log('[LocationsManagement] Editing location:', location);
    setSelectedLocation(location);
    setFormData({
      name: location.name || '',
      type: location.type || 'warehouse',
      address: location.address || '',
      city: location.city || '',
      state: location.state || '',
      zip_code: location.zip_code || '',
      country: location.country || 'USA',
      manager: location.manager || '',
      phone: location.phone || '',
      email: location.email || '',
      capacity: location.capacity || '',
      is_active: location.is_active !== false,
      notes: location.notes || ''
    });
    setIsEditing(true);
    setShowLocationDetails(true);
  }, []);

  // Filter locations based on search
  const filteredLocations = locations.filter(location => 
    location.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.manager?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render location form
  const renderLocationForm = () => {
    const isEditMode = isEditing && selectedLocation;
    
    return (
      <form onSubmit={isEditMode ? handleUpdateLocation : handleCreateLocation} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter location name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="warehouse">Warehouse</option>
              <option value="retail">Retail Store</option>
              <option value="distribution">Distribution Center</option>
              <option value="storage">Storage Facility</option>
              <option value="office">Office</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manager
            </label>
            <input
              type="text"
              name="manager"
              value={formData.manager}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Location manager name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacity
            </label>
            <input
              type="text"
              name="capacity"
              value={formData.capacity}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 10,000 sq ft"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+1 (555) 123-4567"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="location@example.com"
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Street address"
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="City"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="State"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zip Code
              </label>
              <input
                type="text"
                name="zip_code"
                value={formData.zip_code}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="12345"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Country"
              />
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleFormChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional notes about the location..."
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
                type: 'warehouse',
                address: '',
                city: '',
                state: '',
                zip_code: '',
                country: 'USA',
                manager: '',
                phone: '',
                email: '',
                capacity: '',
                is_active: true,
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
              <span>{isEditMode ? 'Update Location' : 'Create Location'}</span>
            )}
          </button>
        </div>
      </form>
    );
  };

  // Render location details
  const renderLocationDetails = () => {
    if (!selectedLocation) return null;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Location Name</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedLocation.name}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Type</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedLocation.type || 'Not specified'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Manager</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedLocation.manager || 'Not assigned'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Capacity</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedLocation.capacity || 'Not specified'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Phone</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedLocation.phone || 'Not provided'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Email</h3>
            <p className="mt-1 text-sm text-gray-900">{selectedLocation.email || 'Not provided'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              selectedLocation.is_active !== false
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {selectedLocation.is_active !== false ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        
        {(selectedLocation.address || selectedLocation.city || selectedLocation.state || selectedLocation.zip_code || selectedLocation.country) && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Address</h3>
            <p className="mt-1 text-sm text-gray-900">
              {[selectedLocation.address, selectedLocation.city, selectedLocation.state, selectedLocation.zip_code, selectedLocation.country]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        )}
        
        {selectedLocation.notes && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Notes</h3>
            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedLocation.notes}</p>
          </div>
        )}
        
        <div className="pt-6 border-t">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Location Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Total Products</p>
              <p className="text-lg font-semibold">0</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Total Stock Value</p>
              <p className="text-lg font-semibold">$0.00</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Stock Movements</p>
              <p className="text-lg font-semibold">0</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Last Activity</p>
              <p className="text-lg font-semibold">Never</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render locations table
  const renderLocationsTable = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading locations...</p>
          </div>
        </div>
      );
    }
    
    if (!filteredLocations || filteredLocations.length === 0) {
      return (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No locations found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search.' : 'Get started by creating a new location.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={() => {
                  setIsCreating(true);
                  setShowLocationDetails(false);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Location
              </button>
            </div>
          )}
        </div>
      );
    }
    
    return (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Manager</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">City</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Capacity</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredLocations.map((location) => (
            <tr key={location.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-black">{location.name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">{location.type || 'Not specified'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">{location.manager || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">{location.city || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-black">{location.capacity || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  location.is_active !== false
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {location.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => handleViewLocation(location)}
                  className="text-blue-600 hover:text-blue-900 mr-3"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleEditLocation(location)}
                  className="text-green-600 hover:text-green-900 mr-3"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setLocationToDelete(location);
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
      <Dialog as="div" className="relative z-10" onClose={setDeleteDialogOpen}>
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c0 1.378 1.068 2.508 2.428 2.574 1.351.066 2.7.103 4.051.103 2.787 0 5.532-.138 8.206-.361M12 9c-2.549 0-5.058.168-7.51.486M12 9l3.75-3.75M12 9l-3.75-3.75m9.344 10.301c1.36-.066 2.428-1.196 2.428-2.574V5.25m0 8.526c0 1.378-1.068 2.508-2.428 2.574M19.594 13.776V5.25m0 0a2.25 2.25 0 00-2.25-2.25h-10.5a2.25 2.25 0 00-2.25 2.25v8.526c0 1.378 1.068 2.508 2.428 2.574" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                        Delete Location
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete <span className="font-medium">{locationToDelete?.name}</span>? This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                    onClick={handleDeleteLocation}
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
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );

  return (
    <div className="p-6 bg-gray-50">
      <h1 className="text-2xl font-bold text-black mb-4">Locations Management</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Locations</h2>
          <p className="text-3xl font-bold text-blue-600 mt-2">{locations.length}</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Active Locations</h2>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {locations.filter(l => l.is_active !== false).length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">Warehouses</h2>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {locations.filter(l => l.type === 'warehouse').length}
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-black">Other Types</h2>
          <p className="text-3xl font-bold text-orange-600 mt-2">
            {locations.filter(l => l.type !== 'warehouse').length}
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
        
        <div className="flex space-x-2">
          <button
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
            onClick={() => {
              console.log('[LocationsManagement] Filter clicked');
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
              console.log('[LocationsManagement] Add Location clicked');
              setIsCreating(true);
              setShowLocationDetails(false);
              setSelectedLocation(null);
              setIsEditing(false);
            }}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Location
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      {showLocationDetails && selectedLocation ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-black">{selectedLocation.name}</h2>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: '',
                        type: 'warehouse',
                        address: '',
                        city: '',
                        state: '',
                        zip_code: '',
                        country: 'USA',
                        manager: '',
                        phone: '',
                        email: '',
                        capacity: '',
                        is_active: true,
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
                    onClick={() => handleEditLocation(selectedLocation)}
                    className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setLocationToDelete(selectedLocation);
                      setDeleteDialogOpen(true);
                    }}
                    className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowLocationDetails(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white text-black hover:bg-gray-50 transition-colors"
                  >
                    Back to List
                  </button>
                </>
              )}
            </div>
          </div>
          
          {isEditing ? renderLocationForm() : renderLocationDetails()}
        </div>
      ) : isCreating ? (
        <div className="bg-white shadow rounded-lg mt-6 p-6">
          <h2 className="text-xl font-bold text-black mb-6">Create New Location</h2>
          {renderLocationForm()}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            {renderLocationsTable()}
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      {renderDeleteDialog()}
    </div>
  );
};

export default LocationsManagement;