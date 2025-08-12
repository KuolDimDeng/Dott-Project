'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import GoogleMapsGeofenceSetup from './GeofencingSettingsSimple';
import InlineEmployeeAssignment from './InlineEmployeeAssignment';
import ViewGeofenceModal from './ViewGeofenceModal';
import EditGeofenceModal from './EditGeofenceModal';

// Google Maps Integration - REPLACED WITH SIMPLIFIED VERSION
const GoogleMapsGeofenceSetup_OLD = ({ onGeofenceCreated, onCancel, isVisible }) => {
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);
  const [geofence, setGeofence] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [portalContainer, setPortalContainer] = useState(null);
  const [geofenceData, setGeofenceData] = useState({
    name: '',
    description: '',
    location_type: 'office',
    radius: 100,
    require_for_clock_in: true,
    require_for_clock_out: true,
    auto_clock_out_on_exit: false,
    alert_on_unexpected_exit: false,
    is_active: true
  });

  const mapContainerRef = React.useRef(null);
  const [mapContainerKey, setMapContainerKey] = useState(0);
  const mapInitializedRef = React.useRef(false);
  const preventReactUpdatesRef = React.useRef(false);
  const portalRootRef = React.useRef(null);
  
  // Create portal container on mount
  useEffect(() => {
    if (typeof document !== 'undefined' && isVisible) {
      const container = document.createElement('div');
      container.id = 'google-maps-portal-container';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.position = 'relative';
      container.style.zIndex = '10';
      setPortalContainer(container);
      
      return () => {
        // Cleanup portal container
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      };
    }
  }, [isVisible]);
  
  // Ref callback that prevents React from managing the element once map is initialized
  const mapContainerRefCallback = React.useCallback((node) => {
    if (node && !preventReactUpdatesRef.current) {
      mapContainerRef.current = node;
      console.log('[GeofencingSettings] Map container ref set via callback:', node);
      
      // If we have a portal container and the placeholder div, append the portal
      if (portalContainer && !portalContainer.parentNode) {
        node.appendChild(portalContainer);
        console.log('[GeofencingSettings] Portal container appended to placeholder');
      }
    } else if (preventReactUpdatesRef.current) {
      console.log('[GeofencingSettings] Preventing React from updating map container');
      // Don't update the ref if we're preventing React updates
      return;
    }
  }, [portalContainer]);

  // Debug component mount
  useEffect(() => {
    console.log('[GeofencingSettings] Component mounted - v7');
    console.log('[GeofencingSettings] Google Maps config loaded:', !!GOOGLE_MAPS_CONFIG);
    console.log('[GeofencingSettings] API key available:', !!GOOGLE_MAPS_CONFIG.apiKey);
    console.log('[GeofencingSettings] isVisible prop:', isVisible);
  }, []);

  // DISABLED: useLayoutEffect causes React DOM reconciliation conflicts
  // Instead, we rely on the main useEffect for initialization
  /*
  useLayoutEffect(() => {
    console.log('[GeofencingSettings] 🏗️ useLayoutEffect - DISABLED to prevent DOM conflicts');
  });
  */

  useEffect(() => {
    // Only initialize map when component is visible and portal container is ready
    if (!isVisible || !portalContainer) {
      console.log('[GeofencingSettings] Component not visible or portal not ready, skipping map init');
      console.log('[GeofencingSettings] isVisible:', isVisible, 'portalContainer:', portalContainer);
      return;
    }

    // Initialize Google Maps
    const initMap = async () => {
      console.log('[GeofencingSettings] === MAP INITIALIZATION DEBUG START ===');
      console.log('[GeofencingSettings] isVisible:', isVisible);
      console.log('[GeofencingSettings] mapContainerRef.current (initial):', mapContainerRef.current);
      
      // Check DOM state immediately
      console.log('[GeofencingSettings] Immediate DOM check:');
      console.log('  - Document ready state:', document.readyState);
      console.log('  - All divs with ref attribute:', document.querySelectorAll('div[ref]'));
      console.log('  - All elements with map in class:', document.querySelectorAll('[class*="map"]'));
      console.log('  - Parent container:', document.querySelector('.bg-white.border.border-gray-200.rounded-lg'));
      
      // Progressive delay checks
      const delays = [100, 250, 500, 1000, 2000];
      
      for (const delay of delays) {
        console.log(`[GeofencingSettings] Waiting ${delay}ms for DOM...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`[GeofencingSettings] After ${delay}ms delay:`);
        console.log('  - mapContainerRef.current:', mapContainerRef.current);
        console.log('  - mapContainerRef object:', mapContainerRef);
        console.log('  - Form container exists:', !!document.querySelector('.bg-white.border.border-gray-200.rounded-lg'));
        console.log('  - All divs in form:', document.querySelectorAll('.bg-white.border.border-gray-200.rounded-lg div').length);
        
        if (mapContainerRef.current) {
          console.log(`[GeofencingSettings] ✅ Container found after ${delay}ms!`);
          break;
        }
        
        if (delay === 2000) {
          console.error('[GeofencingSettings] ❌ Container still not found after 2000ms');
          console.log('[GeofencingSettings] Final debug info:');
          console.log('  - Component is mounted:', !!mapContainerRef);
          console.log('  - Ref is attached:', !!mapContainerRef.current);
          console.log('  - DOM has form container:', !!document.querySelector('.bg-white.border.border-gray-200.rounded-lg'));
          console.log('  - All refs in DOM:', Array.from(document.querySelectorAll('*')).filter(el => el.ref));
          setMapError('Failed to find map container. Please refresh the page.');
          setLoading(false);
          return;
        }
      }
      
      // Check if map container exists
      if (!mapContainerRef.current || !portalContainer) {
        console.error('[GeofencingSettings] Map container or portal not found after all delays');
        console.log('[GeofencingSettings] mapContainerRef.current:', mapContainerRef.current);
        console.log('[GeofencingSettings] portalContainer:', portalContainer);
        console.log('[GeofencingSettings] Current DOM elements with map-related classes:', 
          document.querySelectorAll('[class*="map"], [ref*="map"], [id*="map"]'));
        setMapError('Failed to initialize map container. Please refresh the page.');
        setLoading(false);
        return;
      }

      try {
        if (!window.google) {
          await loadGoogleMapsScript();
        }
      } catch (error) {
        console.error('[GeofencingSettings] Failed to load Google Maps:', error);
        setMapError('Failed to load Google Maps. Please check your internet connection.');
        toast.error('Failed to load Google Maps. Please check your internet connection and try again.');
        setLoading(false);
        return;
      }
      
      // Double-check container still exists after loading script
      if (!mapContainerRef.current || !portalContainer) {
        console.error('Map container or portal not found after loading script');
        setLoading(false);
        return;
      }

      try {
        console.log('[GeofencingSettings] Creating map instance...');
        // Initialize map directly in the container
        const targetContainer = mapContainerRef.current || portalContainer;
        console.log('[GeofencingSettings] Using container:', targetContainer);
        
        const map = new window.google.maps.Map(targetContainer, {
          center: GOOGLE_MAPS_CONFIG.defaultCenter,
          zoom: GOOGLE_MAPS_CONFIG.defaultZoom,
          mapTypeId: 'roadmap'
        });

        // Add click listener to map
        map.addListener('click', handleMapClick);

        // Try to get user's current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              map.setCenter(userLocation);
            },
            (error) => {
              console.warn('Could not get user location:', error);
            }
          );
        }

        setMap(map);
        setLoading(false);
        console.log('[GeofencingSettings] Map initialized successfully');
        
        // Mark map as initialized to prevent conflicts
        mapInitializedRef.current = true;
        
        // CRITICAL: Prevent React from managing this DOM element
        preventReactUpdatesRef.current = true;
        
        // Prevent React from updating the map container once Google Maps takes control
        // This prevents React DOM reconciliation conflicts
        if (mapContainerRef.current) {
          mapContainerRef.current.setAttribute('data-google-maps-initialized', 'true');
          // Make the container element stable by preventing React updates
          mapContainerRef.current.style.pointerEvents = 'auto';
          // Detach from React's virtual DOM management
          mapContainerRef.current._reactInternalInstance = null;
          mapContainerRef.current._reactInternalFiber = null;
        }
      } catch (error) {
        console.error('[GeofencingSettings] Failed to initialize map:', error);
        setMapError('Failed to initialize map. Please refresh the page.');
        toast.error('Failed to initialize map. Please refresh the page and try again.');
        setLoading(false);
      }
    };

    // Start initialization
    initMap();

    return () => {
      // Cleanup if needed
    };
  }, [isVisible, portalContainer]);

  const loadGoogleMapsScript = () => {
    return new Promise((resolve, reject) => {
      // Check if Google Maps is already loaded and fully initialized
      if (window.google && window.google.maps) {
        console.log('[GeofencingSettings] Google Maps already loaded');
        resolve();
        return;
      }
      
      // Use API key from config
      const apiKey = GOOGLE_MAPS_CONFIG.apiKey;
      console.log('[GeofencingSettings] Loading Google Maps with API key:', apiKey ? 'Found' : 'Missing');
      
      if (!apiKey) {
        console.error('[GeofencingSettings] No Google Maps API key available');
        reject(new Error('Google Maps API key is not configured'));
        return;
      }
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${GOOGLE_MAPS_CONFIG.libraries.join(',')}`;
      script.async = true;
      script.defer = true;
      
      let timeoutId;
      
      script.onload = () => {
        clearTimeout(timeoutId);
        console.log('[GeofencingSettings] Google Maps script loaded successfully');
        
        // Wait a moment for Google Maps to fully initialize
        setTimeout(() => {
          if (window.google && window.google.maps) {
            console.log('[GeofencingSettings] Google Maps API fully initialized');
            resolve();
          } else {
            console.error('[GeofencingSettings] Google Maps API not available after load');
            reject(new Error('Google Maps API not available after script load'));
          }
        }, 100);
      };
      
      script.onerror = (error) => {
        clearTimeout(timeoutId);
        console.error('[GeofencingSettings] Failed to load Google Maps script:', error);
        reject(error);
      };
      
      // Add timeout to prevent hanging
      timeoutId = setTimeout(() => {
        console.error('[GeofencingSettings] Google Maps script loading timeout');
        reject(new Error('Google Maps script loading timeout'));
      }, 10000);
      
      document.head.appendChild(script);
    });
  };

  const handleMapClick = (event) => {
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

    newGeofence.setMap(map);
    setGeofence(newGeofence);
    
    setGeofenceData(prev => ({
      ...prev,
      center_latitude: center.lat,
      center_longitude: center.lng
    }));
  };

  const handleRadiusChange = (newRadius) => {
    setGeofenceData(prev => ({ ...prev, radius: newRadius }));
    if (geofence) {
      geofence.setRadius(newRadius);
    }
  };

  const retryMapInitialization = async () => {
    console.log('[GeofencingSettings] Manual retry of map initialization...');
    setMapError(null);
    setIsRetrying(true);
    
    // Reset all flags to allow re-initialization
    mapInitializedRef.current = false;
    preventReactUpdatesRef.current = false;
    
    // Force React to recreate the DOM element by changing the key
    // This creates a completely fresh DOM element
    setMapContainerKey(prev => prev + 1);
    
    // Wait for DOM to settle after key change
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Call initMap function again
    const initMap = async () => {
      console.log('[GeofencingSettings] Retry - checking container:', mapContainerRef.current);
      console.log('[GeofencingSettings] Retry - checking portal:', portalContainer);
      
      if (!mapContainerRef.current || !portalContainer) {
        setMapError('Map container still not available. Please refresh the page.');
        setIsRetrying(false);
        return;
      }

      try {
        // Use API key from config
        const apiKey = GOOGLE_MAPS_CONFIG.apiKey;
        console.log('[GeofencingSettings] Retry - Loading Google Maps with API key:', apiKey ? 'Found' : 'Missing');
        
        if (!window.google) {
          await loadGoogleMapsScript();
        }
        
        console.log('[GeofencingSettings] Retry - Creating map instance...');
        const targetContainer = mapContainerRef.current || portalContainer;
        console.log('[GeofencingSettings] Retry - Using container:', targetContainer);
        
        const map = new window.google.maps.Map(targetContainer, {
          center: GOOGLE_MAPS_CONFIG.defaultCenter,
          zoom: GOOGLE_MAPS_CONFIG.defaultZoom,
          mapTypeId: 'roadmap'
        });

        // Add click listener to map
        map.addListener('click', handleMapClick);

        // Try to get user's current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              map.setCenter(userLocation);
            },
            (error) => {
              console.warn('Could not get user location:', error);
            }
          );
        }

        setMap(map);
        setMapError(null);
        setIsRetrying(false);
        console.log('[GeofencingSettings] Retry - Map initialized successfully');
        
        // Mark map as initialized to prevent conflicts
        mapInitializedRef.current = true;
        
        // CRITICAL: Prevent React from managing this DOM element
        preventReactUpdatesRef.current = true;
        
        // Prevent React from updating the map container once Google Maps takes control
        // This prevents React DOM reconciliation conflicts
        if (mapContainerRef.current) {
          mapContainerRef.current.setAttribute('data-google-maps-initialized', 'true');
          // Make the container element stable by preventing React updates
          mapContainerRef.current.style.pointerEvents = 'auto';
          // Detach from React's virtual DOM management
          mapContainerRef.current._reactInternalInstance = null;
          mapContainerRef.current._reactInternalFiber = null;
        }
      } catch (error) {
        console.error('[GeofencingSettings] Retry - Failed to initialize map:', error);
        setMapError('Failed to initialize map. ' + error.message);
        setIsRetrying(false);
      }
    };
    
    await initMap();
  };

  const handleSave = async () => {
    if (!geofence) {
      toast.error('Please click on the map to set a geofence location');
      return;
    }

    if (!geofenceData || !geofenceData.name || !geofenceData.name.trim()) {
      toast.error('Please enter a name for the geofence');
      return;
    }

    try {
      const center = geofence.getCenter();
      const radius = geofence.getRadius();
      
      const data = {
        ...geofenceData,
        center_latitude: center.lat(),
        center_longitude: center.lng(),
        radius: radius
      };

      const response = await api.post('/api/hr/geofences/', data);
      
      if (response.data) {
        toast.success('Geofence created successfully');
        onGeofenceCreated(response.data);
      }
    } catch (error) {
      logger.error('Error creating geofence:', error);
      toast.error('Failed to create geofence');
    }
  };

  if (loading) {
    console.log('[GoogleMapsGeofenceSetup] 🔄 Component rendering - LOADING state');
    return (
      <div className="flex items-center justify-center h-96">
        <StandardSpinner size="lg" />
      </div>
    );
  }

  console.log('[GoogleMapsGeofenceSetup] 🎨 Component rendering - MAIN FORM');
  console.log('[GoogleMapsGeofenceSetup] 🎨 isVisible prop:', isVisible);
  console.log('[GoogleMapsGeofenceSetup] 🎨 map state:', !!map);
  console.log('[GoogleMapsGeofenceSetup] 🎨 mapContainerRef:', mapContainerRef);

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            Geofence Name
            <FieldTooltip content="A descriptive name for this location (e.g., 'Main Office', 'Construction Site A')" />
          </label>
          <input
            type="text"
            value={geofenceData.name}
            onChange={(e) => setGeofenceData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter geofence name"
          />
        </div>

        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            Location Type
            <FieldTooltip content="The type of location this geofence represents" />
          </label>
          <select
            value={geofenceData.location_type}
            onChange={(e) => setGeofenceData(prev => ({ ...prev, location_type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="office">Office</option>
            <option value="construction_site">Construction Site</option>
            <option value="client_location">Client Location</option>
            <option value="delivery_zone">Delivery Zone</option>
            <option value="field_location">Field Location</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            Radius (meters)
            <FieldTooltip content="The radius of the geofence in meters. Smaller values require more precise location." />
          </label>
          <input
            type="number"
            min="10"
            max="1000"
            value={geofenceData.radius}
            onChange={(e) => handleRadiusChange(parseInt(e.target.value) || 100)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
            <FieldTooltip content="Additional details about this location" />
          </label>
          <input
            type="text"
            value={geofenceData.description}
            onChange={(e) => setGeofenceData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter description"
          />
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={geofenceData.require_for_clock_in}
            onChange={(e) => setGeofenceData(prev => ({ ...prev, require_for_clock_in: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Require for clock in</span>
          <FieldTooltip content="Employees must be within this geofence to clock in" />
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={geofenceData.require_for_clock_out}
            onChange={(e) => setGeofenceData(prev => ({ ...prev, require_for_clock_out: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Require for clock out</span>
          <FieldTooltip content="Employees must be within this geofence to clock out" />
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={geofenceData.auto_clock_out_on_exit}
            onChange={(e) => setGeofenceData(prev => ({ ...prev, auto_clock_out_on_exit: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Auto clock out on exit</span>
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
                <p className="text-xs text-gray-500 mt-1">API Key: {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Configured' : 'Not configured'}</p>
              </div>
            </div>
          )}
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
              <div className="text-center p-4">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-700">{mapError}</p>
                <p className="text-xs text-red-600 mt-2">
                  API Key Status: {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing'}
                </p>
                <div className="mt-3 space-x-2">
                  <button 
                    onClick={retryMapInitialization}
                    disabled={isRetrying}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRetrying ? 'Retrying...' : 'Retry Map Load'}
                  </button>
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          )}
          <div 
            key={mapContainerKey}
            ref={mapContainerRefCallback}
            className="w-full h-full relative"
            onLoad={() => console.log('[GeofencingSettings] 📍 Map container div onLoad event')}
            style={{ minHeight: '384px' }}
          >
            {console.log('[GeofencingSettings] 📍 Map container div is being rendered')}
            {console.log('[GeofencingSettings] 📍 mapContainerRef object:', mapContainerRef)}
            {isRetrying && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-20">
                <div className="text-center">
                  <StandardSpinner size="lg" />
                  <p className="mt-2 text-sm text-gray-600">Initializing Google Maps...</p>
                </div>
              </div>
            )}
          </div>
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

// Legal Compliance Component
const LegalComplianceInfo = ({ onAccept }) => {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
      <div className="flex items-start">
        <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-3 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-medium text-yellow-800 mb-3">
            Legal Compliance Requirements
          </h3>
          
          <div className="space-y-4 text-sm text-yellow-700">
            <div>
              <h4 className="font-medium mb-2">Employer Responsibilities:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>You must inform all employees about location tracking before implementation</li>
                <li>Employees must provide explicit consent for location tracking</li>
                <li>Location data can only be used for legitimate business purposes</li>
                <li>You must comply with local privacy laws (GDPR, CCPA, etc.)</li>
                <li>Employees have the right to access, modify, or delete their location data</li>
                <li>Location tracking should be limited to work hours and work locations</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Employee Rights:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Right to opt-out of location tracking (may affect clock in/out capabilities)</li>
                <li>Right to know what data is collected and how it's used</li>
                <li>Right to access their location data</li>
                <li>Right to request deletion of their location data</li>
                <li>Protection from discrimination based on location preferences</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Data Protection:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Location data is encrypted and stored securely</li>
                <li>Access is restricted to authorized personnel only</li>
                <li>Data is automatically deleted after 90 days</li>
                <li>Location tracking is limited to work-related activities</li>
                <li>No personal tracking outside of work hours</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white rounded-md border border-yellow-200">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                I understand and accept the legal responsibilities of implementing employee location tracking.
                I will ensure all employees are properly informed and have given explicit consent.
              </span>
            </label>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={onAccept}
              disabled={!accepted}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Accept and Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Geofencing Settings Component
const GeofencingSettings = ({ user, isOwner, isAdmin, notifySuccess, notifyError }) => {
  console.log('[GeofencingSettings] 🏁 === COMPONENT MOUNT ===');
  console.log('[GeofencingSettings] 👤 User:', user);
  console.log('[GeofencingSettings] 👑 isOwner:', isOwner);
  console.log('[GeofencingSettings] 🛡️ isAdmin:', isAdmin);
  console.log('[GeofencingSettings] 📢 Has notifySuccess:', !!notifySuccess);
  console.log('[GeofencingSettings] ⚠️ Has notifyError:', !!notifyError);
  
  // Add comprehensive error handling
  try {
  const [loading, setLoading] = useState(true);
  const [geofences, setGeofences] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showLegalCompliance, setShowLegalCompliance] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [showEmployeeAssignment, setShowEmployeeAssignment] = useState(false);
  const [newlyCreatedGeofence, setNewlyCreatedGeofence] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  
  // Debug: Log initial render
  console.log('[GeofencingSettings] 🎬 Component rendered with isOwner:', isOwner, 'isAdmin:', isAdmin);

  // Debug state changes
  useEffect(() => {
    console.log('[GeofencingSettings] 🔄 State change - showCreateForm:', showCreateForm);
    console.log('[GeofencingSettings] 🔄 State change - showLegalCompliance:', showLegalCompliance);
    console.log('[GeofencingSettings] 🔄 State change - legalAccepted:', legalAccepted);
  }, [showCreateForm, showLegalCompliance, legalAccepted]);

  // Load geofences on mount
  useEffect(() => {
    console.log('[GeofencingSettings] 🔧 === MOUNT EFFECT TRIGGERED ===');
    console.log('[GeofencingSettings] 🔧 isOwner:', isOwner, 'type:', typeof isOwner);
    console.log('[GeofencingSettings] 🔧 isAdmin:', isAdmin, 'type:', typeof isAdmin);
    
    // Reset stuck state on mount
    if (showEmployeeAssignment && !newlyCreatedGeofence) {
      console.log('[GeofencingSettings] 🧹 Cleaning up stuck employee assignment state');
      setShowEmployeeAssignment(false);
    }
    
    if (isOwner || isAdmin) {
      console.log('[GeofencingSettings] 👤 User has permissions, loading geofences...');
      loadGeofences();
    } else {
      console.log('[GeofencingSettings] 🚫 User does not have owner/admin permissions');
    }
  }, [isOwner, isAdmin]);
  
  // Also load on initial mount regardless
  useEffect(() => {
    console.log('[GeofencingSettings] 🚀 === INITIAL MOUNT ===');
    if (isOwner === true || isAdmin === true) {
      console.log('[GeofencingSettings] 📡 Loading geofences on initial mount');
      loadGeofences();
    }
  }, []);

  const loadGeofences = async () => {
    try {
      setLoading(true);
      console.log('[GeofencingSettings] 🚀 === LOADING GEOFENCES START ===');
      console.log('[GeofencingSettings] 📍 API URL:', '/api/hr/geofences/');
      
      // Ensure trailing slash to avoid redirect
      const data = await api.get('/api/hr/geofences/');
      
      console.log('[GeofencingSettings] ✅ Response received:', data);
      console.log('[GeofencingSettings] 📦 Response data:', data);
      console.log('[GeofencingSettings] 🔍 Response data type:', typeof data);
      
      // Check if response is an error
      if (data?.error) {
        console.error('[GeofencingSettings] ❌ API returned error:', data.error);
        console.error('[GeofencingSettings] ❌ Error detail:', data.detail);
        throw new Error(data.error);
      }
      
      // Handle both paginated and non-paginated responses
      let geofencesData = [];
      if (data?.results) {
        console.log('[GeofencingSettings] 📄 Paginated response detected');
        geofencesData = data.results;
      } else if (Array.isArray(data)) {
        console.log('[GeofencingSettings] 📋 Array response detected');
        geofencesData = data;
      } else if (data) {
        console.log('[GeofencingSettings] ⚠️ Unknown response format, wrapping in array');
        geofencesData = [data];
      }
      
      console.log('[GeofencingSettings] 🎯 Final geofences count:', geofencesData.length);
      console.log('[GeofencingSettings] 📝 Geofences data:', JSON.stringify(geofencesData, null, 2));
      
      setGeofences(geofencesData);
      console.log('[GeofencingSettings] ✅ === LOADING GEOFENCES END ===');
    } catch (error) {
      console.error('[GeofencingSettings] ❌ === ERROR LOADING GEOFENCES ===');
      console.error('[GeofencingSettings] 🚨 Error object:', error);
      console.error('[GeofencingSettings] 🚨 Error message:', error?.message);
      console.error('[GeofencingSettings] 🚨 Error response:', error?.response);
      console.error('[GeofencingSettings] 🚨 Error status:', error?.response?.status);
      console.error('[GeofencingSettings] 🚨 Error data:', error?.response?.data);
      console.error('[GeofencingSettings] 🚨 Error detail:', error?.response?.data?.detail);
      
      // Show more detailed error
      const errorMessage = error?.response?.data?.detail?.detail || 
                          error?.response?.data?.detail || 
                          error?.response?.data?.error ||
                          'Failed to load geofences';
      
      logger.error('Error loading geofences:', error);
      notifyError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Debug function to check geofences in database
  const debugGeofences = async () => {
    console.log('[GeofencingSettings] 🔍 === DEBUG CHECK START ===');
    try {
      const response = await api.get('/api/hr/geofences/debug_list/');
      console.log('[GeofencingSettings] 🔍 Debug response:', response.data);
      console.log('[GeofencingSettings] 🔍 User business ID:', response.data.user_business_id);
      console.log('[GeofencingSettings] 🔍 Total geofences in DB:', response.data.total_geofences_in_db);
      console.log('[GeofencingSettings] 🔍 User geofences count:', response.data.user_geofences_count);
      console.log('[GeofencingSettings] 🔍 All geofences:', response.data.all_geofences);
      console.log('[GeofencingSettings] 🔍 User geofences:', response.data.user_geofences);
      
      // If there are geofences but they're not showing, there's a filtering issue
      if (response.data.total_geofences_in_db > 0 && response.data.user_geofences_count === 0) {
        console.error('[GeofencingSettings] ⚠️ BUSINESS ID MISMATCH - geofences exist but not for this business');
        console.error('[GeofencingSettings] ⚠️ User business ID:', response.data.user_business_id);
        console.error('[GeofencingSettings] ⚠️ Geofence business IDs:', response.data.all_geofences.map(g => g.business_id));
      }
    } catch (error) {
      console.error('[GeofencingSettings] ❌ Debug error:', error);
    }
    console.log('[GeofencingSettings] 🔍 === DEBUG CHECK END ===');
  };

  // Call debug function on mount - ensure it runs
  useEffect(() => {
    console.log('[GeofencingSettings] 🚀 useEffect for debugGeofences triggered');
    debugGeofences();
  }, []);
  
  // Another useEffect to ensure loadGeofences runs
  useEffect(() => {
    console.log('[GeofencingSettings] 🚀 useEffect for loadGeofences triggered');
    if (!loading && geofences.length === 0) {
      console.log('[GeofencingSettings] 🚀 Calling loadGeofences from useEffect');
      loadGeofences();
    }
  }, []);

  const handleCreateGeofence = () => {
    if (!legalAccepted) {
      setShowLegalCompliance(true);
    } else {
      setShowCreateForm(true);
    }
  };

  const handleLegalAccept = () => {
    setLegalAccepted(true);
    setShowLegalCompliance(false);
    setShowCreateForm(true);
  };

  const handleGeofenceCreated = async (geofence) => {
    console.log('[GeofencingSettings] === handleGeofenceCreated START ===');
    console.log('[GeofencingSettings] Received geofence:', geofence);
    console.log('[GeofencingSettings] Geofence type:', typeof geofence);
    console.log('[GeofencingSettings] Geofence keys:', Object.keys(geofence || {}));
    console.log('[GeofencingSettings] Geofence stringified:', JSON.stringify(geofence, null, 2));
    
    // Use functional state updates to ensure proper batching
    setGeofences(prev => {
      console.log('[GeofencingSettings] Adding to geofences, prev:', prev.length, 'items');
      const newList = [...prev, geofence];
      console.log('[GeofencingSettings] New geofences list:', newList.length, 'items');
      return newList;
    });
    
    console.log('[GeofencingSettings] Setting newlyCreatedGeofence to:', geofence);
    setNewlyCreatedGeofence(geofence);
    setShowCreateForm(false);
    setShowEmployeeAssignment(true);
    
    console.log('[GeofencingSettings] State set - showEmployeeAssignment: true, newlyCreatedGeofence:', geofence);
    
    // IMPORTANT: Don't reload immediately to avoid state conflicts
    // The geofence is already added to the list above
    console.log('[GeofencingSettings] Skipping loadGeofences to preserve newlyCreatedGeofence state');
    
    notifySuccess('Geofence created successfully! Now assign employees.');
    console.log('[GeofencingSettings] === handleGeofenceCreated END ===');
  };

  const handleEmployeeAssignmentComplete = async (assignedEmployeeIds) => {
    setShowEmployeeAssignment(false);
    setNewlyCreatedGeofence(null);
    
    // Now reload geofences to get the complete updated list
    await loadGeofences();
    
    notifySuccess(`Assigned ${assignedEmployeeIds.length} employees to geofence`);
  };

  const handleSkipEmployeeAssignment = async () => {
    setShowEmployeeAssignment(false);
    setNewlyCreatedGeofence(null);
    
    // Reload geofences to get the complete updated list
    await loadGeofences();
    
    notifySuccess('Geofence created. You can assign employees later.');
  };

  const handleViewGeofence = (geofence) => {
    setSelectedGeofence(geofence);
    setShowViewModal(true);
  };

  const handleEditGeofence = (geofence) => {
    setSelectedGeofence(geofence);
    setShowEditModal(true);
  };

  const handleGeofenceUpdated = (updatedGeofence) => {
    setGeofences(prev => prev.map(g => g.id === updatedGeofence.id ? updatedGeofence : g));
    notifySuccess('Geofence updated successfully');
  };

  const handleDeleteGeofence = async (geofenceId) => {
    if (!confirm('Are you sure you want to delete this geofence?')) return;

    try {
      await api.delete(`/api/hr/geofences/${geofenceId}/`);
      setGeofences(prev => prev.filter(g => g.id !== geofenceId));
      notifySuccess('Geofence deleted successfully');
    } catch (error) {
      logger.error('Error deleting geofence:', error);
      notifyError('Failed to delete geofence');
    }
  };

  if (!isOwner && !isAdmin) {
    return (
      <div className="p-6 text-center">
        <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">Only owners and administrators can manage geofencing settings.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <StandardSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Geofencing Settings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Set up location-based restrictions for employee clock in/out
          </p>
        </div>
        <button
          onClick={handleCreateGeofence}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <PlusCircleIcon className="h-4 w-4 mr-2" />
          Add Geofence
        </button>
      </div>

      {/* Legal Compliance Modal */}
      {showLegalCompliance && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-screen overflow-y-auto m-4">
            <div className="p-6">
              <LegalComplianceInfo onAccept={handleLegalAccept} />
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Geofence</h3>
          {console.log('[GeofencingSettings] 🎨 Rendering GoogleMapsGeofenceSetup with isVisible:', showCreateForm)}
          <GoogleMapsGeofenceSetup
            onGeofenceCreated={handleGeofenceCreated}
            onCancel={() => setShowCreateForm(false)}
            isVisible={showCreateForm}
          />
        </div>
      )}

      {/* Employee Assignment - Inline after geofence creation */}
      {console.log('[GeofencingSettings] 🔍 RENDER CHECK - showEmployeeAssignment:', showEmployeeAssignment)}
      {console.log('[GeofencingSettings] 🔍 RENDER CHECK - newlyCreatedGeofence:', newlyCreatedGeofence)}
      {console.log('[GeofencingSettings] 🔍 RENDER CHECK - newlyCreatedGeofence type:', typeof newlyCreatedGeofence)}
      {console.log('[GeofencingSettings] 🔍 RENDER CHECK - newlyCreatedGeofence truthy:', !!newlyCreatedGeofence)}
      {console.log('[GeofencingSettings] 🔍 RENDER CHECK - Condition result:', showEmployeeAssignment && newlyCreatedGeofence)}
      {showEmployeeAssignment && newlyCreatedGeofence && (
        <InlineEmployeeAssignment
          geofence={newlyCreatedGeofence}
          onComplete={handleEmployeeAssignmentComplete}
          onSkip={handleSkipEmployeeAssignment}
        />
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p><strong>Geofencing</strong> allows you to define geographic boundaries where employees can clock in and out. This ensures employees are at the correct work location and helps maintain accurate time records.</p>
            <p className="mt-2"><strong>Important:</strong> All employees must consent to location tracking before geofencing can be enforced.</p>
          </div>
        </div>
      </div>

      {/* Geofences List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Active Geofences</h3>
          <button
            onClick={async () => {
              console.log('[GeofencingSettings] 🔄 === MANUAL REFRESH TRIGGERED ===');
              console.log('[GeofencingSettings] 🧹 Clearing stuck states...');
              setShowEmployeeAssignment(false);
              setNewlyCreatedGeofence(null);
              console.log('[GeofencingSettings] 📡 Calling loadGeofences...');
              await loadGeofences();
              console.log('[GeofencingSettings] ✅ Refresh complete');
            }}
            className="flex items-center px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
          >
            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        
        {geofences.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MapPinIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No geofences configured yet.</p>
            <p className="text-sm mt-1">Click "Add Geofence" to create your first location boundary.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {geofences
              .filter(geofence => geofence && geofence.id) // Filter out invalid geofences
              .map((geofence) => (
                <div key={geofence.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{geofence?.name || 'Unnamed Geofence'}</h4>
                        <p className="text-sm text-gray-500">
                          {geofence.location_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} • {geofence.radius}m radius
                        </p>
                        {geofence.description && (
                          <p className="text-xs text-gray-500 mt-1">{geofence.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-2">
                      {geofence.require_for_clock_in && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Clock In Required</span>
                      )}
                      {geofence.require_for_clock_out && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Clock Out Required</span>
                      )}
                      {geofence.auto_clock_out_on_exit && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Auto Clock Out</span>
                      )}
                      {geofence.alert_on_unexpected_exit && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Exit Alerts</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewGeofence(geofence)}
                      className="text-gray-400 hover:text-gray-600"
                      title="View Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditGeofence(geofence)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit Geofence"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGeofence(geofence.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Geofence"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Geofence Modal */}
      <ViewGeofenceModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedGeofence(null);
        }}
        geofence={selectedGeofence}
        onEdit={handleEditGeofence}
      />

      {/* Edit Geofence Modal */}
      <EditGeofenceModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedGeofence(null);
        }}
        geofence={selectedGeofence}
        onGeofenceUpdated={handleGeofenceUpdated}
      />
    </div>
  );
  } catch (error) {
    console.error('[GeofencingSettings] Critical error in component render:', error);
    logger.error('GeofencingSettings component error', error);
    
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">Component Error</h3>
          <p className="text-sm text-red-700 mb-4">
            There was an error loading the geofencing settings. Please refresh the page and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
};

export default GeofencingSettings;