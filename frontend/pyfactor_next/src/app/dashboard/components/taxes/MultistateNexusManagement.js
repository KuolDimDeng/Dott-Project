'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { apiService } from '@/services/apiService';
import { StandardSpinner } from '@/components/ui/StandardSpinner';

// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="cursor-help"
      >
        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      
      {showTooltip && (
        <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-4`}>
                <div className={`${position === 'top' ? '' : 'rotate-180'}`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Multi-state Nexus Management Component
 * Comprehensive tool for managing nexus across multiple states
 */
const MultistateNexusManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [nexusProfile, setNexusProfile] = useState(null);
  const [stateNexusStatuses, setStateNexusStatuses] = useState([]);
  const [businessActivities, setBusinessActivities] = useState([]);
  const [thresholdAlerts, setThresholdAlerts] = useState([]);
  const [apportionmentFactors, setApportionmentFactors] = useState([]);
  
  // Form states
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showNexusAnalysis, setShowNexusAnalysis] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);

  const loadNexusData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load nexus profiles
      const profilesResponse = await apiService.get('/api/taxes/multistate/nexus-profiles/');
      if (profilesResponse.data?.length > 0) {
        const profile = profilesResponse.data[0]; // Use first profile
        setNexusProfile(profile);
        
        // Load related data
        const [statusResponse, activitiesResponse, alertsResponse, factorsResponse] = await Promise.all([
          apiService.get('/api/taxes/multistate/nexus-status/'),
          apiService.get('/api/taxes/multistate/business-activities/'),
          apiService.get('/api/taxes/multistate/threshold-monitoring/'),
          apiService.get('/api/taxes/multistate/apportionment-factors/')
        ]);
        
        setStateNexusStatuses(statusResponse.data || []);
        setBusinessActivities(activitiesResponse.data || []);
        setThresholdAlerts(alertsResponse.data || []);
        setApportionmentFactors(factorsResponse.data || []);
      } else {
        setShowCreateProfile(true);
      }
    } catch (error) {
      console.error('Error loading nexus data:', error);
      toast.error('Failed to load nexus data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNexusData();
  }, [loadNexusData]);

  const handleCreateProfile = async (profileData) => {
    try {
      const response = await apiService.post('/api/taxes/multistate/nexus-profiles/', profileData);
      setNexusProfile(response.data);
      setShowCreateProfile(false);
      toast.success('Nexus profile created successfully');
      loadNexusData();
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create nexus profile');
    }
  };

  const handleAddActivity = async (activityData) => {
    try {
      const response = await apiService.post('/api/taxes/multistate/business-activities/', {
        ...activityData,
        nexus_profile: nexusProfile.id
      });
      setBusinessActivities([...businessActivities, response.data]);
      setShowAddActivity(false);
      toast.success('Business activity added successfully');
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to add business activity');
    }
  };

  const handleNexusAnalysis = async (analysisData) => {
    try {
      setLoading(true);
      const response = await apiService.post(`/api/taxes/multistate/nexus-profiles/${nexusProfile.id}/analyze_nexus/`, analysisData);
      
      toast.success('Nexus analysis completed');
      setShowNexusAnalysis(false);
      loadNexusData(); // Refresh data to show updated nexus statuses
    } catch (error) {
      console.error('Error performing nexus analysis:', error);
      toast.error('Failed to perform nexus analysis');
    } finally {
      setLoading(false);
    }
  };

  const StateCard = ({ state, status }) => {
    const hasNexus = status?.has_nexus;
    const isRegistered = status?.is_registered;
    
    return (
      <div className={`border rounded-lg p-4 ${hasNexus ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <MapPinIcon className="h-5 w-5 text-gray-500 mr-2" />
            <span className="font-semibold text-gray-900">{state}</span>
          </div>
          {hasNexus && (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              isRegistered ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {isRegistered ? 'Registered' : 'Registration Required'}
            </span>
          )}
        </div>
        
        {status && (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Sales Tax Nexus:</span>
              <span className={hasNexus ? 'text-red-600 font-medium' : 'text-green-600'}>
                {hasNexus ? 'Yes' : 'No'}
              </span>
            </div>
            {status.current_sales > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Current Sales:</span>
                <span className="text-gray-900">${status.current_sales?.toLocaleString()}</span>
              </div>
            )}
            {status.sales_threshold && (
              <div className="flex justify-between">
                <span className="text-gray-600">Threshold:</span>
                <span className="text-gray-900">${status.sales_threshold?.toLocaleString()}</span>
              </div>
            )}
            {status.current_transactions > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Transactions:</span>
                <span className="text-gray-900">{status.current_transactions}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <StandardSpinner size="large" />
      </div>
    );
  }

  if (!nexusProfile && showCreateProfile) {
    return <CreateNexusProfileForm onSubmit={handleCreateProfile} onCancel={() => setShowCreateProfile(false)} />;
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'states', name: 'State Nexus', icon: MapPinIcon },
    { id: 'activities', name: 'Business Activities', icon: BuildingOfficeIcon },
    { id: 'monitoring', name: 'Threshold Monitoring', icon: ExclamationTriangleIcon },
    { id: 'apportionment', name: 'Apportionment', icon: DocumentTextIcon },
    { id: 'analysis', name: 'Analysis Tools', icon: ChartBarIcon }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black mb-2 flex items-center">
              <MapPinIcon className="h-6 w-6 text-blue-600 mr-2" />
              Multi-State Nexus Management
            </h1>
            <p className="text-gray-600">
              Manage nexus obligations across multiple states for {nexusProfile?.business_name}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowNexusAnalysis(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              Run Analysis
            </button>
            <button
              onClick={() => setShowAddActivity(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Activity
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab 
          nexusProfile={nexusProfile}
          stateNexusStatuses={stateNexusStatuses}
          thresholdAlerts={thresholdAlerts}
          businessActivities={businessActivities}
        />
      )}

      {activeTab === 'states' && (
        <StatesTab 
          stateNexusStatuses={stateNexusStatuses}
          onRefresh={loadNexusData}
        />
      )}

      {activeTab === 'activities' && (
        <ActivitiesTab 
          businessActivities={businessActivities}
          nexusProfile={nexusProfile}
          onRefresh={loadNexusData}
        />
      )}

      {activeTab === 'monitoring' && (
        <MonitoringTab 
          thresholdAlerts={thresholdAlerts}
          onRefresh={loadNexusData}
        />
      )}

      {activeTab === 'apportionment' && (
        <ApportionmentTab 
          apportionmentFactors={apportionmentFactors}
          nexusProfile={nexusProfile}
          onRefresh={loadNexusData}
        />
      )}

      {activeTab === 'analysis' && (
        <AnalysisTab 
          nexusProfile={nexusProfile}
          onRefresh={loadNexusData}
        />
      )}

      {/* Modals */}
      {showAddActivity && (
        <AddActivityModal
          onSubmit={handleAddActivity}
          onCancel={() => setShowAddActivity(false)}
        />
      )}

      {showNexusAnalysis && (
        <NexusAnalysisModal
          nexusProfile={nexusProfile}
          onSubmit={handleNexusAnalysis}
          onCancel={() => setShowNexusAnalysis(false)}
        />
      )}
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ nexusProfile, stateNexusStatuses, thresholdAlerts, businessActivities }) => {
  const nexusStates = stateNexusStatuses.filter(status => status.has_nexus);
  const unregisteredStates = nexusStates.filter(status => !status.is_registered);
  const activeAlerts = thresholdAlerts.filter(alert => alert.is_active && !alert.acknowledged);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <MapPinIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">States with Nexus</p>
              <p className="text-2xl font-bold text-gray-900">{nexusStates.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Registration Required</p>
              <p className="text-2xl font-bold text-gray-900">{unregisteredStates.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Business Activities</p>
              <p className="text-2xl font-bold text-gray-900">{businessActivities.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{activeAlerts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-yellow-800 mb-4">Active Threshold Alerts</h3>
          <div className="space-y-3">
            {activeAlerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                <div>
                  <p className="font-medium text-gray-900">{alert.state} - {alert.alert_type}</p>
                  <p className="text-sm text-gray-600">{alert.message}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  alert.priority === 'high' ? 'bg-red-100 text-red-800' :
                  alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {alert.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Business Activities */}
      {businessActivities.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Business Activities</h3>
          <div className="space-y-3">
            {businessActivities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{activity.activity_type} in {activity.state}</p>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Started: {new Date(activity.start_date).toLocaleDateString()}</p>
                  {activity.creates_nexus && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Creates Nexus</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// States Tab Component  
const StatesTab = ({ stateNexusStatuses, onRefresh }) => {
  const stateGroups = stateNexusStatuses.reduce((groups, status) => {
    if (!groups[status.state]) {
      groups[status.state] = {};
    }
    groups[status.state][status.tax_type] = status;
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(stateGroups).map(([state, statuses]) => (
          <StateCard key={state} state={state} status={statuses.sales_tax} />
        ))}
      </div>
    </div>
  );
};

// Business Activities Tab Component
const ActivitiesTab = ({ businessActivities, nexusProfile, onRefresh }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Business Activities</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Creates Nexus
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {businessActivities.map((activity) => (
                <tr key={activity.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {activity.activity_type.replace('_', ' ').toUpperCase()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {activity.state}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {activity.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(activity.start_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {activity.creates_nexus ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Monitoring Tab Component
const MonitoringTab = ({ thresholdAlerts, onRefresh }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Threshold Monitoring Alerts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alert Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Threshold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {thresholdAlerts.map((alert) => (
                <tr key={alert.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {alert.state}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {alert.alert_type.replace('_', ' ').toUpperCase()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      alert.priority === 'high' ? 'bg-red-100 text-red-800' :
                      alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${alert.current_value?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${alert.threshold_value?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {alert.percentage_of_threshold?.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {alert.acknowledged ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Acknowledged
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Apportionment Tab Component
const ApportionmentTab = ({ apportionmentFactors, nexusProfile, onRefresh }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Apportionment Factors by Tax Year</h3>
        {apportionmentFactors.length === 0 ? (
          <div className="text-center py-8">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No apportionment factors calculated yet</p>
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Calculate Apportionment
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {apportionmentFactors.map((factors) => (
              <div key={factors.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Tax Year {factors.tax_year}</h4>
                  <div className="flex items-center space-x-2">
                    {factors.is_final && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Finalized
                      </span>
                    )}
                    <button className="text-blue-600 hover:text-blue-900">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Income</p>
                    <p className="text-lg font-medium text-gray-900">
                      ${factors.total_income?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Sales</p>
                    <p className="text-lg font-medium text-gray-900">
                      ${factors.total_sales?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Calculation Method</p>
                    <p className="text-lg font-medium text-gray-900">
                      {factors.calculation_method?.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                </div>
                
                {factors.state_breakdown && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {factors.state_breakdown.map((state) => (
                      <div key={state.state} className="bg-gray-50 rounded-lg p-3">
                        <h5 className="font-medium text-gray-900 mb-2">{state.state}</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Apportionment:</span>
                            <span className="font-medium">{(state.apportionment_percentage * 100).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Sales Factor:</span>
                            <span>{(state.sales_factor * 100).toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Analysis Tab Component
const AnalysisTab = ({ nexusProfile, onRefresh }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Nexus Analysis Tools</h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <h4 className="font-medium text-gray-900">Economic Nexus Analysis</h4>
              <p className="text-sm text-gray-600 mt-1">
                Analyze current sales and transaction data against state thresholds
              </p>
            </button>
            <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <h4 className="font-medium text-gray-900">Physical Presence Review</h4>
              <p className="text-sm text-gray-600 mt-1">
                Review business activities that may create physical nexus
              </p>
            </button>
            <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <h4 className="font-medium text-gray-900">Compliance Gap Analysis</h4>
              <p className="text-sm text-gray-600 mt-1">
                Identify states where registration or filing may be required
              </p>
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Apportionment Tools</h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <h4 className="font-medium text-gray-900">Calculate Current Year</h4>
              <p className="text-sm text-gray-600 mt-1">
                Calculate apportionment factors for the current tax year
              </p>
            </button>
            <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <h4 className="font-medium text-gray-900">Compare Filing Methods</h4>
              <p className="text-sm text-gray-600 mt-1">
                Compare separate vs. combined filing scenarios
              </p>
            </button>
            <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <h4 className="font-medium text-gray-900">Generate Returns</h4>
              <p className="text-sm text-gray-600 mt-1">
                Generate multi-state tax returns based on apportionment
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Create Nexus Profile Form Component
const CreateNexusProfileForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    business_name: '',
    federal_ein: '',
    home_state: '',
    business_type: 'LLC',
    tax_year_end: '2024-12-31',
    preferred_filing_method: 'separate',
    enable_nexus_monitoring: true,
    nexus_check_frequency: 30,
    threshold_warning_percentage: 80.00
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Create Nexus Profile</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
              <FieldTooltip text="Enter your business legal name as it appears on tax documents" />
            </label>
            <input
              type="text"
              value={formData.business_name}
              onChange={(e) => setFormData({...formData, business_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Federal EIN
              <FieldTooltip text="Your Federal Employer Identification Number (format: XX-XXXXXXX)" />
            </label>
            <input
              type="text"
              value={formData.federal_ein}
              onChange={(e) => setFormData({...formData, federal_ein: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="XX-XXXXXXX"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Home State
                <FieldTooltip text="State where your business is incorporated or domiciled" />
              </label>
              <select
                value={formData.home_state}
                onChange={(e) => setFormData({...formData, home_state: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select State</option>
                <option value="CA">California</option>
                <option value="NY">New York</option>
                <option value="TX">Texas</option>
                <option value="FL">Florida</option>
                {/* Add more states as needed */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
                <FieldTooltip text="Your business entity type for tax purposes" />
              </label>
              <select
                value={formData.business_type}
                onChange={(e) => setFormData({...formData, business_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="LLC">LLC</option>
                <option value="Corporation">Corporation</option>
                <option value="S-Corp">S-Corporation</option>
                <option value="Partnership">Partnership</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Filing Method
              <FieldTooltip text="Choose separate filing for individual state returns or combined for unified reporting" />
            </label>
            <select
              value={formData.preferred_filing_method}
              onChange={(e) => setFormData({...formData, preferred_filing_method: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="separate">Separate Filing</option>
              <option value="combined">Combined Filing</option>
              <option value="consolidated">Consolidated Filing</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enable_monitoring"
              checked={formData.enable_nexus_monitoring}
              onChange={(e) => setFormData({...formData, enable_nexus_monitoring: e.target.checked})}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enable_monitoring" className="ml-2 text-sm text-gray-700">
              Enable automatic nexus threshold monitoring
              <FieldTooltip text="Automatically monitor sales and transaction thresholds across all states" />
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Activity Modal Component
const AddActivityModal = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    activity_type: '',
    state: '',
    description: '',
    start_date: '',
    end_date: '',
    address: '',
    city: '',
    zip_code: '',
    annual_value: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add Business Activity</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activity Type
                <FieldTooltip text="Type of business activity that may create nexus" />
              </label>
              <select
                value={formData.activity_type}
                onChange={(e) => setFormData({...formData, activity_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Activity Type</option>
                <option value="office">Office Location</option>
                <option value="warehouse">Warehouse/Distribution Center</option>
                <option value="retail_location">Retail Location</option>
                <option value="employee">Employee</option>
                <option value="independent_contractor">Independent Contractor</option>
                <option value="sales_rep">Sales Representative</option>
                <option value="repair_service">Repair/Service Activity</option>
                <option value="installation">Installation Services</option>
                <option value="trade_show">Trade Show/Event</option>
                <option value="delivery">Delivery Services</option>
                <option value="property_ownership">Property Ownership</option>
                <option value="inventory_storage">Inventory Storage</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
                <FieldTooltip text="State where this activity occurs" />
              </label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({...formData, state: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select State</option>
                <option value="CA">California</option>
                <option value="NY">New York</option>
                <option value="TX">Texas</option>
                <option value="FL">Florida</option>
                {/* Add more states as needed */}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
              <FieldTooltip text="Detailed description of the business activity" />
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="3"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
                <FieldTooltip text="When this activity started" />
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date (Optional)
                <FieldTooltip text="When this activity ended (leave blank if ongoing)" />
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Annual Value (Optional)
              <FieldTooltip text="Annual economic value or revenue associated with this activity" />
            </label>
            <input
              type="number"
              value={formData.annual_value}
              onChange={(e) => setFormData({...formData, annual_value: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Nexus Analysis Modal Component
const NexusAnalysisModal = ({ nexusProfile, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    states: [],
    sales_data: {},
    check_date: new Date().toISOString().split('T')[0]
  });

  const [selectedState, setSelectedState] = useState('');
  const [stateData, setStateData] = useState({
    sales: '',
    transactions: ''
  });

  const addState = () => {
    if (selectedState && !formData.states.includes(selectedState)) {
      setFormData({
        ...formData,
        states: [...formData.states, selectedState],
        sales_data: {
          ...formData.sales_data,
          [`${selectedState}_sales`]: parseFloat(stateData.sales) || 0,
          [`${selectedState}_transactions`]: parseInt(stateData.transactions) || 0
        }
      });
      setSelectedState('');
      setStateData({ sales: '', transactions: '' });
    }
  };

  const removeState = (state) => {
    const newStates = formData.states.filter(s => s !== state);
    const newSalesData = { ...formData.sales_data };
    delete newSalesData[`${state}_sales`];
    delete newSalesData[`${state}_transactions`];
    
    setFormData({
      ...formData,
      states: newStates,
      sales_data: newSalesData
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Run Nexus Analysis</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Analysis Date
              <FieldTooltip text="Date to run the analysis for (defaults to today)" />
            </label>
            <input
              type="date"
              value={formData.check_date}
              onChange={(e) => setFormData({...formData, check_date: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add States for Analysis
              <FieldTooltip text="Add states where you have sales or business activities" />
            </label>
            <div className="flex space-x-2 mb-4">
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select State</option>
                <option value="CA">California</option>
                <option value="NY">New York</option>
                <option value="TX">Texas</option>
                <option value="FL">Florida</option>
                {/* Add more states as needed */}
              </select>
              <input
                type="number"
                placeholder="Sales ($)"
                value={stateData.sales}
                onChange={(e) => setStateData({...stateData, sales: e.target.value})}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="number"
                placeholder="Transactions"
                value={stateData.transactions}
                onChange={(e) => setStateData({...stateData, transactions: e.target.value})}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addState}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>

            {formData.states.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">States to Analyze</h4>
                <div className="space-y-2">
                  {formData.states.map((state) => (
                    <div key={state} className="flex items-center justify-between bg-white rounded-lg p-3">
                      <div className="flex items-center space-x-4">
                        <span className="font-medium text-gray-900">{state}</span>
                        <span className="text-sm text-gray-600">
                          Sales: ${formData.sales_data[`${state}_sales`]?.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-600">
                          Transactions: {formData.sales_data[`${state}_transactions`]}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeState(state)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formData.states.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Run Analysis
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MultistateNexusManagement;