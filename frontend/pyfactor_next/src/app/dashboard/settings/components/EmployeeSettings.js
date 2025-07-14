'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPinIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import timesheetApi from '@/utils/api/timesheetApi';
import StandardSpinner from '@/components/StandardSpinner';
import { toast } from '@/hooks/useToast';

export default function EmployeeSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geofenceZones, setGeofenceZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const circleRef = useRef(null);
  const [zoneForm, setZoneForm] = useState({
    name: '',
    zone_type: 'circle',
    center_latitude: '',
    center_longitude: '',
    radius_meters: 100,
    require_location: true,
    allow_clock_outside: false
  });

  useEffect(() => {
    fetchGeofenceZones();
    loadGoogleMaps();
  }, []);

  const fetchGeofenceZones = async () => {
    try {
      setLoading(true);
      const response = await timesheetApi.getGeofenceZones();
      setGeofenceZones(response.results || []);
    } catch (error) {
      console.error('Error fetching geofence zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGoogleMaps = () => {
    if (window.google && window.google.maps) {
      initializeMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=drawing`;
    script.async = true;
    script.onload = initializeMap;
    document.body.appendChild(script);
  };

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 37.7749, lng: -122.4194 }, // San Francisco default
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });

    mapInstanceRef.current = map;

    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          map.setCenter(pos);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }

    // Add click listener to set zone center
    map.addListener('click', (e) => {
      if (showZoneForm) {
        setZoneForm(prev => ({
          ...prev,
          center_latitude: e.latLng.lat(),
          center_longitude: e.latLng.lng()
        }));
        updateCircle(e.latLng.lat(), e.latLng.lng(), zoneForm.radius_meters);
      }
    });
  };

  const updateCircle = (lat, lng, radius) => {
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    if (!lat || !lng || !mapInstanceRef.current) return;

    circleRef.current = new window.google.maps.Circle({
      center: { lat: parseFloat(lat), lng: parseFloat(lng) },
      radius: parseInt(radius),
      fillColor: '#3B82F6',
      fillOpacity: 0.2,
      strokeColor: '#3B82F6',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      map: mapInstanceRef.current,
      editable: true,
      draggable: true
    });

    // Update form when circle is edited
    circleRef.current.addListener('center_changed', () => {
      const center = circleRef.current.getCenter();
      setZoneForm(prev => ({
        ...prev,
        center_latitude: center.lat(),
        center_longitude: center.lng()
      }));
    });

    circleRef.current.addListener('radius_changed', () => {
      setZoneForm(prev => ({
        ...prev,
        radius_meters: Math.round(circleRef.current.getRadius())
      }));
    });

    // Center map on circle
    mapInstanceRef.current.setCenter({ lat: parseFloat(lat), lng: parseFloat(lng) });
    mapInstanceRef.current.setZoom(15);
  };

  const handleZoneSubmit = async (e) => {
    e.preventDefault();
    
    if (!zoneForm.name || !zoneForm.center_latitude || !zoneForm.center_longitude) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      
      if (selectedZone) {
        await timesheetApi.updateGeofenceZone(selectedZone.id, zoneForm);
        toast({
          title: 'Success',
          description: 'Geofence zone updated successfully'
        });
      } else {
        await timesheetApi.createGeofenceZone(zoneForm);
        toast({
          title: 'Success',
          description: 'Geofence zone created successfully'
        });
      }
      
      setShowZoneForm(false);
      setSelectedZone(null);
      setZoneForm({
        name: '',
        zone_type: 'circle',
        center_latitude: '',
        center_longitude: '',
        radius_meters: 100,
        require_location: true,
        allow_clock_outside: false
      });
      
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
      
      fetchGeofenceZones();
    } catch (error) {
      console.error('Error saving geofence zone:', error);
      toast({
        title: 'Error',
        description: 'Failed to save geofence zone',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditZone = (zone) => {
    setSelectedZone(zone);
    setZoneForm({
      name: zone.name,
      zone_type: zone.zone_type,
      center_latitude: zone.center_latitude,
      center_longitude: zone.center_longitude,
      radius_meters: zone.radius_meters,
      require_location: zone.require_location,
      allow_clock_outside: zone.allow_clock_outside
    });
    setShowZoneForm(true);
    updateCircle(zone.center_latitude, zone.center_longitude, zone.radius_meters);
  };

  const handleDeleteZone = async (zoneId) => {
    if (!confirm('Are you sure you want to delete this geofence zone?')) return;

    try {
      await timesheetApi.deleteGeofenceZone(zoneId);
      toast({
        title: 'Success',
        description: 'Geofence zone deleted successfully'
      });
      fetchGeofenceZones();
    } catch (error) {
      console.error('Error deleting geofence zone:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete geofence zone',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <StandardSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-gray-900">Employee Settings</h3>
        <p className="mt-1 text-sm text-gray-500">
          Configure employee time tracking and location settings
        </p>
      </div>

      {/* Geofence Zones */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-medium text-gray-900">Geofence Zones</h4>
            <button
              onClick={() => {
                setShowZoneForm(true);
                setSelectedZone(null);
                setZoneForm({
                  name: '',
                  zone_type: 'circle',
                  center_latitude: '',
                  center_longitude: '',
                  radius_meters: 100,
                  require_location: true,
                  allow_clock_outside: false
                });
              }}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Zone
            </button>
          </div>

          {/* Zone List */}
          {geofenceZones.length === 0 ? (
            <div className="text-center py-4">
              <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No geofence zones configured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {geofenceZones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{zone.name}</p>
                    <p className="text-sm text-gray-500">
                      {zone.zone_type === 'circle' ? `${zone.radius_meters}m radius` : 'Polygon zone'}
                      {zone.allow_clock_outside && ' • Allows clock outside'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditZone(zone)}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteZone(zone.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Zone Form */}
      {showZoneForm && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">
              {selectedZone ? 'Edit Geofence Zone' : 'Create Geofence Zone'}
            </h4>
            
            <form onSubmit={handleZoneSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Zone Name</label>
                <input
                  type="text"
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Main Office"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Click on the map to set zone center
                </label>
                <div ref={mapRef} className="h-96 w-full rounded-lg border border-gray-300" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={zoneForm.center_latitude}
                    onChange={(e) => setZoneForm(prev => ({ ...prev, center_latitude: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={zoneForm.center_longitude}
                    onChange={(e) => setZoneForm(prev => ({ ...prev, center_longitude: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Radius (meters)</label>
                <input
                  type="number"
                  min="10"
                  max="5000"
                  value={zoneForm.radius_meters}
                  onChange={(e) => {
                    const radius = e.target.value;
                    setZoneForm(prev => ({ ...prev, radius_meters: radius }));
                    updateCircle(zoneForm.center_latitude, zoneForm.center_longitude, radius);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="require_location"
                    checked={zoneForm.require_location}
                    onChange={(e) => setZoneForm(prev => ({ ...prev, require_location: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="require_location" className="ml-2 block text-sm text-gray-900">
                    Require location for clock in/out
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allow_clock_outside"
                    checked={zoneForm.allow_clock_outside}
                    onChange={(e) => setZoneForm(prev => ({ ...prev, allow_clock_outside: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="allow_clock_outside" className="ml-2 block text-sm text-gray-900">
                    Allow clocking outside zone (with warning)
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowZoneForm(false);
                    setSelectedZone(null);
                    if (circleRef.current) {
                      circleRef.current.setMap(null);
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {saving ? <StandardSpinner size="sm" className="text-white" /> : (selectedZone ? 'Update Zone' : 'Create Zone')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}