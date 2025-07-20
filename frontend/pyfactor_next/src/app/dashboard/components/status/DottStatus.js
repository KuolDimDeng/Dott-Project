'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
  SignalIcon
} from '@heroicons/react/24/outline';
import StandardSpinner, { CenteredSpinner } from '@/components/ui/StandardSpinner';

// Error boundary to catch and handle component errors
class StatusErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('DottStatus Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Status Page Error
            </h2>
            <p className="text-red-600">
              Unable to load the status page. Please try refreshing.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const DottStatusContent = () => {
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Service configuration is now fetched from API

  useEffect(() => {
    fetchServiceStatus();
    // Refresh status every 5 minutes
    const interval = setInterval(fetchServiceStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchServiceStatus = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/status/check', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      const data = await response.json();
      setServices(data.services || []);
      setLastUpdated(new Date(data.lastUpdated));
    } catch (error) {
      console.error('Error fetching service status:', error);
      // Show error state with some default services
      setServices([
        {
          id: 'frontend',
          name: 'Dott Frontend',
          description: 'Main application interface',
          status: 'unknown',
          uptime: 'Unknown',
          responseTime: 'N/A',
          lastChecked: new Date().toISOString()
        },
        {
          id: 'backend',
          name: 'Dott API',
          description: 'Backend services and API',
          status: 'unknown',
          uptime: 'Unknown',
          responseTime: 'N/A',
          lastChecked: new Date().toISOString()
        }
      ]);
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

  const getOverallStatus = () => {
    if (services.length === 0) return 'unknown';
    
    const hasOutage = services.some(s => s.status === 'outage');
    const hasDegraded = services.some(s => s.status === 'degraded');
    
    if (hasOutage) return 'outage';
    if (hasDegraded) return 'degraded';
    return 'operational';
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

  const overallStatus = getOverallStatus();

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-black mb-4 flex items-center">
              <SignalIcon className="h-6 w-6 text-blue-600 mr-2" />
              {t('status.title', 'Dott Status')}
            </h1>
            <p className="text-gray-600">{t('status.subtitle', 'Current system status and uptime monitoring')}</p>
          </div>
          
          <button
            onClick={fetchServiceStatus}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
          >
            {loading ? (
              <>
                <StandardSpinner size="small" color="white" className="inline mr-2" />
                {t('status.refreshing', 'Refreshing...')}
              </>
            ) : (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                {t('status.refresh', 'Refresh')}
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
                {overallStatus === 'operational' ? t('status.overall.operational', 'All Systems Operational') :
                 overallStatus === 'degraded' ? t('status.overall.degraded', 'Some Systems Experiencing Issues') :
                 overallStatus === 'outage' ? t('status.overall.outage', 'Service Outage Detected') :
                 t('status.overall.unknown', 'System Status Unknown')}
              </h2>
              <p className="text-gray-600">
                {t('status.lastUpdated', 'Last updated')}: {formatTime(lastUpdated)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t('status.serviceStatus.title', 'Service Status')}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {t('status.serviceStatus.description', 'Uptime over the past 90 days. Monitoring all critical services.')}
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {loading && services.length === 0 ? (
            <CenteredSpinner 
              size="default" 
              text={t('status.checking', 'Checking service status...')} 
              showText={true}
              minHeight="h-32"
            />
          ) : (
            services.map((service) => (
              <div key={service.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(service.status)}
                    <div className="ml-4">
                      <div className="flex items-center">
                        <h4 className="text-lg font-medium text-gray-900">{service.name}</h4>
                        {service.url && (
                          <a
                            href={service.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-gray-400 hover:text-blue-600"
                          >
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{service.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{service.uptime} {t('status.uptime', 'uptime')}</div>
                      <div className="text-sm text-gray-500">{t('status.duration', '90 days')}</div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{service.responseTime}</div>
                      <div className="text-sm text-gray-500">{t('status.responseTime', 'Response time')}</div>
                    </div>
                    
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(service.status)}`}>
                      {service.status === 'operational' ? t('status.state.operational', 'Operational') :
                       service.status === 'degraded' ? t('status.state.degraded', 'Degraded') :
                       service.status === 'outage' ? t('status.state.outage', 'Outage') :
                       t('status.state.unknown', 'Unknown')}
                    </div>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>{t('status.timeline.past', '90 days ago')}</span>
                    <span>{t('status.timeline.today', 'Today')}</span>
                  </div>
                  <div className="w-full h-8 bg-gray-100 rounded">
                    <div 
                      className={`h-full rounded ${
                        service.status === 'operational' ? 'bg-green-500' :
                        service.status === 'degraded' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: service.status === 'operational' ? '99%' : '85%' }}
                    ></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">About Our Monitoring</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Status checks run every 5 minutes</li>
            <li>• Response times measured from multiple locations</li>
            <li>• Historical data stored for 90 days</li>
            <li>• Automatic alerts for service disruptions</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-gray-900">Support Email:</span>
              <br />
              <a href="mailto:support@dottapps.com" className="text-blue-600 hover:text-blue-800">
                support@dottapps.com
              </a>
            </div>
            <div>
              <span className="font-medium text-gray-900">Status Updates:</span>
              <br />
              <span className="text-gray-600">Follow us for real-time updates on service status</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrap the component with error boundary
const DottStatus = () => (
  <StatusErrorBoundary>
    <DottStatusContent />
  </StatusErrorBoundary>
);

export default DottStatus;