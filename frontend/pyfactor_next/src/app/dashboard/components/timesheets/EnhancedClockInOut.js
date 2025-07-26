'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  ClockIcon, 
  MapPinIcon, 
  PauseIcon, 
  PlayIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import timesheetApi from '@/utils/api/timesheetApi';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { toast } from 'react-hot-toast';
import { logger } from '@/utils/logger';
import api from '@/utils/api';

// Location Consent Modal Component
const LocationConsentModal = ({ isOpen, onAccept, onDecline }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl mx-4 p-6">
        <div className="flex items-start mb-4">
          <ShieldCheckIcon className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">Location Tracking Consent</h3>
            <p className="text-sm text-gray-600 mt-1">
              Your employer has requested access to your location for time tracking purposes.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <h4 className="font-medium mb-2">What location data is collected:</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>GPS coordinates when you clock in and out</li>
              <li>Location accuracy information</li>
              <li>Address information (if available)</li>
              <li>Distance from designated work locations</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">How your data is used:</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Verify you're at authorized work locations</li>
              <li>Generate accurate time and attendance records</li>
              <li>Ensure compliance with work location policies</li>
              <li>Improve workplace safety and security</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Your rights:</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>You can decline location tracking (may affect clock in/out)</li>
              <li>You can access and request deletion of your location data</li>
              <li>Location data is only collected during work hours</li>
              <li>Data is encrypted and stored securely</li>
              <li>Data is automatically deleted after 90 days</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onDecline}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            Accept and Continue
          </button>
        </div>
      </div>
    </div>
  );
};

