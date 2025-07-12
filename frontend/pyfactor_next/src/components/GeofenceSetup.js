'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPinIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { getGeofenceTemplate, formatDistance } from '@/utils/locationServices';

// Dynamic import for Leaflet components (client-side only)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false, loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg" /> }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const useMap = dynamic(
  () => import('react-leaflet').then((mod) => mod.useMap),
  { ssr: false }
);

// Custom component to handle map click events
function MapClickHandler({ onMapClick }) {
  const map = useMap();
  
  useEffect(() => {
    const handleClick = (e) => {
      onMapClick(e.latlng);
    };
    
    map.on('click', handleClick);
    
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapClick]);
  
  return null;
}

export default function GeofenceSetup({ 
  onSave, 
  initialData = null,
  tenantId,
  currentLocation = null 
}) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('OFFICE');
  
  // Geofence data
  const [geofenceData, setGeofenceData] = useState({
    name: '',
    description: '',
    location_type: 'OFFICE',
    center: currentLocation ? 
      { lat: currentLocation.latitude, lng: currentLocation.longitude } : 
      { lat: -1.2921, lng: 36.8219 }, // Default to Nairobi
    radius: 200,
    address: '',
    ...getGeofenceTemplate('OFFICE'),
    ...initialData,
  });

  const [mapCenter, setMapCenter] = useState(geofenceData.center);
  const mapRef = useRef(null);

  // Update geofence data when template changes
  useEffect(() => {
    const template = getGeofenceTemplate(selectedTemplate);
    setGeofenceData(prev => ({
      ...prev,
      ...template,
      location_type: selectedTemplate,
    }));
  }, [selectedTemplate]);

  // Search for location
  const handleSearch = async () => {
    if (!searchQuery) return;
    
    setLoading(true);
    try {
      // Use Nominatim (OpenStreetMap) for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(searchQuery)}&format=json&limit=1`
      );
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const newCenter = { 
          lat: parseFloat(result.lat), 
          lng: parseFloat(result.lon) 
        };
        
        setGeofenceData(prev => ({
          ...prev,
          center: newCenter,
          address: result.display_name,
        }));
        setMapCenter(newCenter);
      } else {
        alert('Location not found. Please try a different search.');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Failed to search location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Use current location
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        // Get address for current location
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?` +
            `lat=${newCenter.lat}&lon=${newCenter.lng}&format=json`
          );
          
          if (response.ok) {
            const data = await response.json();
            setGeofenceData(prev => ({
              ...prev,
              center: newCenter,
              address: data.display_name || 'Current Location',
            }));
          } else {
            setGeofenceData(prev => ({
              ...prev,
              center: newCenter,
              address: 'Current Location',
            }));
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          setGeofenceData(prev => ({
            ...prev,
            center: newCenter,
            address: 'Current Location',
          }));
        }
        
        setMapCenter(newCenter);
        setLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Failed to get your location. Please check your browser permissions.');
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // Handle map click
  const handleMapClick = (latlng) => {
    setGeofenceData(prev => ({
      ...prev,
      center: { lat: latlng.lat, lng: latlng.lng },
    }));
  };

  // Handle radius change
  const handleRadiusChange = (e) => {
    setGeofenceData(prev => ({
      ...prev,
      radius: parseInt(e.target.value),
    }));
  };

  // Save geofence
  const handleSave = async () => {
    if (!geofenceData.name) {
      alert('Please enter a name for the geofence');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...geofenceData,
        center_latitude: geofenceData.center.lat,
        center_longitude: geofenceData.center.lng,
        radius_meters: geofenceData.radius,
      };
      
      await onSave(dataToSave);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save geofence. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Template options
  const templates = [
    { value: 'OFFICE', label: 'Office Building', icon: '🏢' },
    { value: 'CONSTRUCTION', label: 'Construction Site', icon: '🏗️' },
    { value: 'CLIENT', label: 'Client Location', icon: '🏠' },
    { value: 'DELIVERY', label: 'Delivery Zone', icon: '🚚' },
    { value: 'CUSTOM', label: 'Custom', icon: '⚙️' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Set Up Work Location Boundary
        </h2>

        {/* Step 1: Choose Template */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            1. Choose a Template
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {templates.map((template) => (
              <button
                key={template.value}
                onClick={() => setSelectedTemplate(template.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedTemplate === template.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">{template.icon}</div>
                <div className="text-sm font-medium">{template.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Location Name */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            2. Name the Location
          </h3>
          <input
            type="text"
            value={geofenceData.name}
            onChange={(e) => setGeofenceData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Main Office, Construction Site A"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Step 3: Find Location */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            3. Find on Map
          </h3>
          <div className="space-y-3">
            {/* Search bar */}
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for address..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Use current location button */}
            <button
              onClick={useCurrentLocation}
              disabled={loading}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <MapPinIcon className="w-5 h-5" />
              Use My Current Location
            </button>
          </div>
        </div>

        {/* Step 4: Set Boundary */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            4. Set Boundary Size
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How far can employees be to clock in? ({formatDistance(geofenceData.radius)})
              </label>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={geofenceData.radius}
                onChange={handleRadiusChange}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>Strict (50m)</span>
                <span>Normal (200m)</span>
                <span>Flexible (1km)</span>
              </div>
            </div>

            {/* Quick select buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setGeofenceData(prev => ({ ...prev, radius: 100 }))}
                className={`px-3 py-2 rounded-lg border ${
                  geofenceData.radius === 100 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Small office (100m)
              </button>
              <button
                onClick={() => setGeofenceData(prev => ({ ...prev, radius: 200 }))}
                className={`px-3 py-2 rounded-lg border ${
                  geofenceData.radius === 200 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Normal site (200m)
              </button>
              <button
                onClick={() => setGeofenceData(prev => ({ ...prev, radius: 500 }))}
                className={`px-3 py-2 rounded-lg border ${
                  geofenceData.radius === 500 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Large campus (500m)
              </button>
            </div>
          </div>
        </div>

        {/* Map Preview */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Map Preview (Click to move center)
          </h3>
          <div className="h-96 rounded-lg overflow-hidden border border-gray-300">
            <MapContainer
              center={mapCenter}
              zoom={15}
              className="h-full w-full"
              ref={mapRef}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <Circle
                center={geofenceData.center}
                radius={geofenceData.radius}
                pathOptions={{
                  fillColor: 'blue',
                  fillOpacity: 0.2,
                  color: 'blue',
                  weight: 2,
                }}
              />
              <Marker position={geofenceData.center}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-medium">{geofenceData.name || 'Work Site'}</p>
                    <p className="text-gray-600">
                      Radius: {formatDistance(geofenceData.radius)}
                    </p>
                  </div>
                </Popup>
              </Marker>
              <MapClickHandler onMapClick={handleMapClick} />
            </MapContainer>
          </div>
          {geofenceData.address && (
            <p className="mt-2 text-sm text-gray-600">
              <MapPinIcon className="w-4 h-4 inline mr-1" />
              {geofenceData.address}
            </p>
          )}
        </div>

        {/* Step 5: Set Rules */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            5. Set Rules
          </h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={geofenceData.require_for_clock_in}
                onChange={(e) => setGeofenceData(prev => ({ 
                  ...prev, 
                  require_for_clock_in: e.target.checked 
                }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Require location to clock in
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={geofenceData.auto_clock_out_on_exit}
                onChange={(e) => setGeofenceData(prev => ({ 
                  ...prev, 
                  auto_clock_out_on_exit: e.target.checked 
                }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Auto clock-out when leaving
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={geofenceData.alert_on_unexpected_exit}
                onChange={(e) => setGeofenceData(prev => ({ 
                  ...prev, 
                  alert_on_unexpected_exit: e.target.checked 
                }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Alert if employee leaves during shift
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={geofenceData.track_time_inside}
                onChange={(e) => setGeofenceData(prev => ({ 
                  ...prev, 
                  track_time_inside: e.target.checked 
                }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Track time at location
              </span>
            </label>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="space-y-1">
                <li>• Employees must be within {formatDistance(geofenceData.radius)} to clock in</li>
                <li>• Location is only checked during work hours</li>
                <li>• All data is encrypted and auto-deleted after 90 days</li>
                <li>• Employees can opt-out in their privacy settings</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !geofenceData.name}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCircleIcon className="w-5 h-5" />
            Save Geofence
          </button>
        </div>
      </div>
    </div>
  );
}