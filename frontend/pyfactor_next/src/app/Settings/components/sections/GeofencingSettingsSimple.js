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
    description: '',  // Add description field (optional but good to include)
    location_type: 'OFFICE',  // Changed from geofence_type to location_type (backend field name)
    shape_type: 'CIRCLE',  // Add shape_type field (required by backend)
    center_latitude: null,
    center_longitude: null,
    radius_meters: 100,  // Changed from radius to radius_meters (backend field name)
    require_for_clock_in: true,  // Changed from enforce_clock_in (backend field name)
    require_for_clock_out: false,  // Changed from enforce_clock_out (backend field name)
    auto_clock_out_on_exit: false,  // Changed from auto_clock_out (backend field name)
    alert_on_unexpected_exit: false,
    is_active: true  // Explicitly set is_active
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
      radius: geofenceData.radius_meters,
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
      console.log('[GeofenceSetup] Geofence data being sent:', JSON.stringify(geofenceData, null, 2));
      const response = await api.post('/api/hr/geofences', geofenceData);
      console.log('[GeofenceSetup] POST response status:', response?.status);
      console.log('[GeofenceSetup] POST response headers:', response?.headers);
      console.log('[GeofenceSetup] Geofence created - Full response:', response);
      console.log('[GeofenceSetup] Geofence created - Response data:', response.data);
      console.log('[GeofenceSetup] Geofence created - Response data type:', typeof response.data);
      console.log('[GeofenceSetup] Geofence created - Response data keys:', Object.keys(response.data || {}));
      console.log('[GeofenceSetup] Created geofence details:', {
        id: response?.id,
        name: response?.name,
        business_id: response?.business_id,
        is_active: response?.is_active
      });
      
      // Check if response is an error wrapped in data
      if (response.data && response.data.error) {
        console.error('[GeofenceSetup] Server returned error in data:', response.data);
        throw new Error(response.data.error || 'Server error');
      }
      
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
        // Check if detail is an object with more specific error info
        if (error.response.data.detail && typeof error.response.data.detail === 'object') {
          // Extract the actual error message from nested detail
          if (error.response.data.detail.detail) {
            errorMessage = error.response.data.detail.detail;
          } else if (error.response.data.detail.error) {
            errorMessage = error.response.data.detail.error;
          } else {
            errorMessage = JSON.stringify(error.response.data.detail);
          }
        } else {
          errorMessage = error.response.data.detail || error.response.data.error || errorMessage;
        }
      } else if (error && error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
      
      // Refresh the list in case it was actually created despite the error
      if (onGeofenceCreated) {
        console.log('[GeofenceSetup] Refreshing list after error...');
        onGeofenceCreated(null);
      }
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
            value={geofenceData.radius_meters}
            onChange={(e) => {
              const newRadius = parseInt(e.target.value) || 100;
              setGeofenceData(prev => ({ ...prev, radius_meters: newRadius }));
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
            Location: {geofenceData.center_latitude.toFixed(6)}, {geofenceData.center_longitude.toFixed(6)} • Radius: {geofenceData.radius_meters}m
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

// Main GeofencingSettings component
const GeofencingSettings = () => {
  console.log('[GeofencingSettings] === COMPONENT MOUNT START ===');
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [hasAcceptedCompliance, setHasAcceptedCompliance] = useState(true); // Set to true for now to bypass compliance
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  console.log('[GeofencingSettings] State initialized:', {
    hasAcceptedCompliance,
    loading,
    geofencesCount: geofences.length
  });

  // Load geofences
  const loadGeofences = async () => {
    console.log('[GeofencingSettings] 🔄 loadGeofences called');
    try {
      setLoading(true);
      console.log('[GeofencingSettings] 📡 Making API request to /api/hr/geofences');
      
      // Add a timestamp to avoid caching
      const timestamp = new Date().getTime();
      const response = await api.get(`/api/hr/geofences?t=${timestamp}`);
      
      console.log('[GeofencingSettings] ✅ API Response:', response);
      console.log('[GeofencingSettings] Response type:', typeof response);
      console.log('[GeofencingSettings] Response keys:', Object.keys(response || {}));
      console.log('[GeofencingSettings] Full response data:', JSON.stringify(response, null, 2));
      
      // Handle different response formats
      let geofenceData = [];
      if (response && response.results) {
        console.log('[GeofencingSettings] Found paginated response with results');
        geofenceData = response.results;
      } else if (Array.isArray(response)) {
        console.log('[GeofencingSettings] Response is array');
        geofenceData = response;
      } else if (response && response.data) {
        console.log('[GeofencingSettings] Found data property in response');
        geofenceData = response.data;
      } else {
        console.log('[GeofencingSettings] ⚠️ Unexpected response format, treating as empty array');
      }
      
      console.log('[GeofencingSettings] 📍 Processed geofences:', geofenceData);
      console.log('[GeofencingSettings] 📍 Geofences count:', geofenceData.length);
      
      // Log each geofence for debugging
      if (geofenceData.length > 0) {
        geofenceData.forEach((g, index) => {
          console.log(`[GeofencingSettings] Geofence ${index}:`, {
            id: g.id,
            name: g.name,
            business_id: g.business_id,
            is_active: g.is_active,
            location_type: g.location_type,
            center: `${g.center_latitude}, ${g.center_longitude}`,
            radius: g.radius_meters
          });
        });
      }
      
      setGeofences(geofenceData);
    } catch (error) {
      console.error('[GeofencingSettings] ❌ Error loading geofences:', error);
      console.error('[GeofencingSettings] Error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      });
      toast.error('Failed to load geofences');
    } finally {
      setLoading(false);
      console.log('[GeofencingSettings] 🏁 loadGeofences completed');
    }
  };

  useEffect(() => {
    console.log('[GeofencingSettings] 🚀 useEffect triggered - initial load');
    console.log('[GeofencingSettings] Component is mounted:', true);
    console.log('[GeofencingSettings] hasAcceptedCompliance:', hasAcceptedCompliance);
    
    if (hasAcceptedCompliance) {
      console.log('[GeofencingSettings] 🟢 Compliance accepted, loading geofences');
      loadGeofences();
    } else {
      console.log('[GeofencingSettings] 🟡 Waiting for compliance acceptance');
    }
    
    return () => {
      console.log('[GeofencingSettings] 🔴 Component unmounting');
    };
  }, [hasAcceptedCompliance]);

  const handleGeofenceCreated = (newGeofence) => {
    console.log('[GeofencingSettings] Geofence created:', newGeofence);
    setShowCreateForm(false);
    loadGeofences();
  };

  console.log('[GeofencingSettings] 🎨 Rendering component, hasAcceptedCompliance:', hasAcceptedCompliance);
  
  if (!hasAcceptedCompliance) {
    console.log('[GeofencingSettings] 📋 Showing compliance notice');
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <ShieldCheckIcon className="h-8 w-8 text-yellow-600 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Legal Compliance Notice
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                Geofencing tracks employee locations during work hours. Before enabling this feature:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700 mb-4">
                <li>You must notify all employees about location tracking</li>
                <li>Obtain explicit consent from each employee</li>
                <li>Comply with local privacy laws (GDPR, CCPA, etc.)</li>
                <li>Provide employees with opt-out options</li>
              </ul>
              <div className="flex space-x-3">
                <button
                  onClick={() => setHasAcceptedCompliance(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  I Understand and Accept
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('[GeofencingSettings] 📊 Rendering main view with', geofences.length, 'geofences');
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Geofencing</h3>
          <p className="mt-1 text-sm text-gray-500">
            Set up location-based zones for employee time tracking
          </p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Add Geofence
          </button>
          <button
            onClick={async () => {
              console.log('[DEBUG] Testing geofence API...');
              try {
                const response = await api.get('/api/hr/geofences/debug_list');
                console.log('[DEBUG] Debug list response:', response);
                console.log('[DEBUG] Debug list data:', JSON.stringify(response, null, 2));
                
                // Get session info to check business_id
                const session = await api.get('/api/auth/session-v2');
                console.log('[DEBUG] Current session:', session);
                
                const debugInfo = `
Debug Information:
=================
Total Geofences in DB: ${response.total_geofences_in_db || 0}
User Business ID: ${response.user_business_id || 'N/A'}
User Geofences Count: ${response.user_geofences_count || 0}
Active User Geofences: ${response.active_user_geofences_count || 0}

Session Business ID: ${session?.user?.business_id || 'N/A'}
Session User: ${session?.user?.email || 'N/A'}

All Geofences:
${JSON.stringify(response.all_geofences || [], null, 2)}

User Geofences:
${JSON.stringify(response.user_geofences || [], null, 2)}
                `;
                
                console.log('[DEBUG] Full debug info:', debugInfo);
                alert(debugInfo);
              } catch (error) {
                console.error('[DEBUG] Debug list error:', error);
                toast.error('Debug endpoint error');
              }
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Debug API
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <GoogleMapsGeofenceSetup
          onGeofenceCreated={handleGeofenceCreated}
          onCancel={() => setShowCreateForm(false)}
          isVisible={showCreateForm}
        />
      )}

      {/* Geofences List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <StandardSpinner size="medium" />
        </div>
      ) : geofences.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {geofences.map((geofence) => (
              <li key={geofence.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MapPinIcon className="h-10 w-10 text-gray-400 mr-4" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{geofence.name}</p>
                      <p className="text-sm text-gray-500">
                        {geofence.location_type} • Radius: {geofence.radius_meters}m
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {geofence.is_active && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Active
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setSelectedGeofence(geofence);
                        setShowAssignModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Assign Employees
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No geofences</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first geofence.
          </p>
        </div>
      )}
    </div>
  );
};

export default GeofencingSettings;