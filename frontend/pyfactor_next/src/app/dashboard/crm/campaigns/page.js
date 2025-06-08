'use client';


import withPageAccess from '../../components/withPageAccess';
import { PAGE_ACCESS } from '@/utils/pageAccess';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardWrapper from '../../DashboardWrapper';
import { fetchAuthSession } from '@/config/amplifyUnified';
import { appCache } from '@/utils/awsAppCache';

const CampaignsPage = () => {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();
        
        const cachedCampaigns = await appCache.get('crm_campaigns');
        if (cachedCampaigns) {
          setCampaigns(JSON.parse(cachedCampaigns));
          setLoading(false);
          fetchAndUpdateCampaigns(token);
          return;
        }
        
        await fetchAndUpdateCampaigns(token);
      } catch (err) {
        console.error("Error fetching campaigns:", err);
        setError("Failed to load campaigns. Please try again later.");
        setLoading(false);
      }
    };
    
    const fetchAndUpdateCampaigns = async (token) => {
      try {
        const mockCampaigns = [
          {
            id: 1,
            name: 'Q4 Product Launch',
            type: 'Email',
            status: 'active',
            startDate: '2023-10-15',
            endDate: '2023-11-15',
            budget: 5000,
            owner: 'Jane Smith',
            audience: 'Existing Customers',
            description: 'Campaign to introduce new product features to existing customers.',
            metrics: {
              sent: 1500,
              opened: 750,
              clicked: 300,
              converted: 45,
              revenue: 15000
            }
          },
          {
            id: 2,
            name: 'Healthcare Industry Outreach',
            type: 'Email',
            status: 'planned',
            startDate: '2023-11-01',
            endDate: '2023-12-15',
            budget: 7500,
            owner: 'Mike Johnson',
            audience: 'Healthcare Prospects',
            description: 'Targeted campaign for healthcare industry prospects.',
            metrics: {
              sent: 0,
              opened: 0,
              clicked: 0,
              converted: 0,
              revenue: 0
            }
          },
          {
            id: 3,
            name: 'Summer Trade Show Follow-up',
            type: 'Multi-channel',
            status: 'completed',
            startDate: '2023-07-15',
            endDate: '2023-08-15',
            budget: 10000,
            owner: 'Jane Smith',
            audience: 'Trade Show Leads',
            description: 'Follow-up campaign for leads collected at the summer trade show.',
            metrics: {
              sent: 500,
              opened: 320,
              clicked: 180,
              converted: 35,
              revenue: 45000
            }
          },
          {
            id: 4,
            name: 'Year-End Promotion',
            type: 'Email',
            status: 'draft',
            startDate: '2023-12-01',
            endDate: '2023-12-31',
            budget: 8000,
            owner: 'David Smith',
            audience: 'All Prospects',
            description: 'Year-end promotion with special discounts to close out the fiscal year.',
            metrics: {
              sent: 0,
              opened: 0,
              clicked: 0,
              converted: 0,
              revenue: 0
            }
          },
          {
            id: 5,
            name: 'Enterprise Solutions Webinar',
            type: 'Webinar',
            status: 'active',
            startDate: '2023-10-20',
            endDate: '2023-10-20',
            budget: 3000,
            owner: 'Mike Johnson',
            audience: 'Enterprise Prospects',
            description: 'Webinar showcasing our enterprise solutions and case studies.',
            metrics: {
              sent: 1000,
              opened: 450,
              clicked: 200,
              converted: 15,
              revenue: 30000
            }
          }
        ];
        
        await appCache.set('crm_campaigns', JSON.stringify(mockCampaigns), { expires: 60 * 10 });
        setCampaigns(mockCampaigns);
        setLoading(false);
      } catch (err) {
        console.error("Error updating campaigns:", err);
        setError("Failed to update campaigns. Please try again later.");
        setLoading(false);
      }
    };
    
    fetchCampaigns();
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const handleAddCampaign = () => {
    alert('Add campaign functionality would go here');
  };

  const handleViewCampaign = (campaignId) => {
    alert(`View campaign ${campaignId} details`);
  };

  // Format currency
  const formatCurrency = (value) => {
    return `$${value.toLocaleString()}`;
  };

  // Get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'planned':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = 
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.audience.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'all') {
      return matchesSearch;
    } else {
      return matchesSearch && campaign.status === activeFilter;
    }
  });

  // Calculate metrics
  const totalActiveCampaigns = campaigns.filter(campaign => campaign.status === 'active').length;
  const totalBudget = campaigns.reduce((sum, campaign) => sum + campaign.budget, 0);
  const totalRevenue = campaigns.reduce((sum, campaign) => sum + campaign.metrics.revenue, 0);

  return (
    <DashboardWrapper>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Marketing Campaigns</h1>
          <button 
            onClick={handleAddCampaign} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Campaign
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Campaign Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-1">Active Campaigns</h2>
            <p className="text-2xl font-bold text-blue-600">
              {loading ? (
                <div className="h-8 bg-blue-100 rounded animate-pulse w-2/3"></div>
              ) : (
                totalActiveCampaigns
              )}
            </p>
            <p className="text-sm text-gray-500 mt-1">Currently running campaigns</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-1">Total Budget</h2>
            <p className="text-2xl font-bold text-green-600">
              {loading ? (
                <div className="h-8 bg-green-100 rounded animate-pulse w-2/3"></div>
              ) : (
                formatCurrency(totalBudget)
              )}
            </p>
            <p className="text-sm text-gray-500 mt-1">Allocated campaign budget</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-1">Generated Revenue</h2>
            <p className="text-2xl font-bold text-purple-600">
              {loading ? (
                <div className="h-8 bg-purple-100 rounded animate-pulse w-2/3"></div>
              ) : (
                formatCurrency(totalRevenue)
              )}
            </p>
            <p className="text-sm text-gray-500 mt-1">Total campaign revenue</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between mb-4">
            <div className="w-full md:w-1/2 mb-4 md:mb-0 md:mr-4">
              <input
                type="text"
                placeholder="Search campaigns..."
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
                onClick={() => handleFilterChange('active')}
                className={`px-3 py-1 rounded-md ${activeFilter === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                Active
              </button>
              <button 
                onClick={() => handleFilterChange('planned')}
                className={`px-3 py-1 rounded-md ${activeFilter === 'planned' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                Planned
              </button>
              <button 
                onClick={() => handleFilterChange('completed')}
                className={`px-3 py-1 rounded-md ${activeFilter === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                Completed
              </button>
              <button 
                onClick={() => handleFilterChange('draft')}
                className={`px-3 py-1 rounded-md ${activeFilter === 'draft' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                Draft
              </button>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="flex justify-between mt-4">
                    <div className="h-5 bg-gray-200 rounded w-24"></div>
                    <div className="h-5 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((campaign) => (
                  <div key={campaign.id} className="bg-gray-50 p-4 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{campaign.name}</h3>
                        <p className="text-gray-600 mb-2">{campaign.description}</p>
                        <div className="flex items-center space-x-4">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(campaign.status)}`}>
                            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                          </span>
                          <span className="text-sm text-gray-500">Type: {campaign.type}</span>
                          <span className="text-sm text-gray-500">Budget: {formatCurrency(campaign.budget)}</span>
                        </div>
                      </div>
                      <div className="mt-3 md:mt-0 flex flex-col items-end">
                        <span className="text-sm text-gray-500 mb-1">
                          {campaign.startDate} to {campaign.endDate}
                        </span>
                        <button 
                          onClick={() => handleViewCampaign(campaign.id)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                    
                    {(campaign.status === 'active' || campaign.status === 'completed') && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">Sent</p>
                            <p className="font-semibold">{campaign.metrics.sent.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">Opened</p>
                            <p className="font-semibold">{campaign.metrics.opened.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">Clicked</p>
                            <p className="font-semibold">{campaign.metrics.clicked.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">Converted</p>
                            <p className="font-semibold">{campaign.metrics.converted.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">Revenue</p>
                            <p className="font-semibold text-green-600">{formatCurrency(campaign.metrics.revenue)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No campaigns found matching your search criteria.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardWrapper>
  );
};

// Wrap the component with page access control
export default withPageAccess(CampaignsPage, PAGE_ACCESS.CRM);
