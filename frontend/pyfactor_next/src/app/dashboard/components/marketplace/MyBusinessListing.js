'use client';

import React, { useState, useEffect } from 'react';
import { getAdvertiseFormConfig, getInteractionButtonText } from '@/utils/businessInteractionHelpers';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function MyBusinessListing() {
  const [businessType, setBusinessType] = useState('other');
  const [showAdvertiseForm, setShowAdvertiseForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get business type from localStorage or API
    const storedType = localStorage.getItem('businessType');
    if (storedType) {
      setBusinessType(storedType);
    }
    
    // Fetch existing listings
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const response = await fetch('/api/marketplace/listings');
      if (response.ok) {
        const data = await response.json();
        setListings(data.listings || []);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvertise = () => {
    setShowAdvertiseForm(true);
    setFormData({});
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/marketplace/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessType,
          ...formData
        }),
      });
      
      if (response.ok) {
        const newListing = await response.json();
        setListings([newListing, ...listings]);
        setShowAdvertiseForm(false);
        setFormData({});
      }
    } catch (error) {
      console.error('Error creating listing:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Get dynamic form configuration based on business type
  const formConfig = getAdvertiseFormConfig(businessType);
  const interactionText = getInteractionButtonText(businessType);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Business Listing</h1>
        <p className="text-gray-600 mt-2">
          Manage your marketplace presence and advertise your {interactionText.toLowerCase()}
        </p>
      </div>

      {/* Advertise Button - Dynamic based on business type */}
      <div className="mb-6">
        <button
          onClick={handleAdvertise}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          {formConfig.title}
        </button>
      </div>

      {/* Dynamic Advertise Form */}
      {showAdvertiseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">{formConfig.title}</h2>
              <button
                onClick={() => setShowAdvertiseForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formConfig.fields.map((field) => (
                <div key={field.name} className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={formData[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      required={field.required}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  
                  {field.type === 'number' && (
                    <input
                      type="number"
                      value={formData[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      required={field.required}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  
                  {field.type === 'textarea' && (
                    <textarea
                      value={formData[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      required={field.required}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  
                  {field.type === 'select' && (
                    <select
                      value={formData[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      required={field.required}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select {field.label}</option>
                      {field.options?.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  )}
                  
                  {field.type === 'multiselect' && (
                    <div className="space-y-2">
                      {field.options?.map(option => (
                        <label key={option} className="flex items-center">
                          <input
                            type="checkbox"
                            value={option}
                            checked={formData[field.name]?.includes(option) || false}
                            onChange={(e) => {
                              const current = formData[field.name] || [];
                              if (e.target.checked) {
                                handleInputChange(field.name, [...current, option]);
                              } else {
                                handleInputChange(field.name, current.filter(v => v !== option));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {field.type === 'image' && (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleInputChange(field.name, e.target.files[0])}
                      required={field.required}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  
                  {field.type === 'images' && (
                    <input
                      type="file"
                      accept="image/*"
                      multiple={field.multiple}
                      onChange={(e) => handleInputChange(field.name, Array.from(e.target.files))}
                      required={field.required}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  
                  {field.type === 'daterange' && (
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="date"
                        value={formData[`${field.name}_start`] || ''}
                        onChange={(e) => handleInputChange(`${field.name}_start`, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="date"
                        value={formData[`${field.name}_end`] || ''}
                        onChange={(e) => handleInputChange(`${field.name}_end`, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  
                  {field.type === 'location' && (
                    <input
                      type="text"
                      value={formData[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      required={field.required}
                      placeholder="Enter address or location"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  
                  {field.type === 'url' && (
                    <input
                      type="url"
                      value={formData[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      placeholder="https://"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  
                  {field.type === 'tags' && (
                    <input
                      type="text"
                      value={formData[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      placeholder="Enter tags separated by commas"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              ))}
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAdvertiseForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Publish Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Existing Listings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Your Active Listings</h2>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : listings.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No listings yet</h3>
            <p className="text-gray-500 mb-4">
              Start advertising your {interactionText.toLowerCase()} to reach more customers
            </p>
            <button
              onClick={handleAdvertise}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Your First Listing
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {listings.map((listing, index) => (
              <div key={listing.id || index} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {listing.name || listing.title}
                    </h3>
                    <p className="text-gray-600 mt-1">{listing.description}</p>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Price: ${listing.price}</span>
                      <span>•</span>
                      <span>Views: {listing.views || 0}</span>
                      <span>•</span>
                      <span>Inquiries: {listing.inquiries || 0}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                      Edit
                    </button>
                    <button className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}