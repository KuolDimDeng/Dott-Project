import React, { useState, useEffect } from 'react';
import { jobService } from '@/services/jobService';
import { logger } from '@/utils/logger';
import SignatureModal from './SignatureModal';
import MaterialTrackingModal from './MaterialTrackingModal';
import { 
  MapPinIcon,
  ClockIcon,
  CameraIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  StopIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  SignalIcon,
  WifiIcon
} from '@heroicons/react/24/outline';

const MobileJobApp = () => {
  const [jobs, setJobs] = useState([]);
  const [currentJob, setCurrentJob] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeTimer, setActiveTimer] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mobile-specific states
  const [checkedInJobs, setCheckedInJobs] = useState(new Set());
  const [jobPhotos, setJobPhotos] = useState({});
  const [jobNotes, setJobNotes] = useState({});
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentSignatureJobId, setCurrentSignatureJobId] = useState(null);
  const [voiceRecording, setVoiceRecording] = useState(null);
  const [materialUsage, setMaterialUsage] = useState({});
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [currentMaterialJobId, setCurrentMaterialJobId] = useState(null);

  useEffect(() => {
    fetchTodaysJobs();
    getCurrentLocation();
    loadOfflineData();
    
    // Setup online/offline detection
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData(); // Auto-sync when coming back online
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchTodaysJobs = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const jobsData = await jobService.getJobs({ 
        scheduled_date: today,
        status: ['scheduled', 'in_progress']
      });
      setJobs(jobsData);
    } catch (error) {
      logger.error('Error fetching jobs:', error);
      // Use cached data if offline
      if (!isOnline) {
        const cachedJobs = localStorage.getItem('mobile_jobs_cache');
        if (cachedJobs) {
          setJobs(JSON.parse(cachedJobs));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          logger.error('Error getting location:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    }
  };

  const handleCheckIn = async (job) => {
    try {
      // Update job status to in_progress
      await jobService.updateJob(job.id, { 
        status: 'in_progress',
        start_date: new Date().toISOString().split('T')[0]
      });
      
      // Add location if available
      if (currentLocation) {
        await jobService.addJobLabor(job.id, {
          employee: job.assigned_to?.id,
          work_date: new Date().toISOString().split('T')[0],
          hours: 0,
          hourly_rate: job.labor_rate || 50,
          work_description: 'Checked in to job site',
          location_lat: currentLocation.latitude,
          location_lng: currentLocation.longitude
        });
      }
      
      setCheckedInJobs(prev => new Set(prev).add(job.id));
      setCurrentJob(job);
      
      // Start timer
      setActiveTimer({
        jobId: job.id,
        startTime: Date.now(),
        totalTime: 0
      });
      
    } catch (error) {
      logger.error('Error checking in:', error);
      alert('Failed to check in. Please try again.');
    }
  };

  const handleCheckOut = async (job) => {
    if (activeTimer && activeTimer.jobId === job.id) {
      const totalHours = (Date.now() - activeTimer.startTime + activeTimer.totalTime) / (1000 * 60 * 60);
      
      try {
        // Log the hours worked
        await jobService.addJobLabor(job.id, {
          employee: job.assigned_to?.id,
          work_date: new Date().toISOString().split('T')[0],
          hours: totalHours.toFixed(2),
          hourly_rate: job.labor_rate || 50,
          work_description: jobNotes[job.id] || 'Work completed',
          is_billable: true
        });
        
        setCheckedInJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(job.id);
          return newSet;
        });
        
        setActiveTimer(null);
        setCurrentJob(null);
        
        alert(`Checked out successfully! Time worked: ${totalHours.toFixed(2)} hours`);
        
      } catch (error) {
        logger.error('Error checking out:', error);
        alert('Failed to check out. Please try again.');
      }
    }
  };

  const handlePhotoCapture = async (jobId) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Use rear camera
      
      input.onchange = async (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setJobPhotos(prev => ({
              ...prev,
              [jobId]: [...(prev[jobId] || []), {
                id: Date.now(),
                src: e.target.result,
                timestamp: new Date().toISOString(),
                location: currentLocation
              }]
            }));
            
            // Store in localStorage for offline access
            const photos = jobPhotos[jobId] || [];
            localStorage.setItem(`job_photos_${jobId}`, JSON.stringify(photos));
          };
          reader.readAsDataURL(file);
        }
      };
      
      input.click();
    } catch (error) {
      logger.error('Error capturing photo:', error);
    }
  };

  // ========== OFFLINE DATA SYNC ==========

  const loadOfflineData = () => {
    try {
      const savedQueue = localStorage.getItem('mobile_offline_queue');
      if (savedQueue) {
        setOfflineQueue(JSON.parse(savedQueue));
      }
      
      const savedNotes = localStorage.getItem('mobile_job_notes');
      if (savedNotes) {
        setJobNotes(JSON.parse(savedNotes));
      }
      
      const savedMaterials = localStorage.getItem('mobile_material_usage');
      if (savedMaterials) {
        setMaterialUsage(JSON.parse(savedMaterials));
      }
    } catch (error) {
      logger.error('Error loading offline data:', error);
    }
  };

  const queueOfflineAction = (action) => {
    const newQueue = [...offlineQueue, {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...action
    }];
    setOfflineQueue(newQueue);
    localStorage.setItem('mobile_offline_queue', JSON.stringify(newQueue));
  };

  const syncOfflineData = async () => {
    if (offlineQueue.length === 0 || syncInProgress) return;
    
    setSyncInProgress(true);
    let successCount = 0;
    
    try {
      for (const action of offlineQueue) {
        try {
          switch (action.type) {
            case 'check_in':
              await jobService.updateJob(action.jobId, {
                status: 'in_progress',
                start_date: action.data.start_date
              });
              if (action.data.location) {
                await jobService.addJobLabor(action.jobId, action.data.labor);
              }
              break;
            case 'check_out':
              await jobService.addJobLabor(action.jobId, action.data.labor);
              break;
            case 'status_update':
              await jobService.updateJob(action.jobId, { status: action.data.status });
              break;
            case 'add_note':
              await jobService.addJobLabor(action.jobId, {
                employee: action.data.employee,
                work_date: action.data.work_date,
                hours: 0,
                hourly_rate: 0,
                work_description: action.data.note,
                is_billable: false
              });
              break;
            case 'add_material':
              await jobService.addJobMaterial(action.jobId, action.data.material);
              break;
            default:
              logger.warn('Unknown offline action type:', action.type);
          }
          successCount++;
        } catch (error) {
          logger.error('Error syncing action:', action, error);
        }
      }
      
      // Clear successfully synced items
      const remainingQueue = offlineQueue.slice(successCount);
      setOfflineQueue(remainingQueue);
      localStorage.setItem('mobile_offline_queue', JSON.stringify(remainingQueue));
      
      if (successCount > 0) {
        alert(`Synced ${successCount} offline actions successfully!`);
        fetchTodaysJobs(); // Refresh data
      }
    } catch (error) {
      logger.error('Error during offline sync:', error);
    } finally {
      setSyncInProgress(false);
    }
  };

  // ========== SIGNATURE CAPTURE ==========

  const handleSignatureCapture = (jobId) => {
    setCurrentSignatureJobId(jobId);
    setShowSignatureModal(true);
  };

  const saveSignature = (signatureData) => {
    try {
      const signatures = JSON.parse(localStorage.getItem('job_signatures') || '{}');
      signatures[currentSignatureJobId] = {
        signature: signatureData,
        timestamp: new Date().toISOString(),
        customerName: jobs.find(j => j.id === currentSignatureJobId)?.customer?.name
      };
      localStorage.setItem('job_signatures', JSON.stringify(signatures));
      
      setShowSignatureModal(false);
      setCurrentSignatureJobId(null);
      alert('Customer signature saved successfully!');
    } catch (error) {
      logger.error('Error saving signature:', error);
      alert('Failed to save signature. Please try again.');
    }
  };

  // ========== VOICE NOTES ==========

  const startVoiceRecording = async (jobId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onload = () => {
          const voiceNotes = JSON.parse(localStorage.getItem('job_voice_notes') || '{}');
          voiceNotes[jobId] = voiceNotes[jobId] || [];
          voiceNotes[jobId].push({
            id: Date.now(),
            audio: reader.result,
            timestamp: new Date().toISOString(),
            duration: Date.now() - voiceRecording.startTime
          });
          localStorage.setItem('job_voice_notes', JSON.stringify(voiceNotes));
          alert('Voice note saved successfully!');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setVoiceRecording({
        recorder: mediaRecorder,
        jobId,
        startTime: Date.now()
      });
    } catch (error) {
      logger.error('Error starting voice recording:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (voiceRecording) {
      voiceRecording.recorder.stop();
      setVoiceRecording(null);
    }
  };

  // ========== MATERIAL USAGE TRACKING ==========

  const handleMaterialTracking = (jobId) => {
    setCurrentMaterialJobId(jobId);
    setShowMaterialModal(true);
  };

  const saveMaterialUsage = async (jobId, materials) => {
    try {
      // Save materials to job
      for (const material of materials) {
        if (isOnline) {
          await jobService.addJobMaterial(jobId, material);
        } else {
          queueOfflineAction({
            type: 'add_material',
            jobId,
            data: { material }
          });
        }
      }
      
      // Update local usage tracking
      const usage = { ...materialUsage };
      usage[jobId] = [...(usage[jobId] || []), ...materials.map(m => ({
        id: Date.now() + Math.random(),
        ...m,
        timestamp: new Date().toISOString()
      }))];
      setMaterialUsage(usage);
      localStorage.setItem('mobile_material_usage', JSON.stringify(usage));
      
      setShowMaterialModal(false);
      setCurrentMaterialJobId(null);
      
      const totalValue = materials.reduce((sum, m) => sum + (m.quantity * m.unit_price), 0);
      alert(`${materials.length} materials logged! Total value: $${totalValue.toFixed(2)}`);
    } catch (error) {
      console.error('Error saving materials:', error);
      alert('Failed to save materials. Please try again.');
    }
  };

  const addMaterialUsage = (jobId, materialData) => {
    handleMaterialTracking(jobId);
  };

  // ========== ENHANCED OFFLINE ACTIONS ==========

  const handleOfflineCheckIn = (job) => {
    if (!isOnline) {
      queueOfflineAction({
        type: 'check_in',
        jobId: job.id,
        data: {
          start_date: new Date().toISOString().split('T')[0],
          location: currentLocation,
          labor: {
            employee: job.assigned_to?.id,
            work_date: new Date().toISOString().split('T')[0],
            hours: 0,
            hourly_rate: job.labor_rate || 50,
            work_description: 'Checked in to job site (offline)',
            location_lat: currentLocation?.latitude,
            location_lng: currentLocation?.longitude
          }
        }
      });
      
      setCheckedInJobs(prev => new Set(prev).add(job.id));
      setCurrentJob(job);
      setActiveTimer({
        jobId: job.id,
        startTime: Date.now(),
        totalTime: 0
      });
      alert('Checked in offline. Will sync when connection is restored.');
    } else {
      handleCheckIn(job);
    }
  };

  const handleOfflineCheckOut = (job) => {
    if (activeTimer && activeTimer.jobId === job.id) {
      const totalHours = (Date.now() - activeTimer.startTime + activeTimer.totalTime) / (1000 * 60 * 60);
      
      if (!isOnline) {
        queueOfflineAction({
          type: 'check_out',
          jobId: job.id,
          data: {
            labor: {
              employee: job.assigned_to?.id,
              work_date: new Date().toISOString().split('T')[0],
              hours: totalHours.toFixed(2),
              hourly_rate: job.labor_rate || 50,
              work_description: jobNotes[job.id] || 'Work completed (offline)',
              is_billable: true
            }
          }
        });
        
        setCheckedInJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(job.id);
          return newSet;
        });
        setActiveTimer(null);
        setCurrentJob(null);
        alert(`Checked out offline! Time worked: ${totalHours.toFixed(2)} hours. Will sync when connection is restored.`);
      } else {
        handleCheckOut(job);
      }
    }
  };

  const handleStatusUpdate = async (jobId, newStatus) => {
    try {
      await jobService.updateJob(jobId, { status: newStatus });
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: newStatus } : job
      ));
    } catch (error) {
      logger.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatTime = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Field Jobs</h1>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <WifiIcon className="h-5 w-5 text-green-300" />
            ) : (
              <SignalIcon className="h-5 w-5 text-red-300" />
            )}
            <span className="text-sm">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        
        {activeTimer && (
          <div className="mt-2 bg-blue-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Working on Job</span>
              <span className="text-lg font-mono">
                {formatTime(Date.now() - activeTimer.startTime + activeTimer.totalTime)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Jobs List */}
      <div className="p-4 space-y-4">
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600">No jobs scheduled for today</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Job Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{job.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{job.job_number}</p>
                    <p className="text-sm text-gray-600">{job.customer?.name}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(job.status)}`}>
                    {job.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Job Details */}
              <div className="p-4 space-y-3">
                {/* Location */}
                {job.customer?.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPinIcon className="h-4 w-4" />
                    <span>{job.customer.address}</span>
                  </div>
                )}

                {/* Scheduled Time */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ClockIcon className="h-4 w-4" />
                  <span>Scheduled: {new Date(job.scheduled_date).toLocaleDateString()}</span>
                </div>

                {/* Description */}
                {job.description && (
                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                    {job.description}
                  </p>
                )}

                {/* Photos */}
                {jobPhotos[job.id] && jobPhotos[job.id].length > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {jobPhotos[job.id].map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.src}
                        alt="Job photo"
                        className="h-16 w-16 object-cover rounded border"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-gray-100">
                {!checkedInJobs.has(job.id) ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOfflineCheckIn(job)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <PlayIcon className="h-4 w-4" />
                      Check In
                    </button>
                    <button
                      onClick={() => window.open(`tel:${job.customer?.phone}`, '_self')}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <PhoneIcon className="h-4 w-4" />
                      Call
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Notes Input */}
                    <textarea
                      placeholder="Add work notes..."
                      value={jobNotes[job.id] || ''}
                      onChange={(e) => setJobNotes(prev => ({ ...prev, [job.id]: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      rows="2"
                    />
                    
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        onClick={() => handlePhotoCapture(job.id)}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-600 text-white rounded text-sm"
                      >
                        <CameraIcon className="h-4 w-4" />
                        Photo
                      </button>
                      <button
                        onClick={() => handleSignatureCapture(job.id)}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-600 text-white rounded text-sm"
                      >
                        <span className="text-sm">✍️</span>
                        Signature
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        onClick={() => voiceRecording?.jobId === job.id ? stopVoiceRecording() : startVoiceRecording(job.id)}
                        className={`flex items-center justify-center gap-1 px-3 py-2 rounded text-sm ${
                          voiceRecording?.jobId === job.id 
                            ? 'bg-red-600 text-white animate-pulse' 
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        <span className="text-sm">🎤</span>
                        {voiceRecording?.jobId === job.id ? 'Stop' : 'Voice'}
                      </button>
                      <button
                        onClick={() => handleMaterialTracking(job.id)}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-orange-600 text-white rounded text-sm"
                      >
                        <span className="text-sm">📦</span>
                        Material
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleStatusUpdate(job.id, 'completed')}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded text-sm"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        Complete
                      </button>
                      <button
                        onClick={() => handleOfflineCheckOut(job)}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white rounded text-sm"
                      >
                        <StopIcon className="h-4 w-4" />
                        Check Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Offline Status & Sync */}
      {!isOnline && (
        <div className="fixed bottom-20 left-4 right-4 bg-yellow-100 border border-yellow-400 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-yellow-800 text-sm font-medium">📱 Working Offline</span>
              {offlineQueue.length > 0 && (
                <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full text-xs">
                  {offlineQueue.length} pending
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sync Button */}
      {isOnline && offlineQueue.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 bg-blue-100 border border-blue-400 rounded-lg p-3">
          <button
            onClick={syncOfflineData}
            disabled={syncInProgress}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {syncInProgress ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <span>🔄</span>
            )}
            Sync {offlineQueue.length} Offline Actions
          </button>
        </div>
      )}

      {/* Quick Actions FAB */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={getCurrentLocation}
          className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700"
          title="Update Location"
        >
          <MapPinIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <SignatureModal
          jobId={currentSignatureJobId}
          customerName={jobs.find(j => j.id === currentSignatureJobId)?.customer?.name}
          onSave={saveSignature}
          onClose={() => {
            setShowSignatureModal(false);
            setCurrentSignatureJobId(null);
          }}
        />
      )}

      {/* Material Tracking Modal */}
      {showMaterialModal && (
        <MaterialTrackingModal
          jobId={currentMaterialJobId}
          customerName={jobs.find(j => j.id === currentMaterialJobId)?.customer?.name}
          onSave={(materials) => saveMaterialUsage(currentMaterialJobId, materials)}
          onClose={() => {
            setShowMaterialModal(false);
            setCurrentMaterialJobId(null);
          }}
        />
      )}
    </div>
  );
};

export default MobileJobApp;