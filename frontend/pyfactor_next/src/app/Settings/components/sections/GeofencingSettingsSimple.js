'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPinIcon, 
  PlusCircleIcon, 
  TrashIcon, 
  PencilIcon,
  EyeIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { logger } from '@/utils/logger';
import api from '@/utils/api';
import StandardSpinner from '@/components/ui/StandardSpinner';
import FieldTooltip from '@/components/ui/FieldTooltip';
import { GOOGLE_MAPS_CONFIG } from '@/config/maps';

// Google Maps Integration - Simplified Version
const GoogleMapsGeofenceSetup = ({ onGeofenceCreated, onCancel, isVisible }) => {
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);
  const [geofence, setGeofence] = useState(null);
  const [mapError, setMapError] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [geofenceData, setGeofenceData] = useState({
    name: '',
    geofence_type: 'office',
    center_latitude: null,
    center_longitude: null,
    radius: 100,
    enforce_clock_in: true,
    enforce_clock_out: true,
    auto_clock_out: false,
    alert_on_unexpected_exit: true
  });

  // Load Google Maps script
  const loadGoogleMapsScript = () => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        console.log('[GoogleMaps] Already loaded');
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_CONFIG.apiKey}&libraries=${GOOGLE_MAPS_CONFIG.libraries.join(',')}`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('[GoogleMaps] Script loaded');
        setTimeout(() => {
          if (window.google && window.google.maps) {
            resolve();
          } else {
            reject(new Error('Google Maps not available after load'));
          }
        }, 100);
      };
      
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  // Initialize map when container is ready
  useEffect(() => {
    if (!isVisible || !mapContainerRef.current) {
      return;
    }

    const initializeMap = async () => {
      try {
        setLoading(true);
        console.log('[GoogleMaps] Initializing...');
        
        await loadGoogleMapsScript();
        
        if (!mapContainerRef.current) {
          throw new Error('Map container not found');
        }

        const googleMap = new window.google.maps.Map(mapContainerRef.current, {
          center: GOOGLE_MAPS_CONFIG.defaultCenter,
          zoom: GOOGLE_MAPS_CONFIG.defaultZoom,
          mapTypeId: 'roadmap'
        });

        googleMap.addListener('click', (event) => {
          handleMapClick(event, googleMap);
        });

        mapRef.current = googleMap;
        setMap(googleMap);
        setLoading(false);
        
        console.log('[GoogleMaps] Initialized successfully');
        
        // Try to get user location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            googleMap.setCenter(userLocation);
          });
        }
        
      } catch (error) {
        console.error('[GoogleMaps] Init error:', error);
        setMapError(error.message);
        setLoading(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(initializeMap, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isVisible]);

  const handleMapClick = (event, googleMap) => {
    if (geofence) {
      geofence.setMap(null);
    }

    const center = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };

    const newGeofence = new window.google.maps.Circle({
      center: center,
      radius: geofenceData.radius,
      fillColor: '#2563eb',
      fillOpacity: 0.35,
      strokeColor: '#1d4ed8',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      editable: true,
      draggable: true
    });

    newGeofence.setMap(googleMap);
    setGeofence(newGeofence);
    
    setGeofenceData(prev => ({
      ...prev,
      center_latitude: center.lat,
      center_longitude: center.lng
    }));

    // Listen for radius changes
    window.google.maps.event.addListener(newGeofence, 'radius_changed', () => {
      setGeofenceData(prev => ({ ...prev, radius: Math.round(newGeofence.getRadius()) }));
    });

    // Listen for center changes
    window.google.maps.event.addListener(newGeofence, 'center_changed', () => {
      const newCenter = newGeofence.getCenter();
      setGeofenceData(prev => ({
        ...prev,
        center_latitude: newCenter.lat(),
        center_longitude: newCenter.lng()
      }));
    });
  };

  const handleSave = async () => {
    if (!geofenceData.name) {
      toast.error('Please enter a geofence name');
      return;
    }

    if (!geofenceData.center_latitude || !geofenceData.center_longitude) {
      toast.error('Please click on the map to set the geofence location');
      return;
    }

    try {
      const response = await api.post('/api/hr/geofences/', geofenceData);
      toast.success('Geofence created successfully');
      onGeofenceCreated(response.data);
    } catch (error) {
      console.error('Error creating geofence:', error);
      toast.error('Failed to create geofence');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Geofence Name *
        </label>
        <input
          type="text"
          value={geofenceData.name}
          onChange={(e) => setGeofenceData(prev => ({ ...prev, name: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="e.g., Main Office, Construction Site A"
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Location Type
        </label>
        <select
          value={geofenceData.geofence_type}
          onChange={(e) => setGeofenceData(prev => ({ ...prev, geofence_type: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="office">Office</option>
          <option value="construction_site">Construction Site</option>
          <option value="client_location">Client Location</option>
          <option value="delivery_zone">Delivery Zone</option>
          <option value="field_location">Field Location</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Radius */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Radius (meters)
        </label>
        <div className="mt-1 flex items-center space-x-2">
          <input
            type="number"
            value={geofenceData.radius}
            onChange={(e) => {
              const newRadius = parseInt(e.target.value) || 100;
              setGeofenceData(prev => ({ ...prev, radius: newRadius }));
              if (geofence) {
                geofence.setRadius(newRadius);
              }
            }}
            min="10"
            max="1000"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          <FieldTooltip content="The radius of the geofenced area in meters. Employees must be within this distance to clock in/out." />
        </div>
      </div>

      {/* Rules */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">Enforcement Rules</label>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={geofenceData.enforce_clock_in}
            onChange={(e) => setGeofenceData(prev => ({ ...prev, enforce_clock_in: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Require location for clock in</span>
          <FieldTooltip content="Employees must be within the geofence to clock in" />
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={geofenceData.enforce_clock_out}
            onChange={(e) => setGeofenceData(prev => ({ ...prev, enforce_clock_out: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Require location for clock out</span>
          <FieldTooltip content="Employees must be within the geofence to clock out" />
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={geofenceData.auto_clock_out}
            onChange={(e) => setGeofenceData(prev => ({ ...prev, auto_clock_out: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Auto clock-out when leaving</span>
          <FieldTooltip content="Automatically clock out employees when they leave the geofence" />
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={geofenceData.alert_on_unexpected_exit}
            onChange={(e) => setGeofenceData(prev => ({ ...prev, alert_on_unexpected_exit: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Alert on unexpected exit</span>
          <FieldTooltip content="Send alerts when employees leave the geofence during work hours" />
        </label>
      </div>

      {/* Map */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Click on the map to set geofence location
        </label>
        <div className="relative w-full h-96 border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
              <div className="text-center">
                <StandardSpinner size="lg" />
                <p className="mt-2 text-sm text-gray-600">Loading Google Maps...</p>
              </div>
            </div>
          )}
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
              <div className="text-center p-4">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-700">{mapError}</p>
              </div>
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
        >
          Create Geofence
        </button>
      </div>
    </div>
  );
};

// Main component remains the same, just export the simplified version
export default GoogleMapsGeofenceSetup;