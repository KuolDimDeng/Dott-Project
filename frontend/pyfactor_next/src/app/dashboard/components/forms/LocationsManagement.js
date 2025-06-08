'use client';


import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const LocationsManagement = () => {
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 for list, 1 for create new

  // Sample data for demonstration
  const sampleLocations = [
    { 
      id: 'LOC-001', 
      name: 'Main Warehouse', 
      type: 'Warehouse', 
      address: '123 Main St, Boston, MA 02108',  
      manager: 'John Smith',
      capacity: '10,000 sq ft',
      status: 'Active' 
    },
    { 
      id: 'LOC-002', 
      name: 'East Coast Distribution', 
      type: 'Distribution Center', 
      address: '456 Commerce Ave, New York, NY 10011', 
      manager: 'Sarah Johnson',
      capacity: '25,000 sq ft',
      status: 'Active' 
    },
    { 
      id: 'LOC-003', 
      name: 'West Retail Store', 
      type: 'Retail', 
      address: '789 Market St, San Francisco, CA 94103', 
      manager: 'David Williams',
      capacity: '2,500 sq ft',
      status: 'Active' 
    },
    { 
      id: 'LOC-004', 
      name: 'Overflow Storage', 
      type: 'Storage', 
      address: '321 Industrial Park, Chicago, IL 60607', 
      manager: 'Michael Chen',
      capacity: '8,000 sq ft',
      status: 'Inactive' 
    },
  ];

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      console.log('[LocationsManagement] Fetching locations...');
      
      // In a real app, this would be an API call
      // For now, we'll use the sample data
      setTimeout(() => {
        setLocations(sampleLocations);
        setIsLoading(false);
      }, 800);
      
    } catch (error) {
      console.error('[LocationsManagement] Error fetching locations:', error);
      setLocations([]);
      toast.error('Failed to load locations. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCreateLocation = (e) => {
    e.preventDefault();
    toast.success('Location creation feature will be implemented soon!');
  };

  const renderLocationsList = () => {
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
    
    if (!locations || locations.length === 0) {
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
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
              />
            </svg>
            <h3 className="text-xl font-semibold mb-2">No Locations Yet</h3>
            <p className="text-gray-500 max-w-md">
              You haven't added any inventory locations yet. Get started by clicking the "Add Location" button.
            </p>
          </div>
          <button 
            onClick={() => setActiveTab(1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Your First Location
          </button>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="w-full h-16 border-gray-300 border-b py-8 bg-gray-50">
              <th className="text-left pl-4">ID</th>
              <th className="text-left">Name</th>
              <th className="text-left">Type</th>
              <th className="text-left">Address</th>
              <th className="text-left">Manager</th>
              <th className="text-left">Capacity</th>
              <th className="text-left">Status</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((location, index) => (
              <tr key={location.id || index} className="h-16 border-gray-300 border-b hover:bg-gray-50">
                <td className="pl-4 font-medium">{location.id}</td>
                <td>{location.name}</td>
                <td>{location.type}</td>
                <td className="max-w-xs truncate">{location.address}</td>
                <td>{location.manager}</td>
                <td>{location.capacity}</td>
                <td>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    location.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {location.status}
                  </span>
                </td>
                <td>
                  <button 
                    className="text-blue-600 hover:text-blue-800 mr-2"
                    onClick={() => handleViewLocation(location)}
                  >
                    View
                  </button>
                  <button 
                    className="text-green-600 hover:text-green-800 mr-2"
                    onClick={() => handleEditLocation(location)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const handleViewLocation = (location) => {
    console.log('View location:', location);
    toast.info(`Viewing location ${location.name}`);
  };

  const handleEditLocation = (location) => {
    console.log('Edit location:', location);
    toast.info(`Edit feature for ${location.name} will be implemented soon`);
  };

  const renderCreateLocationForm = () => {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-medium mb-6">Add New Inventory Location</h2>
        
        <form onSubmit={handleCreateLocation}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location Name
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter location name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location Type
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Type</option>
                <option value="warehouse">Warehouse</option>
                <option value="distribution">Distribution Center</option>
                <option value="retail">Retail Store</option>
                <option value="storage">Storage</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Street address"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="City"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State / Province
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="State/Province"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Zip/Postal code"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Country"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Manager
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Location manager"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capacity (sq ft)
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Storage capacity"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Additional location information"
            ></textarea>
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setActiveTab(0)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add Location
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Inventory Locations</h1>
      
      <div className="mb-4">
        <div className="flex border-b">
          <button
            className={`py-2 px-4 ${activeTab === 0 ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab(0)}
          >
            Locations List
          </button>
          <button
            className={`py-2 px-4 ${activeTab === 1 ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab(1)}
          >
            Add Location
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        {activeTab === 0 ? (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium">Inventory Locations</h2>
              <button
                onClick={() => setActiveTab(1)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Location
              </button>
            </div>
            {renderLocationsList()}
          </div>
        ) : (
          renderCreateLocationForm()
        )}
      </div>
    </div>
  );
};

export default LocationsManagement; 