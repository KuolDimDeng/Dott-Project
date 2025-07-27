'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '@/hooks/useSession-v2';
import { useRouter } from 'next/navigation';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { 
  ClockIcon, 
  PlayIcon, 
  StopIcon, 
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  MapPinIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import LocationConsent from '@/components/LocationConsent';
import { 
  captureLocation, 
  reverseGeocode, 
  getDeviceInfo,
  checkLocationAvailability,
  scheduleRandomLocationCheck,
  formatLocation,
  getLocationIndicatorProps,
  checkGeofence,
  formatDistance,
  getGeofenceStatus
} from '@/utils/locationServices';
import toast from 'react-hot-toast';
import timesheetApi from '@/utils/api/timesheetApi';

export default function MobileTimesheetPage() {
  const { session, loading } = useSession();
  const router = useRouter();
  const [currentTimesheet, setCurrentTimesheet] = useState(null);
  const [timesheetEntries, setTimesheetEntries] = useState({});
  const [loadingTimesheet, setLoadingTimesheet] = useState(false);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weekDays, setWeekDays] = useState([]);
  const [employeeData, setEmployeeData] = useState(null);
  const [loadingEmployee, setLoadingEmployee] = useState(true);
  
  // Location tracking states
  const [showLocationConsent, setShowLocationConsent] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  
  // Geofencing states
  const [employeeGeofences, setEmployeeGeofences] = useState([]);
  const [geofenceCheckResult, setGeofenceCheckResult] = useState(null);
  const [showGeofenceWarning, setShowGeofenceWarning] = useState(false);
  const [lastClockInLocation, setLastClockInLocation] = useState(null);
  const randomCheckTimeoutRef = useRef(null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Generate week days
  useEffect(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
    const end = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    setWeekDays(days);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !session) {
      router.push('/auth/mobile-login');
    }
  }, [session, loading, router]);

  // Fetch employee data for the current user
  const fetchEmployeeData = async () => {
    console.log('🎯 [MobileTimesheet] === FETCHING EMPLOYEE DATA ===');
    console.log('🎯 [MobileTimesheet] User email:', session?.user?.email);
    console.log('🎯 [MobileTimesheet] Full session:', session);
    
    if (!session?.user?.email) {
      console.log('🎯 [MobileTimesheet] No user email in session, skipping employee fetch');
      return;
    }
    
    setLoadingEmployee(true);
    try {
      // First try to get employee by user email
      const response = await fetch('/api/hr/v2/employees/me', {
        credentials: 'include',
      });
      
      console.log('🎯 [MobileTimesheet] Employee API response status:', response.status);
      console.log('🎯 [MobileTimesheet] Employee API response headers:', Object.fromEntries(response.headers));
      
      if (response.ok) {
        const responseText = await response.text();
        console.log('🎯 [MobileTimesheet] Raw employee response:', responseText);
        
        try {
          const data = JSON.parse(responseText);
          console.log('🎯 [MobileTimesheet] Parsed employee data:', data);
          console.log('🎯 [MobileTimesheet] Employee data structure:', {
            hasSuccess: 'success' in data,
            hasData: 'data' in data,
            dataType: typeof data,
            dataKeys: Object.keys(data),
            actualData: data.data || data
          });
          
          // Handle the success/data wrapper
          const employeeInfo = data.data || data;
          console.log('🎯 [MobileTimesheet] Setting employee data:', employeeInfo);
          setEmployeeData(employeeInfo);
        } catch (parseError) {
          console.error('🎯 [MobileTimesheet] Failed to parse employee JSON:', parseError);
        }
      } else {
        const errorText = await response.text();
        console.error('🎯 [MobileTimesheet] Failed to fetch employee data:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
      }
    } catch (error) {
      console.error('🎯 [MobileTimesheet] Error fetching employee:', error);
    } finally {
      setLoadingEmployee(false);
    }
  };

  // Load employee data on session change
  useEffect(() => {
    console.log('🎯 [MobileTimesheet] === SESSION CHECK ===');
    console.log('🎯 [MobileTimesheet] Full session:', session);
    console.log('🎯 [MobileTimesheet] User:', session?.user);
    
    // Check if user is authenticated
    if (session?.user?.email) {
      fetchEmployeeData();
    }
  }, [session]);
  
  // Load timesheet data when employee is loaded
  useEffect(() => {
    console.log('🎯 [MobileTimesheet] === EMPLOYEE DATA LOADED ===');
    console.log('🎯 [MobileTimesheet] Employee:', employeeData);
    console.log('🎯 [MobileTimesheet] Tenant ID:', session?.user?.tenant_id || session?.user?.tenantId);
    
    if (employeeData?.id && session?.user) {
      loadTimesheetData();
      checkLocationPermissions();
      loadEmployeeGeofences();
    }
  }, [employeeData, session]);
  
  // Load employee geofences
  const loadEmployeeGeofences = async () => {
    console.log('🎯 [MobileTimesheet] === LOADING GEOFENCES START ===');
    console.log('🎯 [MobileTimesheet] Employee ID:', employeeData?.id);
    console.log('🎯 [MobileTimesheet] Tenant ID:', session?.user?.tenant_id || session?.user?.tenantId);
    
    const tenantId = session?.user?.tenant_id || session?.user?.tenantId || session?.user?.business_id;
    
    if (!employeeData?.id || !tenantId) return;
    
    try {
      const response = await fetch(`/api/hr/employee-geofences/?employee_id=${employeeData.id}`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });
      
      console.log('🎯 [MobileTimesheet] Geofences response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🎯 [MobileTimesheet] Geofences data:', data);
        const activeGeofences = data
          .filter(eg => eg.is_active && eg.geofence?.is_active)
          .map(eg => eg.geofence);
        setEmployeeGeofences(activeGeofences);
      }
    } catch (error) {
      console.error('Error loading geofences:', error);
    }
  };

  // Check location permissions and consent
  const checkLocationPermissions = async () => {
    const availability = await checkLocationAvailability();
    const tenantId = session?.user?.tenant_id || session?.user?.tenantId || session?.user?.business_id;
    
    if (!employeeData?.id || !tenantId) return;
    
    if (availability.supported && availability.permission === 'granted') {
      // Check if user has given consent in our system
      try {
        const response = await fetch(`/api/hr/location-consents/check/${employeeData.id}/`, {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.has_consented && data.tracking_enabled) {
            setLocationEnabled(true);
          }
        }
      } catch (error) {
        console.error('Error checking location consent:', error);
      }
    }
  };
  
  // Cleanup random check timeout
  useEffect(() => {
    return () => {
      if (randomCheckTimeoutRef.current) {
        clearTimeout(randomCheckTimeoutRef.current);
      }
    };
  }, []);

  const loadTimesheetData = async () => {
    const tenantId = session?.user?.tenant_id || session?.user?.tenantId || session?.user?.business_id;
    
    if (!employeeData?.id || !tenantId) return;
    
    setLoadingTimesheet(true);
    try {
      // Get current timesheet
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      
      const response = await fetch(`/api/hr/timesheets/?employee=${employeeData.id}&week_start=${weekStart}`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setCurrentTimesheet(data.results[0]);
          // Load entries for this timesheet
          await loadTimesheetEntries(data.results[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading timesheet:', error);
    } finally {
      setLoadingTimesheet(false);
    }
  };

  const loadTimesheetEntries = async (timesheetId) => {
    try {
      const response = await fetch(`/api/hr/timesheets/${timesheetId}/entries/`, {
        headers: {
          'X-Tenant-ID': session.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const entriesMap = {};
        data.results?.forEach(entry => {
          entriesMap[entry.date] = entry;
        });
        setTimesheetEntries(entriesMap);
      }
    } catch (error) {
      console.error('Error loading timesheet entries:', error);
    }
  };

  const handleClockInOut = async () => {
    console.log('🎯 [MobileTimesheet] === CLOCK IN/OUT START ===');
    console.log('🎯 [MobileTimesheet] Session:', session);
    console.log('🎯 [MobileTimesheet] User email:', session?.user?.email);
    console.log('🎯 [MobileTimesheet] Employee ID:', employeeData?.id);
    console.log('🎯 [MobileTimesheet] Business ID:', session?.user?.business_id);
    console.log('🎯 [MobileTimesheet] Tenant ID:', session?.user?.tenant_id || session?.user?.tenantId);
    
    const tenantId = session?.user?.tenant_id || session?.user?.tenantId || session?.user?.business_id;
    const userEmail = session?.user?.email;
    
    if (!userEmail || !tenantId || !employeeData?.id) {
      console.error('🎯 [MobileTimesheet] Missing required data');
      console.error('🎯 [MobileTimesheet] User email:', userEmail);
      console.error('🎯 [MobileTimesheet] Tenant ID:', tenantId);
      console.error('🎯 [MobileTimesheet] Employee:', employeeData);
      toast.error('Employee profile not found. Please contact support.');
      return;
    }
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayEntry = timesheetEntries[today];
    const currentHours = todayEntry?.regular_hours || 0;
    const isClockingOut = currentHours > 0;
    
    console.log('🎯 [MobileTimesheet] Is clocking out:', isClockingOut);
    console.log('🎯 [MobileTimesheet] Location enabled:', locationEnabled);
    console.log('🎯 [MobileTimesheet] Employee geofences:', employeeGeofences);
    
    // Check if location consent is needed
    if (!locationEnabled && !isClockingOut) {
      console.log('🎯 [MobileTimesheet] No location consent - showing modal');
      setShowLocationConsent(true);
      return;
    }
    
    setIsClockingIn(true);
    
    // Capture location if enabled
    let locationData = null;
    let canProceed = true;
    
    if (locationEnabled) {
      setIsCapturingLocation(true);
      try {
        console.log('🎯 [MobileTimesheet] Capturing location...');
        const location = await captureLocation();
        console.log('🎯 [MobileTimesheet] Location captured:', location);
        
        const address = await reverseGeocode(location.latitude, location.longitude);
        const deviceInfo = getDeviceInfo();
        
        locationData = {
          ...location,
          address,
          ...deviceInfo,
        };
        
        console.log('🎯 [MobileTimesheet] Location data:', locationData);
        
        if (!isClockingOut) {
          setLastClockInLocation(locationData);
        }
        
        // Check geofences if we have them
        if (employeeGeofences.length > 0) {
          console.log('🎯 [MobileTimesheet] Checking geofences:', employeeGeofences.length);
          const checkResults = [];
          let insideAnyGeofence = false;
          
          for (const geofence of employeeGeofences) {
            const result = checkGeofence(location, geofence);
            checkResults.push({
              geofence,
              ...result,
            });
            
            if (result.isInside) {
              insideAnyGeofence = true;
            }
          }
          
          setGeofenceCheckResult(checkResults);
          
          // Check if we can clock in based on geofence rules
          if (!isClockingOut) {
            const requiredGeofences = employeeGeofences.filter(gf => gf.require_for_clock_in);
            if (requiredGeofences.length > 0 && !insideAnyGeofence) {
              canProceed = false;
              const nearestGeofence = checkResults
                .filter(r => requiredGeofences.some(gf => gf.id === r.geofence.id))
                .sort((a, b) => a.distance - b.distance)[0];
              
              if (nearestGeofence) {
                toast.error(
                  `You must be within ${formatDistance(nearestGeofence.geofence.radius_meters)} of ${nearestGeofence.geofence.name} to clock in. ` +
                  `You are ${formatDistance(nearestGeofence.distance)} away.`
                );
              }
            }
          }
          
          // Log geofence event
          if (insideAnyGeofence) {
            const insideGeofence = checkResults.find(r => r.isInside);
            await logGeofenceEvent({
              employee_id: session.employee.id,
              geofence_id: insideGeofence.geofence.id,
              event_type: isClockingOut ? 'CLOCK_OUT' : 'CLOCK_IN',
              latitude: location.latitude,
              longitude: location.longitude,
            });
          }
        }
      } catch (error) {
        console.error('Error capturing location:', error);
        toast.error('Could not get location. Continuing without it.');
      }
      setIsCapturingLocation(false);
    }
    
    if (!canProceed) {
      setIsClockingIn(false);
      return;
    }
    
    try {
      // Use the clock API directly
      console.log('🎯 [MobileTimesheet] Calling clock API...');
      
      const clockData = {
        location_enabled: !!locationData,
        ...(locationData && {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          location_accuracy: locationData.accuracy
        })
      };
      
      let result;
      if (isClockingOut) {
        console.log('🎯 [MobileTimesheet] Clocking out...');
        result = await timesheetApi.clockOut(clockData);
      } else {
        console.log('🎯 [MobileTimesheet] Clocking in...');
        result = await timesheetApi.clockIn(clockData);
      }
      
      console.log('🎯 [MobileTimesheet] Clock API result:', result);
      
      // Success! Refresh the timesheet data
      await loadTimesheetData();
      toast.success(isClockingOut ? 'Clocked out successfully' : 'Clocked in successfully');
    } catch (error) {
      console.error('Error clocking in/out:', error);
      toast.error('Failed to clock ' + (isClockingOut ? 'out' : 'in'));
    } finally {
      setIsClockingIn(false);
    }
  };
  
  // Save location log to backend
  const saveLocationLog = async (locationData) => {
    try {
      const response = await fetch('/api/hr/location-logs/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': session.tenantId,
        },
        body: JSON.stringify({
          employee: session.employee.id,
          ...locationData,
          captured_at: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to save location log');
      }
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };
  
  // Log geofence event
  const logGeofenceEvent = async (eventData) => {
    try {
      const response = await fetch('/api/hr/geofence-events/log_event/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': session.tenantId,
        },
        body: JSON.stringify(eventData),
      });
      
      if (!response.ok) {
        console.error('Failed to log geofence event');
      }
    } catch (error) {
      console.error('Error logging geofence event:', error);
    }
  };
  
  // Schedule random location check
  const scheduleRandomCheck = () => {
    // Clear any existing timeout
    if (randomCheckTimeoutRef.current) {
      clearTimeout(randomCheckTimeoutRef.current);
    }
    
    // Schedule random check between 30 minutes and 4 hours
    const minDelay = 30 * 60 * 1000; // 30 minutes
    const maxDelay = 4 * 60 * 60 * 1000; // 4 hours
    const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;
    
    randomCheckTimeoutRef.current = setTimeout(async () => {
      // Check if still clocked in
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayEntry = timesheetEntries[today];
      
      if (todayEntry && todayEntry.regular_hours > 0) {
        try {
          const location = await captureLocation();
          const address = await reverseGeocode(location.latitude, location.longitude);
          const deviceInfo = getDeviceInfo();
          
          await saveLocationLog({
            ...location,
            address,
            ...deviceInfo,
            location_type: 'RANDOM_CHECK',
            timesheet_entry: todayEntry.id,
          });
          
          toast('Location verified for timesheet', {
            icon: '📍',
            duration: 3000,
          });
          
          // Schedule next random check
          scheduleRandomCheck();
        } catch (error) {
          console.error('Random location check failed:', error);
        }
      }
    }, randomDelay);
  };
  
  // Handle location consent
  const handleLocationConsent = (accepted) => {
    setShowLocationConsent(false);
    if (accepted) {
      setLocationEnabled(true);
      // Retry clock in
      handleClockInOut();
    } else {
      setLocationEnabled(false);
      // Continue clock in without location
      setIsClockingIn(true);
      handleClockInOut();
    }
  };

  const updateTimesheetEntry = async (date, hours) => {
    const entry = timesheetEntries[date];
    const method = entry ? 'PUT' : 'POST';
    const url = entry ? 
      `/api/hr/timesheets/${currentTimesheet.id}/entries/${entry.id}/` : 
      `/api/hr/timesheets/${currentTimesheet.id}/entries/`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': session.tenantId,
      },
      body: JSON.stringify({
        timesheet: currentTimesheet.id,
        date,
        regular_hours: hours,
      }),
    });

    return response.ok;
  };

  const getTotalHoursThisWeek = () => {
    return Object.values(timesheetEntries).reduce((total, entry) => {
      return total + (entry.regular_hours || 0);
    }, 0);
  };

  const getTodayStatus = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayEntry = timesheetEntries[today];
    const hours = todayEntry?.regular_hours || 0;
    
    if (hours === 0) return { status: 'not_started', text: 'Not Clocked In', color: 'text-gray-500' };
    if (hours < 8) return { status: 'clocked_in', text: `Clocked In (${hours}h)`, color: 'text-green-600' };
    return { status: 'completed', text: `Completed (${hours}h)`, color: 'text-blue-600' };
  };

  if (loading || loadingEmployee || loadingTimesheet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">
            {loading ? 'Loading session...' : loadingEmployee ? 'Loading employee profile...' : 'Loading timesheet...'}
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to login
  }

  const todayStatus = getTodayStatus();
  const totalHours = getTotalHoursThisWeek();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900 ml-2">Timesheet</h1>
          </div>
        </div>
      </div>

      {/* Current Time Display */}
      <div className="px-4 py-6 bg-white mx-4 mt-4 rounded-xl shadow-sm">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-sm text-gray-500">
            {format(currentTime, 'EEEE, MMMM d, yyyy')}
          </div>
          <div className={`text-sm font-medium mt-2 ${todayStatus.color}`}>
            {todayStatus.text}
          </div>
          
          {/* Location indicator */}
          {locationEnabled && todayStatus.status === 'clocked_in' && (
            <div className="mt-3 flex items-center justify-center space-x-2">
              <MapPinIcon className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600">Location tracking active</span>
            </div>
          )}
          
          {/* Last clock in location */}
          {lastClockInLocation && todayStatus.status === 'clocked_in' && (
            <div className="mt-2 text-xs text-gray-500">
              Clocked in at: {formatLocation(lastClockInLocation)}
            </div>
          )}
        </div>
      </div>

      {/* Geofence Status */}
      {employeeGeofences.length > 0 && geofenceCheckResult && (
        <div className="px-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <MapPinIcon className="w-4 h-4" />
              Work Site Status
            </h3>
            {geofenceCheckResult.map((result, index) => (
              <div
                key={index}
                className={`text-sm flex items-center justify-between p-2 rounded ${
                  result.isInside
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                <span className="font-medium">{result.geofence.name}</span>
                <span className="text-xs">
                  {result.isInside
                    ? `✓ Inside (${formatDistance(result.distance)} from center)`
                    : `✗ ${formatDistance(result.distance)} away`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clock In/Out Button */}
      <div className="px-4 py-6">
        <button
          onClick={handleClockInOut}
          disabled={isClockingIn || isCapturingLocation}
          className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center space-x-2 transition-colors ${
            todayStatus.status === 'not_started' || todayStatus.status === 'clocked_in'
              ? todayStatus.status === 'not_started'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isClockingIn || isCapturingLocation ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              {isCapturingLocation && (
                <span className="text-sm">Getting location...</span>
              )}
            </div>
          ) : (
            <>
              {todayStatus.status === 'not_started' ? (
                <PlayIcon className="w-6 h-6" />
              ) : (
                <StopIcon className="w-6 h-6" />
              )}
              <span>
                {todayStatus.status === 'not_started' ? 'Clock In' : 'Clock Out'}
              </span>
              {locationEnabled && (
                <MapPinIcon className="w-4 h-4" />
              )}
            </>
          )}
        </button>
        
        {/* Location consent info */}
        {!locationEnabled && (
          <div className="mt-2 text-center">
            <button
              onClick={() => setShowLocationConsent(true)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center space-x-1 mx-auto"
            >
              <ShieldCheckIcon className="w-4 h-4" />
              <span>Enable location for better tracking</span>
            </button>
          </div>
        )}
      </div>

      {/* Weekly Summary */}
      <div className="px-4 pb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" />
            This Week
          </h3>
          
          <div className="space-y-3">
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const entry = timesheetEntries[dateStr];
              const hours = entry?.regular_hours || 0;
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              
              return (
                <div key={dateStr} className={`flex items-center justify-between py-2 px-3 rounded-lg ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-sm ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                      {format(day, 'MMM d')}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {hours}h
                    </span>
                    {hours > 0 && (
                      <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">Total Hours</span>
              <span className="font-bold text-lg text-blue-600">{totalHours}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-6">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push(`/${session.tenantId}/dashboard/timesheets`)}
            className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md transition-shadow"
          >
            <ClockIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">View All</div>
            <div className="text-xs text-gray-500">Timesheets</div>
          </button>
          
          <button
            onClick={() => router.push('/profile')}
            className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md transition-shadow"
          >
            <CalendarIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Profile</div>
            <div className="text-xs text-gray-500">Settings</div>
          </button>
        </div>
      </div>
      
      {/* Location Consent Dialog */}
      {showLocationConsent && (
        <LocationConsent
          onAccept={() => handleLocationConsent(true)}
          onDecline={() => handleLocationConsent(false)}
          showAlways={false}
          employeeId={session.employee?.id}
          tenantId={session.tenantId}
        />
      )}
    </div>
  );
}