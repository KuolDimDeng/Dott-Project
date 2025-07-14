'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ClockIcon, MapPinIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/outline';
import timesheetApi from '@/utils/api/timesheetApi';
import StandardSpinner from '@/components/StandardSpinner';
import { toast } from '@/hooks/useToast';

export default function ClockInOut() {
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [clockStatus, setClockStatus] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [location, setLocation] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchClockStatus();
    checkLocationPermission();
    
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const fetchClockStatus = async () => {
    try {
      setLoading(true);
      const status = await timesheetApi.getCurrentClockStatus();
      setClockStatus(status);
    } catch (error) {
      console.error('Error fetching clock status:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clock status',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkLocationPermission = () => {
    if ('geolocation' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationEnabled(result.state === 'granted');
      });
    }
  };

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!locationEnabled) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  };

  const handleClockAction = async (action) => {
    try {
      setClocking(true);
      
      // Get location if enabled
      const locationData = await getLocation();
      
      const data = {
        location_enabled: !!locationData,
        ...(locationData && {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          location_accuracy: locationData.accuracy
        })
      };

      let response;
      switch (action) {
        case 'clock_in':
          response = await timesheetApi.clockIn(data);
          toast({
            title: 'Success',
            description: 'Clocked in successfully'
          });
          break;
        case 'clock_out':
          response = await timesheetApi.clockOut(data);
          toast({
            title: 'Success',
            description: 'Clocked out successfully'
          });
          break;
        case 'break_start':
          response = await timesheetApi.startBreak(data);
          toast({
            title: 'Success',
            description: 'Break started'
          });
          break;
        case 'break_end':
          response = await timesheetApi.endBreak(data);
          toast({
            title: 'Success',
            description: 'Break ended'
          });
          break;
      }

      // Refresh status
      await fetchClockStatus();
    } catch (error) {
      console.error('Error performing clock action:', error);
      toast({
        title: 'Error',
        description: 'Failed to perform clock action',
        variant: 'destructive'
      });
    } finally {
      setClocking(false);
    }
  };

  const toggleLocationTracking = async () => {
    if (!locationEnabled) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'denied') {
          toast({
            title: 'Location Permission Denied',
            description: 'Please enable location permissions in your browser settings',
            variant: 'destructive'
          });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          () => {
            setLocationEnabled(true);
            toast({
              title: 'Success',
              description: 'Location tracking enabled'
            });
          },
          () => {
            toast({
              title: 'Error',
              description: 'Failed to enable location tracking',
              variant: 'destructive'
            });
          }
        );
      } catch (error) {
        console.error('Error requesting location permission:', error);
      }
    } else {
      setLocationEnabled(false);
      toast({
        title: 'Success',
        description: 'Location tracking disabled'
      });
    }
  };

  const formatDuration = (startTime) => {
    if (!startTime) return '00:00:00';
    
    const start = new Date(startTime);
    const now = new Date();
    const diff = now - start;
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <StandardSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Current Time Display */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {format(currentTime, 'h:mm:ss a')}
          </h1>
          <p className="text-lg text-gray-600">
            {format(currentTime, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Status Display */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-xl font-semibold">
                {clockStatus?.is_clocked_in ? (
                  <span className="text-green-600">
                    {clockStatus.is_on_break ? 'On Break' : 'Clocked In'}
                  </span>
                ) : (
                  <span className="text-gray-600">Clocked Out</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Today's Hours</p>
              <p className="text-xl font-semibold">{clockStatus?.today_total_hours || 0} hrs</p>
            </div>
          </div>
          
          {clockStatus?.is_clocked_in && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">Current Session</p>
              <p className="text-xl font-mono font-semibold text-blue-600">
                {formatDuration(clockStatus.last_clock_in)}
              </p>
            </div>
          )}
        </div>

        {/* Location Toggle */}
        <div className="flex items-center justify-between mb-8 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center">
            <MapPinIcon className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">Location Tracking</span>
          </div>
          <button
            onClick={toggleLocationTracking}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              locationEnabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                locationEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!clockStatus?.is_clocked_in ? (
            <button
              onClick={() => handleClockAction('clock_in')}
              disabled={clocking}
              className="w-full flex items-center justify-center px-6 py-4 bg-green-600 text-white text-lg font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {clocking ? (
                <StandardSpinner size="sm" className="text-white" />
              ) : (
                <>
                  <ClockIcon className="h-6 w-6 mr-2" />
                  Clock In
                </>
              )}
            </button>
          ) : (
            <>
              {!clockStatus.is_on_break ? (
                <>
                  <button
                    onClick={() => handleClockAction('break_start')}
                    disabled={clocking}
                    className="w-full flex items-center justify-center px-6 py-4 bg-yellow-600 text-white text-lg font-medium rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                  >
                    {clocking ? (
                      <StandardSpinner size="sm" className="text-white" />
                    ) : (
                      <>
                        <PauseIcon className="h-6 w-6 mr-2" />
                        Start Break
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleClockAction('clock_out')}
                    disabled={clocking}
                    className="w-full flex items-center justify-center px-6 py-4 bg-red-600 text-white text-lg font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {clocking ? (
                      <StandardSpinner size="sm" className="text-white" />
                    ) : (
                      <>
                        <ClockIcon className="h-6 w-6 mr-2" />
                        Clock Out
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleClockAction('break_end')}
                  disabled={clocking}
                  className="w-full flex items-center justify-center px-6 py-4 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {clocking ? (
                    <StandardSpinner size="sm" className="text-white" />
                  ) : (
                    <>
                      <PlayIcon className="h-6 w-6 mr-2" />
                      End Break
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {/* Location Status */}
        {locationEnabled && location && (
          <div className="mt-6 text-center text-sm text-gray-500">
            <MapPinIcon className="inline h-4 w-4 mr-1" />
            Location tracked
            {clockStatus?.latest_entry?.is_within_geofence !== null && (
              <span className={clockStatus.latest_entry.is_within_geofence ? 'text-green-600' : 'text-yellow-600'}>
                {clockStatus.latest_entry.is_within_geofence ? ' (Within work zone)' : ' (Outside work zone)'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}