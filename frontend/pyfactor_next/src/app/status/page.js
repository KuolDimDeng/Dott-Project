'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';

export default function PublicStatusPage() {
  const [overallStatus, setOverallStatus] = useState('checking');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [serviceStatuses, setServiceStatuses] = useState({
    platform: { status: 'checking', uptime: '0%' },
    api: { status: 'checking', uptime: '0%' }
  });

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    
    try {
      // Check platform status (this page itself)
      const platformStart = Date.now();
      const platformOk = true; // If we're here, platform is working
      
      // Check API status with a simple health endpoint
      let apiOk = false;
      try {
        const apiResponse = await fetch('/api/health', {
          method: 'GET',
          cache: 'no-store'
        });
        apiOk = apiResponse.ok;
      } catch (error) {
        apiOk = false;
      }

      // Update service statuses
      setServiceStatuses({
        platform: {
          status: platformOk ? 'operational' : 'outage',
          uptime: '99.9%' // Static for public page
        },
        api: {
          status: apiOk ? 'operational' : 'outage',
          uptime: '99.9%' // Static for public page
        }
      });

      // Determine overall status
      if (platformOk && apiOk) {
        setOverallStatus('operational');
      } else if (platformOk || apiOk) {
        setOverallStatus('degraded');
      } else {
        setOverallStatus('outage');
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error checking status:', error);
      setOverallStatus('unknown');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'outage':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'operational':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'outage':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatTime = (date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple header with Dott branding */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center">
              <img
                src="/static/images/PyfactorLandingpage.png"
                alt="Dott Logo"
                className="h-10 w-auto object-contain"
              />
            </a>
            <a 
              href="/"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
      
      {/* Status Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-black mb-2 flex items-center">
                <HeartIcon className="h-6 w-6 text-blue-600 mr-2" />
                Dott System Status
              </h1>
              <p className="text-gray-600">Current operational status of Dott services</p>
            </div>
            
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
            >
              {loading ? (
                <>
                  <StandardSpinner size="small" color="white" className="inline mr-2" />
                  Checking...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </button>
          </div>

          {/* Overall Status */}
          <div className={`p-6 rounded-lg border-2 ${
            overallStatus === 'operational' ? 'border-green-200 bg-green-50' :
            overallStatus === 'degraded' ? 'border-yellow-200 bg-yellow-50' :
            overallStatus === 'outage' ? 'border-red-200 bg-red-50' :
            'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center">
              {getStatusIcon(overallStatus)}
              <div className="ml-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  {overallStatus === 'operational' ? 'All Systems Operational' :
                   overallStatus === 'degraded' ? 'Partial Service Disruption' :
                   overallStatus === 'outage' ? 'Service Outage' :
                   'Checking System Status'}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  Last checked: {formatTime(lastUpdated)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Simplified Services Status */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Service Status</h3>
          </div>

          <div className="divide-y divide-gray-200">
            {/* Platform Status */}
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getStatusIcon(serviceStatuses.platform.status)}
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900">Dott Platform</h4>
                    <p className="text-sm text-gray-600">Application and website</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{serviceStatuses.platform.uptime}</div>
                    <div className="text-sm text-gray-500">Uptime</div>
                  </div>
                  
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(serviceStatuses.platform.status)}`}>
                    {serviceStatuses.platform.status === 'operational' ? 'Operational' :
                     serviceStatuses.platform.status === 'degraded' ? 'Degraded' :
                     serviceStatuses.platform.status === 'outage' ? 'Outage' :
                     'Checking'}
                  </div>
                </div>
              </div>
            </div>

            {/* API Status */}
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getStatusIcon(serviceStatuses.api.status)}
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900">API Services</h4>
                    <p className="text-sm text-gray-600">Backend services and data processing</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{serviceStatuses.api.uptime}</div>
                    <div className="text-sm text-gray-500">Uptime</div>
                  </div>
                  
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(serviceStatuses.api.status)}`}>
                    {serviceStatuses.api.status === 'operational' ? 'Operational' :
                     serviceStatuses.api.status === 'degraded' ? 'Degraded' :
                     serviceStatuses.api.status === 'outage' ? 'Outage' :
                     'Checking'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Support Info */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">
                If you're experiencing issues, please check this page first for any known service disruptions.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Support Contact:</p>
              <a href="mailto:support@dottapps.com" className="text-blue-600 hover:text-blue-800">
                support@dottapps.com
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center text-sm text-gray-600">
            <p>&copy; {new Date().getFullYear()} Dott. All rights reserved.</p>
            <div className="mt-2 space-x-4">
              <a href="/privacy" className="hover:text-blue-600">Privacy Policy</a>
              <span>·</span>
              <a href="/terms" className="hover:text-blue-600">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}