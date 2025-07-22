'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPinIcon, 
  PlusCircleIcon, 
  PencilIcon,
  EyeIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import StandardSpinner from '@/components/ui/StandardSpinner';
import FieldTooltip from '@/components/ui/FieldTooltip';
import { GOOGLE_MAPS_CONFIG } from '@/config/maps';

// Google Maps Integration - Simplified Version
const GoogleMapsGeofenceSetup = ({ onGeofenceCreated, onCancel, isVisible }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [map, setMap] = useState(null);
  const [geofence, setGeofence] = useState(null);
  const [mapError, setMapError] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [geofenceData, setGeofenceData] = useState({
    name: '',
    location_type: 'OFFICE',  // Changed from geofence_type to location_type (backend field name)
    center_latitude: null,
    center_longitude: null,
    radius: 100,
    require_for_clock_in: true,  // Changed from enforce_clock_in (backend field name)
    require_for_clock_out: false,  // Changed from enforce_clock_out (backend field name)
    auto_clock_out_on_exit: false,  // Changed from auto_clock_out (backend field name)
    alert_on_unexpected_exit: false
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
        
        // Check for Google Maps errors
        window.gm_authFailure = () => {
          console.error('[GoogleMaps] Authentication failure - Invalid API key');
          setMapError('Google Maps API key is invalid. Please contact support to update the API key.');
          setLoading(false);
        };
        
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

  const removeGeofence = () => {
    if (geofence) {
      geofence.setMap(null);
      setGeofence(null);
      setGeofenceData(prev => ({
        ...prev,
        center_latitude: null,
        center_longitude: null
      }));
      toast.success('Geofence removed');
    }
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

    setSaving(true);
    try {
      console.log('[GeofenceSetup] Saving geofence:', geofenceData);
      const response = await api.post('/api/hr/geofences/', geofenceData);
      console.log('[GeofenceSetup] Geofence created - Full response:', response);
      console.log('[GeofenceSetup] Geofence created - Response data:', response.data);
      console.log('[GeofenceSetup] Geofence created - Response data type:', typeof response.data);
      console.log('[GeofenceSetup] Geofence created - Response data keys:', Object.keys(response.data || {}));
      
      toast.success('Geofence created successfully');
      
      // Clear the map circle
      if (geofence) {
        geofence.setMap(null);
      }
      
      // Call the callback if provided
      if (onGeofenceCreated) {
        console.log('[GeofenceSetup] Calling onGeofenceCreated with:', response.data);
        onGeofenceCreated(response.data);
      } else {
        console.warn('[GeofenceSetup] No onGeofenceCreated callback provided');
      }
    } catch (error) {
      console.error('[GeofenceSetup] Error creating geofence:', error);
      // Safely access error properties
      let errorMessage = 'Failed to create geofence';
      if (error && error.response && error.response.data) {
        errorMessage = error.response.data.detail || error.response.data.error || errorMessage;
      } else if (error && error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setSaving(false);
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
          value={geofenceData.location_type}
          onChange={(e) => setGeofenceData(prev => ({ ...prev, location_type: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="OFFICE">Office</option>
          <option value="CONSTRUCTION">Construction Site</option>
          <option value="CLIENT">Client Location</option>
          <option value="DELIVERY">Delivery Zone</option>
          <option value="FIELD">Field Location</option>
          <option value="CUSTOM">Custom</option>
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
            checked={geofenceData.require_for_clock_in}
            onChange={(e) => setGeofenceData(prev => ({ ...prev, require_for_clock_in: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Require location for clock in</span>
          <FieldTooltip content="Employees must be within the geofence to clock in" />
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={geofenceData.require_for_clock_out}
            onChange={(e) => setGeofenceData(prev => ({ ...prev, require_for_clock_out: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Require location for clock out</span>
          <FieldTooltip content="Employees must be within the geofence to clock out" />
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={geofenceData.auto_clock_out_on_exit}
            onChange={(e) => setGeofenceData(prev => ({ ...prev, auto_clock_out_on_exit: e.target.checked }))}
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
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Click on the map to set geofence location
          </label>
          {geofence && (
            <button
              onClick={removeGeofence}
              className="flex items-center px-3 py-1 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
            >
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove Circle
            </button>
          )}
        </div>
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
              <div className="text-center p-4 max-w-md">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-700 font-medium">{mapError}</p>
                <p className="text-xs text-red-600 mt-2">
                  To fix this, you need a valid Google Maps API key with the Maps JavaScript API enabled.
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Please contact your administrator to update the API key in the configuration.
                </p>
              </div>
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
        {geofenceData.center_latitude && geofenceData.center_longitude && (
          <p className="text-xs text-gray-600 mt-1">
            Location: {geofenceData.center_latitude.toFixed(6)}, {geofenceData.center_longitude.toFixed(6)} • Radius: {geofenceData.radius}m
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !geofenceData.name || !geofenceData.center_latitude}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {saving ? (
            <>
              <StandardSpinner size="small" color="white" className="mr-2" />
              Creating...
            </>
          ) : (
            'Create Geofence'
          )}
        </button>
      </div>
    </div>
  );
};

// Main component remains the same, just export the simplified version
export default GoogleMapsGeofenceSetup;