// Geofence Status Component
const GeofenceStatus = ({ geofenceStatus, location }) => {
  if (!geofenceStatus) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'inside': return 'text-green-600 bg-green-50 border-green-200';
      case 'outside': return 'text-red-600 bg-red-50 border-red-200';
      case 'no_geofences': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'unknown': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'inside': return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'outside': return <XCircleIcon className="h-5 w-5 text-red-600" />;
      case 'unknown': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      default: return <InformationCircleIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  // Show status for no geofences
  if (geofenceStatus.status === 'no_geofences') {
    return (
      <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
        <div className="flex items-center">
          <InformationCircleIcon className="h-5 w-5 text-blue-600" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">No Location Requirements</h4>
            <p className="text-xs mt-1 text-blue-600">
              You can clock in from any location
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle multiple geofences
  if (geofenceStatus.geofences && geofenceStatus.geofences.length > 0) {
    const insideGeofences = geofenceStatus.geofences.filter(g => g.is_inside);
    const hasRequiredClockIn = geofenceStatus.geofences.some(g => 
      g.geofence.require_for_clock_in && !g.can_clock_in_outside
    );
    
    return (
      <div className="space-y-2">
        {geofenceStatus.geofences.map((gf, index) => (
          <div key={gf.geofence.id} 
               className={`p-3 rounded-lg border ${gf.is_inside ? getStatusColor('inside') : getStatusColor('outside')}`}>
            <div className="flex items-center">
              {gf.is_inside ? getStatusIcon('inside') : getStatusIcon('outside')}
              <div className="ml-3">
                <h4 className="text-sm font-medium">
                  {gf.geofence.name}
                </h4>
                <p className="text-xs mt-1">
                  {gf.is_inside ? 'Inside work area' : `${Math.round(gf.distance)}m away`}
                  {gf.can_clock_in_outside && !gf.is_inside && ' • Override allowed'}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {!geofenceStatus.can_clock_in && hasRequiredClockIn && (
          <p className="text-xs text-red-600 font-medium mt-2">
            You must be at a designated work location to clock in
          </p>
        )}
      </div>
    );
  }

  // Fallback for simple status
  return (
    <div className={`p-3 rounded-lg border ${getStatusColor(geofenceStatus.status)}`}>
      <div className="flex items-center">
        {getStatusIcon(geofenceStatus.status)}
        <div className="ml-3">
          <h4 className="text-sm font-medium">
            {geofenceStatus.status === 'inside' && 'Inside Work Area'}
            {geofenceStatus.status === 'outside' && 'Outside Work Area'}
            {geofenceStatus.status === 'unknown' && 'Location Unknown'}
          </h4>
        </div>
      </div>
    </div>
  );
};

export default function EnhancedClockInOut() {
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [clockStatus, setClockStatus] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [location, setLocation] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [geofenceStatus, setGeofenceStatus] = useState(null);
  const [locationConsent, setLocationConsent] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [geofences, setGeofences] = useState([]);

  useEffect(() => {
    fetchClockStatus();
    checkLocationConsent();
    loadGeofences();
    
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (locationConsent?.granted && locationEnabled) {
      getCurrentLocation();
    }
  }, [locationConsent, locationEnabled]);

  const fetchClockStatus = async () => {
    try {
      setLoading(true);
      const status = await timesheetApi.getCurrentClockStatus();
      setClockStatus(status);
    } catch (error) {
      logger.error('Error fetching clock status:', error);
      toast.error('Failed to load clock status');
    } finally {
      setLoading(false);
    }
  };

  const checkLocationConsent = async () => {
    try {
      const response = await api.get('/api/hr/location-consents/check/me/');
      setLocationConsent(response.data);
      
      if (response.data?.granted) {
        checkLocationPermission();
      }
    } catch (error) {
      logger.error('Error checking location consent:', error);
    }
  };

  const loadGeofences = async () => {
    try {
      const response = await api.get('/api/hr/geofences/');
      setGeofences(response.data?.results || []);
    } catch (error) {
      logger.error('Error loading geofences:', error);
    }
  };

  const checkLocationPermission = () => {
    if ('geolocation' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationEnabled(result.state === 'granted');
        if (result.state === 'granted') {
          getCurrentLocation();
        }
      });
    }
  };

  const getCurrentLocation = () => {
    if (!locationEnabled) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setLocation(locationData);
        checkGeofenceStatus(locationData);
      },
      (error) => {
        logger.error('Error getting location:', error);
        setLocation(null);
        setGeofenceStatus(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const checkGeofenceStatus = async (locationData) => {
    if (!locationData) return;
    
    try {
      console.log('🎯 [ClockInOut] === GEOFENCE CHECK START ===');
      console.log('🎯 [ClockInOut] Location data:', locationData);
      
      // Get employee ID from session/user context
      const userResponse = await api.get('/api/users/me/');
      console.log('🎯 [ClockInOut] User response:', userResponse.data);
      
      const employeeId = userResponse.data.employee?.id;
      console.log('🎯 [ClockInOut] Employee ID:', employeeId);
      
      if (!employeeId) {
        console.error('🎯 [ClockInOut] No employee ID found - user might not be an employee');
        // Check if user has any assigned geofences via different endpoint
        return;
      }
      
      // Use correct endpoint with GET method and query params
      console.log('🎯 [ClockInOut] Calling check_location with params:', {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        employee_id: employeeId
      });
      
      const response = await api.get('/api/hr/geofences/check_location/', {
        params: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          employee_id: employeeId
        }
      });
      
      console.log('🎯 [ClockInOut] Geofence check response:', response.data);
      console.log('🎯 [ClockInOut] Number of geofences:', response.data.geofences?.length || 0);
      
      // Update geofence status based on response
      if (response.data.geofences && response.data.geofences.length > 0) {
        const insideAnyGeofence = response.data.geofences.some(g => g.is_inside);
        console.log('🎯 [ClockInOut] Inside any geofence:', insideAnyGeofence);
        
        response.data.geofences.forEach((g, i) => {
          console.log(`🎯 [ClockInOut] Geofence ${i}: ${g.geofence.name} - Inside: ${g.is_inside}, Distance: ${g.distance}m`);
        });
        
        setGeofenceStatus({
          status: insideAnyGeofence ? 'inside' : 'outside',
          can_clock_in: response.data.can_clock_in,
          geofences: response.data.geofences
        });
      } else {
        console.log('🎯 [ClockInOut] No geofences assigned to employee');
        setGeofenceStatus({
          status: 'no_geofences',
          can_clock_in: true, // Allow clock in if no geofences assigned
          geofences: []
        });
      }
      console.log('🎯 [ClockInOut] === GEOFENCE CHECK END ===');
    } catch (error) {
      console.error('🎯 [ClockInOut] === GEOFENCE CHECK ERROR ===');
      console.error('🎯 [ClockInOut] Error:', error);
      console.error('🎯 [ClockInOut] Error response:', error.response);
      setGeofenceStatus(null);
    }
  };

  const handleLocationConsent = async (granted) => {
    try {
      const response = await api.post('/api/hr/location-consents/', {
        clock_in_out_tracking: granted,
        random_location_checks: granted,
        continuous_tracking: false
      });
      
      setLocationConsent(response.data);
      setShowConsentModal(false);
      
      if (granted) {
        checkLocationPermission();
      }
    } catch (error) {
      logger.error('Error saving location consent:', error);
      toast.error('Failed to save consent preference');
    }
  };

  const canPerformAction = (action) => {
    if (!geofenceStatus) return true;
    
    // If no geofences are assigned, allow the action
    if (geofenceStatus.status === 'no_geofences') return true;
    
    // Check if any geofence requires this action
    const hasRequiredGeofence = geofenceStatus.geofences?.some(g => {
      const geofence = g.geofence;
      return (action === 'clock_in' && geofence.require_for_clock_in) ||
             (action === 'clock_out' && geofence.require_for_clock_out);
    });
    
    // If no geofence requires this action, allow it
    if (!hasRequiredGeofence) return true;
    
    // Otherwise, check if user can clock in based on geofence status
    return geofenceStatus.can_clock_in;
  };

  const handleClockAction = async (action) => {
    console.log('🎯 [ClockInOut] === CLOCK ACTION START ===');
    console.log('🎯 [ClockInOut] Action:', action);
    console.log('🎯 [ClockInOut] Location consent:', locationConsent);
    console.log('🎯 [ClockInOut] Current location:', location);
    console.log('🎯 [ClockInOut] Geofence status:', geofenceStatus);
    
    // Check location consent first
    if (!locationConsent) {
      console.log('🎯 [ClockInOut] No location consent - showing modal');
      setShowConsentModal(true);
      return;
    }

    // Check geofence requirements
    const canPerform = canPerformAction(action);
    console.log('🎯 [ClockInOut] Can perform action:', canPerform);
    
    if (!canPerform) {
      console.log('🎯 [ClockInOut] Action blocked by geofence requirements');
      toast.error(
        action === 'clock_in' 
          ? 'You must be at a designated work location to clock in'
          : 'You must be at a designated work location to clock out'
      );
      return;
    }

    try {
      setClocking(true);
      
      const data = {
        location_enabled: !!location,
        ...(location && {
          latitude: location.latitude,
          longitude: location.longitude,
          location_accuracy: location.accuracy
        })
      };

      console.log('🎯 [ClockInOut] Clock action data:', data);

      let response;
      switch (action) {
        case 'clock_in':
          response = await timesheetApi.clockIn(data);
          break;
        case 'clock_out':
          response = await timesheetApi.clockOut(data);
          break;
        case 'start_break':
          response = await timesheetApi.startBreak(data);
          break;
        case 'end_break':
          response = await timesheetApi.endBreak(data);
          break;
        default:
          throw new Error('Invalid action');
      }

      console.log('🎯 [ClockInOut] Clock action response:', response);
      setClockStatus(response);
      
      // Log geofence event for any inside geofences
      if (location && geofenceStatus && geofenceStatus.geofences) {
        const insideGeofences = geofenceStatus.geofences.filter(g => g.is_inside);
        console.log('🎯 [ClockInOut] Inside geofences for event logging:', insideGeofences.length);
        
        for (const gf of insideGeofences) {
          try {
            console.log(`🎯 [ClockInOut] Logging event for geofence: ${gf.geofence.name}`);
            await api.post('/api/hr/geofence-events/log_event/', {
              event_type: action,
              latitude: location.latitude,
              longitude: location.longitude,
              geofence_id: gf.geofence.id
            });
          } catch (error) {
            console.error('🎯 [ClockInOut] Error logging geofence event:', error);
          }
        }
      }
      
      toast.success(
        action === 'clock_in' ? 'Clocked in successfully' :
        action === 'clock_out' ? 'Clocked out successfully' :
        action === 'start_break' ? 'Break started' :
        'Break ended'
      );
      
      console.log('🎯 [ClockInOut] === CLOCK ACTION SUCCESS ===');
      
    } catch (error) {
      console.error('🎯 [ClockInOut] === CLOCK ACTION ERROR ===');
      console.error('🎯 [ClockInOut] Error:', error);
      logger.error(`Error with ${action}:`, error);
      toast.error(`Failed to ${action.replace('_', ' ')}`);
    } finally {
      setClocking(false);
      console.log('🎯 [ClockInOut] === CLOCK ACTION END ===');
    }
  };

  const formatDuration = (startTime) => {
    if (!startTime) return '00:00:00';
    
    const start = new Date(startTime);
    const now = new Date();
    const diff = now - start;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <StandardSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <LocationConsentModal
        isOpen={showConsentModal}
        onAccept={() => handleLocationConsent(true)}
        onDecline={() => handleLocationConsent(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <ClockIcon className="h-6 w-6 text-gray-400 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">Time Clock</h3>
            <p className="text-sm text-gray-500">
              {format(currentTime, 'EEEE, MMMM d, yyyy • h:mm:ss a')}
            </p>
          </div>
        </div>
        
        {location && (
          <div className="flex items-center text-sm text-gray-500">
            <MapPinIcon className="h-4 w-4 mr-1" />
            Location enabled
          </div>
        )}
      </div>

      {/* Geofence Status */}
      {geofenceStatus && (
        <div className="mb-6">
          <GeofenceStatus geofenceStatus={geofenceStatus} location={location} />
        </div>
      )}

      {/* Clock Status */}
      {clockStatus?.is_clocked_in && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Currently clocked in</p>
              <p className="text-sm text-green-600">
                Started at {format(new Date(clockStatus.clock_in_time), 'h:mm a')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-mono text-green-800">
                {formatDuration(clockStatus.clock_in_time)}
              </p>
              <p className="text-xs text-green-600">Duration</p>
            </div>
          </div>
        </div>
      )}

      {/* Break Status */}
      {clockStatus?.is_on_break && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">Currently on break</p>
              <p className="text-sm text-yellow-600">
                Started at {format(new Date(clockStatus.break_start_time), 'h:mm a')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-mono text-yellow-800">
                {formatDuration(clockStatus.break_start_time)}
              </p>
              <p className="text-xs text-yellow-600">Break time</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!clockStatus?.is_clocked_in ? (
          <button
            onClick={() => handleClockAction('clock_in')}
            disabled={clocking || !canPerformAction('clock_in')}
            className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {clocking ? (
              <StandardSpinner size="sm" className="mr-2" />
            ) : (
              <PlayIcon className="h-5 w-5 mr-2" />
            )}
            Clock In
          </button>
        ) : (
          <button
            onClick={() => handleClockAction('clock_out')}
            disabled={clocking || !canPerformAction('clock_out')}
            className="flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {clocking ? (
              <StandardSpinner size="sm" className="mr-2" />
            ) : (
              <PlayIcon className="h-5 w-5 mr-2 rotate-90" />
            )}
            Clock Out
          </button>
        )}

        {clockStatus?.is_clocked_in && (
          <button
            onClick={() => handleClockAction(clockStatus.is_on_break ? 'end_break' : 'start_break')}
            disabled={clocking}
            className="flex items-center justify-center px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {clocking ? (
              <StandardSpinner size="sm" className="mr-2" />
            ) : (
              <PauseIcon className="h-5 w-5 mr-2" />
            )}
            {clockStatus.is_on_break ? 'End Break' : 'Start Break'}
          </button>
        )}
      </div>

      {/* Legal Notice */}
      <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Privacy Notice:</strong> Your location data is collected only during work hours for time tracking purposes. 
          Data is encrypted, stored securely, and automatically deleted after 90 days. 
          You have the right to access, modify, or delete your location data at any time.
        </p>
      </div>
    </div>
  );
}