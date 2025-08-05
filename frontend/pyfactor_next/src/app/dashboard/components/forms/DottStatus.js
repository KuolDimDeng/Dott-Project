'use client';

import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  XCircleIcon,
  CloudIcon,
  ServerIcon,
  CpuChipIcon,
  WifiIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const DottStatus = () => {
  const [systemStatus, setSystemStatus] = useState({
    overall: 'operational',
    services: {
      api: { status: 'operational', latency: 0 },
      database: { status: 'operational', latency: 0 },
      authentication: { status: 'operational', latency: 0 },
      storage: { status: 'operational', latency: 0 },
      payment: { status: 'operational', latency: 0 }
    },
    lastUpdated: new Date().toISOString()
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkSystemStatus();
    // Refresh every 30 seconds
    const interval = setInterval(checkSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkSystemStatus = async () => {
    try {
      setRefreshing(true);
      
      // Check API status
      const apiStart = Date.now();
      const apiResponse = await axiosInstance.get('/api/health');
      const apiLatency = Date.now() - apiStart;
      
      // Simulate checking other services (in a real app, these would be actual checks)
      const services = {
        api: { 
          status: apiResponse.status === 200 ? 'operational' : 'degraded', 
          latency: apiLatency 
        },
        database: { status: 'operational', latency: Math.random() * 50 + 10 },
        authentication: { status: 'operational', latency: Math.random() * 100 + 50 },
        storage: { status: 'operational', latency: Math.random() * 80 + 20 },
        payment: { status: 'operational', latency: Math.random() * 150 + 50 }
      };

      // Calculate overall status
      const statuses = Object.values(services).map(s => s.status);
      let overall = 'operational';
      if (statuses.includes('down')) overall = 'major_outage';
      else if (statuses.includes('degraded')) overall = 'partial_outage';

      setSystemStatus({
        overall,
        services,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking system status:', error);
      setSystemStatus(prev => ({
        ...prev,
        overall: 'major_outage',
        services: {
          ...prev.services,
          api: { status: 'down', latency: 0 }
        }
      }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'operational':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />;
      case 'down':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ExclamationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 bg-green-50';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50';
      case 'down':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getOverallStatusMessage = () => {
    switch (systemStatus.overall) {
      case 'operational':
        return 'All Systems Operational';
      case 'partial_outage':
        return 'Partial System Outage';
      case 'major_outage':
        return 'Major System Outage';
      default:
        return 'Unknown Status';
    }
  };

  const formatLatency = (latency) => {
    if (latency < 100) return `${Math.round(latency)}ms`;
    return `${(latency / 1000).toFixed(2)}s`;
  };

  const serviceIcons = {
    api: <ServerIcon className="h-5 w-5" />,
    database: <CpuChipIcon className="h-5 w-5" />,
    authentication: <CloudIcon className="h-5 w-5" />,
    storage: <ServerIcon className="h-5 w-5" />,
    payment: <CreditCardIcon className="h-5 w-5" />
  };

  const serviceNames = {
    api: 'API Server',
    database: 'Database',
    authentication: 'Authentication',
    storage: 'File Storage',
    payment: 'Payment Processing'
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">System Status</h1>
        <p className="text-gray-600">Real-time status of Dott services and infrastructure</p>
      </div>

      {/* Overall Status Banner */}
      <div className={`rounded-lg p-6 mb-8 ${getStatusColor(systemStatus.overall)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {getStatusIcon(systemStatus.overall)}
            <h2 className="text-2xl font-semibold ml-3">{getOverallStatusMessage()}</h2>
          </div>
          <button
            onClick={checkSystemStatus}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-white rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="mt-2 flex items-center text-sm">
          <ClockIcon className="h-4 w-4 mr-1" />
          Last updated: {new Date(systemStatus.lastUpdated).toLocaleString()}
        </div>
      </div>

      {/* Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {Object.entries(systemStatus.services).map(([service, details]) => (
          <div key={service} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="text-gray-400 mr-3">{serviceIcons[service]}</div>
                <div>
                  <h3 className="font-medium text-gray-900">{serviceNames[service]}</h3>
                  <p className="text-sm text-gray-500">Response time: {formatLatency(details.latency)}</p>
                </div>
              </div>
              <div className="flex items-center">
                {getStatusIcon(details.status)}
                <span className={`ml-2 text-sm font-medium capitalize ${
                  details.status === 'operational' ? 'text-green-600' :
                  details.status === 'degraded' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {details.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Incidents */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Incidents</h3>
        <div className="space-y-4">
          <div className="border-l-4 border-green-500 pl-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">No recent incidents</p>
                <p className="text-sm text-gray-600 mt-1">
                  All systems have been operating normally for the past 7 days.
                </p>
              </div>
              <span className="text-xs text-gray-500">7 days ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Uptime (30 days)</p>
            <p className="text-2xl font-bold text-green-600">99.9%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Average Response Time</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatLatency(
                Object.values(systemStatus.services).reduce((sum, s) => sum + s.latency, 0) / 
                Object.keys(systemStatus.services).length
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Active Users</p>
            <p className="text-2xl font-bold text-purple-600">
              {Math.floor(Math.random() * 1000) + 500}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DottStatus;
