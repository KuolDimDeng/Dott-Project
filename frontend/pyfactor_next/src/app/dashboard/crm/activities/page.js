'use client';


import withPageAccess from '../../components/withPageAccess';
import { PAGE_ACCESS } from '@/utils/pageAccess';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardWrapper from '../../DashboardWrapper';
import { fetchAuthSession } from '@/config/amplifyUnified';
import { appCache } from '@/utils/awsAppCache';

const ActivitiesPage = () => {
  const router = useRouter();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        
        // Get authenticated user session
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();
        
        // Check if activities are available in AppCache first
        const cachedActivities = await appCache.get('crm_activities');
        if (cachedActivities) {
          setActivities(JSON.parse(cachedActivities));
          setLoading(false);
          
          // Refresh cache in background
          fetchAndUpdateActivities(token);
          return;
        }
        
        await fetchAndUpdateActivities(token);
      } catch (err) {
        console.error("Error fetching activities:", err);
        setError("Failed to load activities. Please try again later.");
        setLoading(false);
      }
    };
    
    const fetchAndUpdateActivities = async (token) => {
      try {
        // Mock activities data
        const mockActivities = [
          {
            id: 1,
            type: 'Call',
            subject: 'Initial discovery call',
            date: '2023-10-20T14:00:00',
            duration: 30,
            status: 'completed',
            priority: 'high',
            relatedTo: {
              type: 'Contact',
              name: 'Robert Chambers',
              company: 'Tech Innovators',
              id: 101
            },
            assignedTo: 'Jane Smith',
            description: 'Discussed potential enterprise software implementation needs. Client is interested in our inventory management and financial modules.',
            outcome: 'Scheduled product demo for next week.'
          },
          {
            id: 2,
            type: 'Meeting',
            subject: 'Product demo',
            date: '2023-10-25T11:00:00',
            duration: 60,
            status: 'scheduled',
            priority: 'high',
            relatedTo: {
              type: 'Opportunity',
              name: 'Enterprise Software Package',
              company: 'Tech Innovators',
              id: 202
            },
            assignedTo: 'Jane Smith',
            description: 'Demonstrating the core features of our enterprise software package, focusing on inventory management and financial modules.',
            outcome: null
          },
          {
            id: 3,
            type: 'Email',
            subject: 'Follow-up on pricing discussion',
            date: '2023-10-19T09:30:00',
            duration: 15,
            status: 'completed',
            priority: 'medium',
            relatedTo: {
              type: 'Contact',
              name: 'Alice Cooper',
              company: 'Retail Masters',
              id: 102
            },
            assignedTo: 'Mike Johnson',
            description: 'Sent detailed pricing breakdown for the POS system upgrade as requested.',
            outcome: 'Client acknowledged receipt. Awaiting decision.'
          },
          {
            id: 4,
            type: 'Task',
            subject: 'Prepare proposal for Healthcare Plus',
            date: '2023-10-22T00:00:00',
            duration: 120,
            status: 'pending',
            priority: 'high',
            relatedTo: {
              type: 'Lead',
              name: 'James Wilson',
              company: 'Healthcare Plus',
              id: 303
            },
            assignedTo: 'Jane Smith',
            description: 'Create comprehensive proposal for HIPAA-compliant data management solution.',
            outcome: null
          },
          {
            id: 5,
            type: 'Meeting',
            subject: 'Contract negotiation',
            date: '2023-10-26T15:30:00',
            duration: 90,
            status: 'scheduled',
            priority: 'critical',
            relatedTo: {
              type: 'Deal',
              name: 'Startup Growth Package',
              company: 'Startup Ventures',
              id: 404
            },
            assignedTo: 'Mike Johnson',
            description: 'Final contract negotiation for the startup growth package implementation.',
            outcome: null
          },
          {
            id: 6,
            type: 'Call',
            subject: 'Follow-up on implementation',
            date: '2023-10-18T10:00:00',
            duration: 45,
            status: 'completed',
            priority: 'medium',
            relatedTo: {
              type: 'Deal',
              name: 'Consulting Services Package',
              company: 'Global Consulting Group',
              id: 505
            },
            assignedTo: 'David Smith',
            description: 'Checked in on initial implementation phase of consulting services.',
            outcome: 'Client is satisfied with progress. Implementation proceeding as planned.'
          }
        ];
        
        // Store in AppCache for future quick access
        await appCache.set('crm_activities', JSON.stringify(mockActivities), { expires: 60 * 10 }); // 10 minutes cache
        
        setActivities(mockActivities);
        setLoading(false);
      } catch (err) {
        console.error("Error updating activities:", err);
        setError("Failed to update activities. Please try again later.");
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const handleAddActivity = () => {
    // In a real app, navigate to add activity form
    alert('Add activity functionality would go here');
  };

  const handleViewActivity = (activity) => {
    setSelectedActivity(activity);
    setShowActivityModal(true);
  };

  const handleCloseModal = () => {
    setShowActivityModal(false);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    // Apply search filter
    const matchesSearch = 
      activity.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.relatedTo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.relatedTo.company.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply status filter
    if (activeFilter === 'all') {
      return matchesSearch;
    } else {
      return matchesSearch && activity.status === activeFilter;
    }
  });

  return (
    <DashboardWrapper>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Activities</h1>
          <button 
            onClick={handleAddActivity} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Activity
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between mb-4">
            <div className="w-full md:w-1/2 mb-4 md:mb-0 md:mr-4">
              <input
                type="text"
                placeholder="Search activities..."
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => handleFilterChange('all')}
                className={`px-3 py-1 rounded-md ${activeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                All
              </button>
              <button 
                onClick={() => handleFilterChange('scheduled')}
                className={`px-3 py-1 rounded-md ${activeFilter === 'scheduled' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                Scheduled
              </button>
              <button 
                onClick={() => handleFilterChange('pending')}
                className={`px-3 py-1 rounded-md ${activeFilter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                Pending
              </button>
              <button 
                onClick={() => handleFilterChange('completed')}
                className={`px-3 py-1 rounded-md ${activeFilter === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                Completed
              </button>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex py-4 border-b border-gray-200">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="w-24 h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredActivities.length > 0 ? (
                filteredActivities.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleViewActivity(activity)}
                  >
                    <div className="flex flex-col md:flex-row justify-between">
                      <div className="flex items-start">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-4">
                          <span className="text-indigo-600 font-medium">
                            {activity.type.substring(0, 1)}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-md font-semibold text-gray-900">{activity.subject}</h3>
                          <p className="text-sm text-gray-600">
                            {activity.type} with <span className="font-medium">{activity.relatedTo.name}</span> from {activity.relatedTo.company}
                          </p>
                          <div className="flex items-center mt-1">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(activity.status)} mr-2`}>
                              {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityColor(activity.priority)}`}>
                              {activity.priority.charAt(0).toUpperCase() + activity.priority.slice(1)} Priority
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 md:mt-0 text-right">
                        <p className="text-sm font-medium text-gray-900">{formatDate(activity.date)}</p>
                        <p className="text-xs text-gray-600">Duration: {activity.duration} mins</p>
                        <p className="text-xs text-gray-600 mt-1">Assigned to: {activity.assignedTo}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No activities found matching your search criteria.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Activity Details Modal */}
      {showActivityModal && selectedActivity && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{selectedActivity.subject}</h2>
                <p className="text-gray-600">{selectedActivity.type} • {formatDate(selectedActivity.date)}</p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Related To</h4>
                <p className="text-gray-800">
                  <span className="font-medium">{selectedActivity.relatedTo.name}</span>
                  <span className="text-gray-600 text-sm"> ({selectedActivity.relatedTo.company})</span>
                </p>
                <p className="text-gray-600 text-xs">Type: {selectedActivity.relatedTo.type}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Details</h4>
                <div className="flex items-center">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(selectedActivity.status)} mr-2`}>
                    {selectedActivity.status.charAt(0).toUpperCase() + selectedActivity.status.slice(1)}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityColor(selectedActivity.priority)}`}>
                    {selectedActivity.priority.charAt(0).toUpperCase() + selectedActivity.priority.slice(1)} Priority
                  </span>
                </div>
                <p className="text-gray-700 mt-1">Duration: {selectedActivity.duration} minutes</p>
                <p className="text-gray-700">Assigned to: {selectedActivity.assignedTo}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Description</h4>
              <p className="text-gray-800 bg-gray-50 p-3 rounded">{selectedActivity.description}</p>
            </div>
            
            {selectedActivity.outcome && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Outcome</h4>
                <p className="text-gray-800 bg-gray-50 p-3 rounded">{selectedActivity.outcome}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors">
                Edit
              </button>
              {selectedActivity.status === 'scheduled' && (
                <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                  Mark as Completed
                </button>
              )}
              {selectedActivity.status === 'pending' && (
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Start Activity
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardWrapper>
  );
};

// Wrap the component with page access control
export default withPageAccess(ActivitiesPage, PAGE_ACCESS.CRM);
