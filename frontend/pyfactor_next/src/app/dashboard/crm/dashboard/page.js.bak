'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardWrapper from '../../DashboardWrapper';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import { appCache } from '@/utils/awsAppCache';

const CRMDashboard = () => {
  const router = useRouter();
  const [stats, setStats] = useState({
    contacts: 0,
    leads: 0,
    opportunities: 0,
    deals: 0,
    activities: 0,
    campaigns: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCRMStats = async () => {
      try {
        setLoading(true);
        // Get authenticated user session
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();

        // Check if stats are available in AppCache first (for better performance)
        const cachedStats = await appCache.get('crm_dashboard_stats');
        if (cachedStats) {
          setStats(JSON.parse(cachedStats));
          setLoading(false);
          
          // Refresh cache in background
          fetchAndUpdateStats(token);
          return;
        }

        await fetchAndUpdateStats(token);
      } catch (err) {
        console.error("Error fetching CRM stats:", err);
        setError("Failed to load CRM statistics. Please try again later.");
        setLoading(false);
      }
    };

    const fetchAndUpdateStats = async (token) => {
      try {
        // In a real implementation, you would fetch actual data from your backend
        // For now, we'll use mock data
        const mockStats = {
          contacts: 24,
          leads: 18,
          opportunities: 12,
          deals: 8,
          activities: 36,
          campaigns: 3
        };
        
        // Store in AppCache for future quick access
        await appCache.set('crm_dashboard_stats', JSON.stringify(mockStats), { expires: 60 * 5 }); // 5 minutes cache
        
        setStats(mockStats);
        setLoading(false);
      } catch (err) {
        console.error("Error updating CRM stats:", err);
        setError("Failed to update CRM statistics. Please try again later.");
        setLoading(false);
      }
    };

    fetchCRMStats();
  }, []);

  const handleNavigate = (path) => {
    // Update view state to match what RenderMainContent expects (crm-section)
    router.push(`/dashboard/crm/${path}`);
  };

  return (
    <DashboardWrapper>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">CRM Dashboard</h1>
          <button 
            onClick={() => {}} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Generate Report
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-md animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div 
              className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleNavigate('contacts')}
            >
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Contacts</h2>
              <p className="text-3xl font-bold text-blue-600">{stats.contacts}</p>
              <p className="text-sm text-gray-500 mt-2">Total contacts in your CRM</p>
            </div>
            
            <div 
              className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleNavigate('leads')}
            >
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Leads</h2>
              <p className="text-3xl font-bold text-green-600">{stats.leads}</p>
              <p className="text-sm text-gray-500 mt-2">Potential customers to follow up</p>
            </div>
            
            <div 
              className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleNavigate('opportunities')}
            >
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Opportunities</h2>
              <p className="text-3xl font-bold text-purple-600">{stats.opportunities}</p>
              <p className="text-sm text-gray-500 mt-2">Potential deals in progress</p>
            </div>
            
            <div 
              className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleNavigate('deals')}
            >
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Deals</h2>
              <p className="text-3xl font-bold text-yellow-600">{stats.deals}</p>
              <p className="text-sm text-gray-500 mt-2">Closed or pending deals</p>
            </div>
            
            <div 
              className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleNavigate('activities')}
            >
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Activities</h2>
              <p className="text-3xl font-bold text-red-600">{stats.activities}</p>
              <p className="text-sm text-gray-500 mt-2">Scheduled tasks and events</p>
            </div>
            
            <div 
              className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleNavigate('campaigns')}
            >
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Campaigns</h2>
              <p className="text-3xl font-bold text-indigo-600">{stats.campaigns}</p>
              <p className="text-sm text-gray-500 mt-2">Marketing campaigns</p>
            </div>
          </div>
        )}
        
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Activities</h2>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gray-200 mr-4"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                  <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-800">Meeting scheduled with <span className="font-semibold">John Doe</span></p>
                  <p className="text-sm text-gray-500">Today, 2:00 PM</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-4">
                  <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-800">New lead <span className="font-semibold">Sarah Johnson</span> was created</p>
                  <p className="text-sm text-gray-500">Yesterday, 11:30 AM</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center mr-4">
                  <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-800">Follow-up reminder for <span className="font-semibold">Acme Corp</span> opportunity</p>
                  <p className="text-sm text-gray-500">2 days ago</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mr-4">
                  <svg className="h-6 w-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-800">Deal closed with <span className="font-semibold">Tech Solutions Inc.</span> ($15,000)</p>
                  <p className="text-sm text-gray-500">3 days ago</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardWrapper>
  );
};

export default CRMDashboard; 