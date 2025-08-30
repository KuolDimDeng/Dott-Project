'use client';

import React, { useState, useEffect } from 'react';
import { 
  TruckIcon,
  GlobeAltIcon,
  MapPinIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function DeliverySettings({ businessId }) {
  const [deliveryScope, setDeliveryScope] = useState('local');
  const [deliveryRadius, setDeliveryRadius] = useState(10);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Common countries for international shipping
  const countries = [
    { code: 'KE', name: 'Kenya' },
    { code: 'UG', name: 'Uganda' },
    { code: 'TZ', name: 'Tanzania' },
    { code: 'RW', name: 'Rwanda' },
    { code: 'ET', name: 'Ethiopia' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'GH', name: 'Ghana' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'EG', name: 'Egypt' },
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AE', name: 'UAE' },
    { code: 'IN', name: 'India' },
    { code: 'CN', name: 'China' },
  ];

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/marketplace/business/my_listing', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setDeliveryScope(data.delivery_scope || 'local');
        setDeliveryRadius(data.delivery_radius_km || 10);
        setSelectedCountries(data.ships_to_countries || []);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load delivery settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const payload = {
        delivery_scope: deliveryScope,
        delivery_radius_km: deliveryScope === 'local' ? deliveryRadius : null,
        ships_to_countries: deliveryScope === 'international' ? selectedCountries : [],
        is_digital_only: deliveryScope === 'digital'
      };

      const response = await fetch('/api/marketplace/business/update_delivery_settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('Delivery settings updated successfully!');
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save delivery settings');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCountry = (countryCode) => {
    setSelectedCountries(prev => {
      if (prev.includes(countryCode)) {
        return prev.filter(c => c !== countryCode);
      }
      return [...prev, countryCode];
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Delivery & Service Area Settings
      </h2>
      
      <div className="space-y-4">
        {/* Local Delivery */}
        <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            value="local"
            checked={deliveryScope === 'local'}
            onChange={(e) => setDeliveryScope(e.target.value)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <MapPinIcon className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Local Delivery Only</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Serve customers within your city/area only
            </p>
            
            {deliveryScope === 'local' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700">
                  Delivery Radius (km)
                </label>
                <input
                  type="number"
                  value={deliveryRadius}
                  onChange={(e) => setDeliveryRadius(parseInt(e.target.value) || 10)}
                  min="1"
                  max="100"
                  className="mt-1 w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum distance you can deliver
                </p>
              </div>
            )}
          </div>
        </label>

        {/* National Delivery */}
        <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            value="national"
            checked={deliveryScope === 'national'}
            onChange={(e) => setDeliveryScope(e.target.value)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <TruckIcon className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Nationwide Delivery</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Deliver anywhere within your country
            </p>
          </div>
        </label>

        {/* International Shipping */}
        <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            value="international"
            checked={deliveryScope === 'international'}
            onChange={(e) => setDeliveryScope(e.target.value)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <GlobeAltIcon className="w-5 h-5 text-gray-600" />
              <span className="font-medium">International Shipping</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Ship to multiple countries worldwide
            </p>
            
            {deliveryScope === 'international' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Countries You Ship To:
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedCountries.length === 0}
                      onChange={() => setSelectedCountries([])}
                    />
                    <span className="text-sm">All Countries</span>
                  </label>
                  {countries.map(country => (
                    <label key={country.code} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedCountries.includes(country.code)}
                        onChange={() => toggleCountry(country.code)}
                      />
                      <span className="text-sm">{country.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </label>

        {/* Digital/Online Service */}
        <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            value="digital"
            checked={deliveryScope === 'digital'}
            onChange={(e) => setDeliveryScope(e.target.value)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <ComputerDesktopIcon className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Digital/Online Service</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              No physical delivery - online services only (consulting, design, courses, etc.)
            </p>
          </div>
        </label>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`px-6 py-2 rounded-lg text-white font-medium ${
            isSaving 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-1">
          Why Delivery Settings Matter
        </h3>
        <p className="text-sm text-blue-700">
          Your delivery settings determine which customers can find and order from you. 
          Local businesses appear to nearby customers, while international businesses 
          reach a global audience. Choose the option that best fits your business model.
        </p>
      </div>
    </div>
  );
}