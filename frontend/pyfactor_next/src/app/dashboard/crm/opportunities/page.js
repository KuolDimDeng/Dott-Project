'use client';


import withPageAccess from '../../components/withPageAccess';
import { PAGE_ACCESS } from '@/utils/pageAccess';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardWrapper from '../../DashboardWrapper';
import { fetchAuthSession } from '@/config/amplifyUnified';
import { appCache } from '@/utils/appCache';

const OpportunitiesPage = () => {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [showOppDetails, setShowOppDetails] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Opportunity stage labels and order
  const stages = [
    { id: 'qualification', label: 'Qualification', color: 'bg-blue-100 text-blue-800' },
    { id: 'needs-analysis', label: 'Needs Analysis', color: 'bg-indigo-100 text-indigo-800' },
    { id: 'proposal', label: 'Proposal', color: 'bg-purple-100 text-purple-800' },
    { id: 'negotiation', label: 'Negotiation', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'closed-won', label: 'Closed Won', color: 'bg-green-100 text-green-800' },
    { id: 'closed-lost', label: 'Closed Lost', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        setLoading(true);
        
        // Get authenticated user session
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();
        
        // Check if opportunities are available in AppCache first
        const cachedOpps = await appCache.get('crm_opportunities');
        if (cachedOpps) {
          setOpportunities(JSON.parse(cachedOpps));
          setLoading(false);
          
          // Refresh cache in background
          fetchAndUpdateOpportunities(token);
          return;
        }
        
        await fetchAndUpdateOpportunities(token);
      } catch (err) {
        console.error("Error fetching opportunities:", err);
        setError("Failed to load opportunities. Please try again later.");
        setLoading(false);
      }
    };
    
    const fetchAndUpdateOpportunities = async (token) => {
      try {
        // In a real implementation, you would fetch actual data from your backend
        // For now, we'll use mock data
        const mockOpportunities = [
          {
            id: 1,
            name: 'Enterprise Software Package - Tech Innovators',
            contactName: 'Robert Chambers',
            company: 'Tech Innovators',
            stage: 'proposal',
            value: 75000,
            closeDate: '2023-12-15',
            probability: 70,
            owner: 'Jane Smith',
            source: 'Website Lead',
            tags: ['Enterprise', 'Software'],
            description: 'Comprehensive enterprise software solution including inventory management, HR, and finance modules.',
            activities: [
              { id: 1, type: 'Call', date: '2023-10-05', description: 'Initial discovery call' },
              { id: 2, type: 'Meeting', date: '2023-10-12', description: 'Product demo' },
              { id: 3, type: 'Email', date: '2023-10-20', description: 'Sent proposal' }
            ]
          },
          {
            id: 2,
            name: 'POS System Upgrade - Retail Masters',
            contactName: 'Alice Cooper',
            company: 'Retail Masters',
            stage: 'needs-analysis',
            value: 35000,
            closeDate: '2023-11-30',
            probability: 50,
            owner: 'Mike Johnson',
            source: 'Trade Show',
            tags: ['Retail', 'POS'],
            description: 'Upgrade of existing POS system to include inventory management and customer loyalty features.',
            activities: [
              { id: 1, type: 'Meeting', date: '2023-09-15', description: 'Met at trade show' },
              { id: 2, type: 'Call', date: '2023-09-22', description: 'Follow-up call' }
            ]
          },
          {
            id: 3,
            name: 'Healthcare Data Solution - Healthcare Plus',
            contactName: 'James Wilson',
            company: 'Healthcare Plus',
            stage: 'closed-won',
            value: 120000,
            closeDate: '2023-10-05',
            probability: 100,
            owner: 'Jane Smith',
            source: 'Referral',
            tags: ['Healthcare', 'Data'],
            description: 'Comprehensive HIPAA-compliant data management solution for healthcare providers.',
            activities: [
              { id: 1, type: 'Call', date: '2023-07-10', description: 'Initial contact' },
              { id: 2, type: 'Meeting', date: '2023-07-25', description: 'Requirements gathering' },
              { id: 3, type: 'Meeting', date: '2023-08-15', description: 'Solution presentation' },
              { id: 4, type: 'Email', date: '2023-09-01', description: 'Contract negotiation' },
              { id: 5, type: 'Meeting', date: '2023-10-05', description: 'Deal closing' }
            ]
          },
          {
            id: 4,
            name: 'CRM Implementation - Global Logistics',
            contactName: 'Maria Rodriguez',
            company: 'Global Logistics',
            stage: 'qualification',
            value: 45000,
            closeDate: '2024-01-15',
            probability: 30,
            owner: 'David Smith',
            source: 'LinkedIn',
            tags: ['Logistics', 'CRM'],
            description: 'Custom CRM implementation with shipment tracking integration.',
            activities: [
              { id: 1, type: 'Email', date: '2023-10-02', description: 'Initial contact' },
              { id: 2, type: 'Call', date: '2023-10-10', description: 'Discovery call' }
            ]
          },
          {
            id: 5,
            name: 'Startup Growth Package - Startup Ventures',
            contactName: 'Thomas Baker',
            company: 'Startup Ventures',
            stage: 'negotiation',
            value: 25000,
            closeDate: '2023-11-15',
            probability: 80,
            owner: 'Mike Johnson',
            source: 'Content Download',
            tags: ['Startup', 'Growth'],
            description: 'Tailored software package for startups including CRM, inventory, and basic accounting.',
            activities: [
              { id: 1, type: 'Email', date: '2023-09-05', description: 'Content download follow-up' },
              { id: 2, type: 'Call', date: '2023-09-12', description: 'Discovery call' },
              { id: 3, type: 'Meeting', date: '2023-09-20', description: 'Demo' },
              { id: 4, type: 'Email', date: '2023-10-01', description: 'Proposal sent' },
              { id: 5, type: 'Call', date: '2023-10-10', description: 'Negotiation call' }
            ]
          },
          {
            id: 6,
            name: 'Manufacturing Solution - Industrial Systems Inc.',
            contactName: 'George Miller',
            company: 'Industrial Systems Inc.',
            stage: 'closed-lost',
            value: 85000,
            closeDate: '2023-09-30',
            probability: 0,
            owner: 'Jane Smith',
            source: 'Cold Call',
            tags: ['Manufacturing', 'IoT'],
            description: 'IoT-based manufacturing monitoring and management system.',
            activities: [
              { id: 1, type: 'Call', date: '2023-07-05', description: 'Cold call' },
              { id: 2, type: 'Meeting', date: '2023-07-20', description: 'Initial meeting' },
              { id: 3, type: 'Meeting', date: '2023-08-10', description: 'Demo and presentation' },
              { id: 4, type: 'Email', date: '2023-08-25', description: 'Proposal sent' },
              { id: 5, type: 'Call', date: '2023-09-15', description: 'Lost to competitor' }
            ]
          }
        ];
        
        // Store in AppCache for future quick access
        await appCache.set('crm_opportunities', JSON.stringify(mockOpportunities), { expires: 60 * 10 }); // 10 minutes cache
        
        setOpportunities(mockOpportunities);
        setLoading(false);
      } catch (err) {
        console.error("Error updating opportunities:", err);
        setError("Failed to update opportunities. Please try again later.");
        setLoading(false);
      }
    };
    
    fetchOpportunities();
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const filteredOpportunities = opportunities.filter(opp => {
    // First apply search term filter
    const matchesSearch = 
      opp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.company.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Then apply stage filter
    if (activeFilter === 'all') {
      return matchesSearch;
    } else {
      return matchesSearch && opp.stage === activeFilter;
    }
  });

  const handleViewOpportunity = (opp) => {
    setSelectedOpp(opp);
    setShowOppDetails(true);
  };

  const handleAddOpportunity = () => {
    // In a real app, navigate to add opportunity form
    alert('Add opportunity functionality would go here');
  };

  const handleCloseDetails = () => {
    setShowOppDetails(false);
  };

  // Calculate total pipeline value
  const totalPipelineValue = opportunities
    .filter(opp => opp.stage !== 'closed-lost')
    .reduce((sum, opp) => sum + opp.value, 0);
  
  // Calculate weighted pipeline value
  const weightedPipelineValue = opportunities
    .filter(opp => opp.stage !== 'closed-lost')
    .reduce((sum, opp) => sum + (opp.value * opp.probability / 100), 0);

  // Get stage color
  const getStageColor = (stageId) => {
    const stage = stages.find(s => s.id === stageId);
    return stage ? stage.color : 'bg-gray-100 text-gray-800';
  };

  // Get stage label
  const getStageLabel = (stageId) => {
    const stage = stages.find(s => s.id === stageId);
    return stage ? stage.label : stageId;
  };

  // Format currency
  const formatCurrency = (value) => {
    return `$${value.toLocaleString()}`;
  };

  return (
    <DashboardWrapper>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Opportunities</h1>
          <button 
            onClick={handleAddOpportunity} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Opportunity
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Pipeline overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-1">Total Pipeline Value</h2>
            <p className="text-2xl font-bold text-blue-600">
              {loading ? (
                <div className="h-8 bg-blue-100 rounded animate-pulse w-2/3"></div>
              ) : (
                formatCurrency(totalPipelineValue)
              )}
            </p>
            <p className="text-sm text-gray-500 mt-1">Total value of all active opportunities</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-1">Weighted Pipeline Value</h2>
            <p className="text-2xl font-bold text-green-600">
              {loading ? (
                <div className="h-8 bg-green-100 rounded animate-pulse w-2/3"></div>
              ) : (
                formatCurrency(weightedPipelineValue)
              )}
            </p>
            <p className="text-sm text-gray-500 mt-1">Pipeline value adjusted by probability</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-1">Average Deal Size</h2>
            <p className="text-2xl font-bold text-purple-600">
              {loading ? (
                <div className="h-8 bg-purple-100 rounded animate-pulse w-2/3"></div>
              ) : (
                formatCurrency(opportunities.length > 0 ? totalPipelineValue / opportunities.filter(opp => opp.stage !== 'closed-lost').length : 0)
              )}
            </p>
            <p className="text-sm text-gray-500 mt-1">Average value per opportunity</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between mb-4">
            <div className="w-full md:w-1/2 mb-4 md:mb-0 md:mr-4">
              <input
                type="text"
                placeholder="Search opportunities..."
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => handleFilterChange('all')}
                className={`px-3 py-1 rounded-md ${activeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                All
              </button>
              {stages.map(stage => (
                <button 
                  key={stage.id}
                  onClick={() => handleFilterChange(stage.id)}
                  className={`px-3 py-1 rounded-md ${activeFilter === stage.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
                >
                  {stage.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse">
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
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opportunity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Close Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Probability</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOpportunities.length > 0 ? (
                    filteredOpportunities.map((opp) => (
                      <tr key={opp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                              <span className="text-purple-600 font-medium">{opp.company.substring(0, 2).toUpperCase()}</span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{opp.name}</div>
                              <div className="text-sm text-gray-500">{opp.company}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStageColor(opp.stage)}`}>
                            {getStageLabel(opp.stage)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatCurrency(opp.value)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{opp.closeDate}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div 
                                className={`h-2.5 rounded-full ${
                                  opp.probability > 70 ? 'bg-green-600' : 
                                  opp.probability > 40 ? 'bg-yellow-600' : 'bg-red-600'
                                }`} 
                                style={{ width: `${opp.probability}%` }}
                              ></div>
                            </div>
                            <span className="ml-2 text-xs text-gray-600">{opp.probability}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => handleViewOpportunity(opp)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            View
                          </button>
                          <button className="text-blue-600 hover:text-blue-900">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        No opportunities found matching your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Opportunity Details Modal */}
      {showOppDetails && selectedOpp && (
        <div className="absolute inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 overflow-auto py-10">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-800">Opportunity Details</h2>
              <button 
                onClick={handleCloseDetails}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{selectedOpp.name}</h3>
              <div className="flex items-center space-x-4">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStageColor(selectedOpp.stage)}`}>
                  {getStageLabel(selectedOpp.stage)}
                </span>
                <span className="text-gray-600">{formatCurrency(selectedOpp.value)}</span>
                <span className="text-gray-600">Close date: {selectedOpp.closeDate}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Contact</h4>
                <p className="text-gray-800 font-medium">{selectedOpp.contactName}</p>
                <p className="text-gray-600 text-sm">{selectedOpp.company}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Ownership</h4>
                <p className="text-gray-800">Owner: <span className="font-medium">{selectedOpp.owner}</span></p>
                <p className="text-gray-600 text-sm">Source: {selectedOpp.source}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Probability</h4>
                <div className="flex items-center mb-1">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                    <div 
                      className={`h-2.5 rounded-full ${
                        selectedOpp.probability > 70 ? 'bg-green-600' : 
                        selectedOpp.probability > 40 ? 'bg-yellow-600' : 'bg-red-600'
                      }`} 
                      style={{ width: `${selectedOpp.probability}%` }}
                    ></div>
                  </div>
                  <span className="text-gray-800 font-medium">{selectedOpp.probability}%</span>
                </div>
                <p className="text-gray-600 text-sm">
                  {selectedOpp.probability > 70 ? 'High probability' : 
                   selectedOpp.probability > 40 ? 'Medium probability' : 'Low probability'}
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Description</h4>
              <p className="text-gray-800 bg-gray-50 p-3 rounded">{selectedOpp.description}</p>
            </div>
            
            <div className="mb-6">
              <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Tags</h4>
              <div className="flex flex-wrap">
                {selectedOpp.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full mr-2 mb-2">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Activity History</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                {selectedOpp.activities.length > 0 ? (
                  <div className="space-y-4">
                    {selectedOpp.activities.map((activity) => (
                      <div key={activity.id} className="flex">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <span className="text-blue-600 text-xs font-medium">
                            {activity.type.substring(0, 1)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center">
                            <span className="font-medium text-gray-800">{activity.type}</span>
                            <span className="mx-2 text-gray-400">•</span>
                            <span className="text-sm text-gray-600">{activity.date}</span>
                          </div>
                          <p className="text-gray-600 text-sm">{activity.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">No activities recorded yet.</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors">
                Edit
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                Add Activity
              </button>
              {selectedOpp.stage !== 'closed-won' && selectedOpp.stage !== 'closed-lost' && (
                <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                  Mark as Won
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
export default withPageAccess(OpportunitiesPage, PAGE_ACCESS.CRM);
