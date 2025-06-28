'use client';


import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/authStore';
import { logger } from '@/utils/logger';
import { appCache } from '@/utils/appCache';
import { fetchAuthSession } from '@/config/amplifyUnified';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

const CRMDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    customers: { total: 0, new30d: 0 },
    leads: { total: 0, new30d: 0, byStatus: [], bySource: [] },
    opportunities: { total: 0, totalValue: 0, byStage: [] },
    deals: { total: 0, totalValue: 0, byStatus: [] },
    activities: { upcoming: [], overdue: [] },
    campaigns: { total: 0, active: 0, byType: [], byStatus: [] }
  });
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Check AppCache first
        const cachedData = await appCache.get('crm_dashboard_data');
        if (cachedData) {
          setDashboardData(JSON.parse(cachedData));
          setLoading(false);
          
          // Refresh data in background
          fetchAndUpdateDashboardData();
          return;
        }
        
        // If no cache, fetch data
        await fetchAndUpdateDashboardData();
      } catch (error) {
        logger.error('Error fetching CRM dashboard data:', error);
        useBackupData();
        setLoading(false);
      }
    };
    
    const fetchAndUpdateDashboardData = async () => {
      try {
        // Get auth token from Cognito
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString() || '';
        
        // Fetch data for each dashboard section
        const responses = await Promise.all([
          fetch('/api/crm/dashboard/customers/', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/crm/dashboard/leads/', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/crm/dashboard/opportunities/', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/crm/dashboard/deals/', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/crm/activities/upcoming/', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/crm/activities/overdue/', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/crm/dashboard/campaigns/', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        const [
          customersData, 
          leadsData, 
          opportunitiesData, 
          dealsData, 
          upcomingActivities, 
          overdueActivities, 
          campaignsData
        ] = await Promise.all(responses.map(res => res.json()));
        
        const newDashboardData = {
          customers: { 
            total: customersData.total_customers, 
            new30d: customersData.new_customers_30d 
          },
          leads: { 
            total: leadsData.total_leads, 
            new30d: leadsData.new_leads_30d,
            byStatus: leadsData.leads_by_status || [],
            bySource: leadsData.leads_by_source || []
          },
          opportunities: { 
            total: opportunitiesData.total_opportunities, 
            totalValue: opportunitiesData.total_value,
            byStage: opportunitiesData.opportunities_by_stage || []
          },
          deals: { 
            total: dealsData.total_deals, 
            totalValue: dealsData.total_value,
            byStatus: dealsData.deals_by_status || []
          },
          activities: { 
            upcoming: upcomingActivities || [], 
            overdue: overdueActivities || [] 
          },
          campaigns: { 
            total: campaignsData.total_campaigns, 
            active: campaignsData.active_campaigns,
            byType: campaignsData.campaigns_by_type || [],
            byStatus: campaignsData.campaigns_by_status || []
          }
        };
        
        // Save to AppCache
        await appCache.set('crm_dashboard_data', JSON.stringify(newDashboardData), { expires: 60 * 5 }); // 5 minutes cache
        
        setDashboardData(newDashboardData);
        setLoading(false);
      } catch (error) {
        logger.error('Error updating CRM dashboard data:', error);
        useBackupData();
        setLoading(false);
      }
    };
    
    const useBackupData = () => {
      // Fallback mock data
      setDashboardData({
        customers: { total: 124, new30d: 15 },
        leads: { 
          total: 57, 
          new30d: 22,
          byStatus: [
            { status: 'new', count: 22 },
            { status: 'contacted', count: 15 },
            { status: 'qualified', count: 12 },
            { status: 'unqualified', count: 5 },
            { status: 'converted', count: 3 }
          ],
          bySource: [
            { source: 'website', count: 25 },
            { source: 'referral', count: 15 },
            { source: 'social media', count: 10 },
            { source: 'event', count: 7 }
          ]
        },
        opportunities: { 
          total: 32, 
          totalValue: 450000,
          byStage: [
            { stage: 'prospecting', count: 8, value: 120000 },
            { stage: 'qualification', count: 6, value: 80000 },
            { stage: 'proposal', count: 5, value: 150000 },
            { stage: 'negotiation', count: 3, value: 75000 },
            { stage: 'closed_won', count: 10, value: 25000 }
          ]
        },
        deals: { 
          total: 18, 
          totalValue: 320000,
          byStatus: [
            { status: 'draft', count: 5, value: 85000 },
            { status: 'sent', count: 7, value: 135000 },
            { status: 'accepted', count: 6, value: 100000 }
          ]
        },
        activities: { 
          upcoming: [
            { id: 1, type: 'call', subject: 'Follow-up call with ABC Corp', due_date: '2025-03-28T10:00:00Z', status: 'not_started' },
            { id: 2, type: 'meeting', subject: 'Demo for XYZ Inc', due_date: '2025-03-29T14:30:00Z', status: 'not_started' },
            { id: 3, type: 'email', subject: 'Send proposal to Johnson Ltd', due_date: '2025-03-27T12:00:00Z', status: 'in_progress' }
          ], 
          overdue: [
            { id: 4, type: 'task', subject: 'Update customer details', due_date: '2025-03-22T17:00:00Z', status: 'in_progress' },
            { id: 5, type: 'call', subject: 'Check in with Smith Co', due_date: '2025-03-21T11:00:00Z', status: 'not_started' }
          ] 
        },
        campaigns: { 
          total: 12, 
          active: 4,
          byType: [
            { type: 'email', count: 5 },
            { type: 'social', count: 3 },
            { type: 'event', count: 2 },
            { type: 'webinar', count: 2 }
          ],
          byStatus: [
            { status: 'planning', count: 3 },
            { status: 'active', count: 4 },
            { status: 'completed', count: 5 }
          ]
        }
      });
    };
    
    fetchDashboardData();
  }, []);
  
  if (loading) {
    return (
      <CenteredSpinner size="large" minHeight="h-full" />
    );
  }
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Handle navigation to different CRM sections
  const handleNavigate = (section) => {
    window.location.href = `/dashboard/crm/${section}`;
  };
  
  return (
    <div className="p-6 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6 text-black">
        CRM Dashboard
      </h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <div 
          className="bg-white rounded-lg shadow p-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleNavigate('customers')}
        >
          <h3 className="text-sm font-medium text-black">
            Customers
          </h3>
          <p className="text-3xl font-semibold mt-2 text-black">
            {dashboardData.customers.total}
          </p>
          <p className="text-xs text-black">
            {dashboardData.customers.new30d} new in last 30 days
          </p>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow p-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleNavigate('leads')}
        >
          <h3 className="text-sm font-medium text-black">
            Leads
          </h3>
          <p className="text-3xl font-semibold mt-2 text-black">
            {dashboardData.leads.total}
          </p>
          <p className="text-xs text-black">
            {dashboardData.leads.new30d} new in last 30 days
          </p>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow p-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleNavigate('opportunities')}
        >
          <h3 className="text-sm font-medium text-black">
            Opportunities
          </h3>
          <p className="text-3xl font-semibold mt-2 text-black">
            {dashboardData.opportunities.total}
          </p>
          <p className="text-xs text-black">
            Value: {formatCurrency(dashboardData.opportunities.totalValue)}
          </p>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow p-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleNavigate('deals')}
        >
          <h3 className="text-sm font-medium text-black">
            Deals
          </h3>
          <p className="text-3xl font-semibold mt-2 text-black">
            {dashboardData.deals.total}
          </p>
          <p className="text-xs text-black">
            Value: {formatCurrency(dashboardData.deals.totalValue)}
          </p>
        </div>
      </div>
      
      {/* Activities Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
            <h3 className="text-lg font-medium text-black">Upcoming Activities</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All
            </button>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase tracking-wider">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase tracking-wider">Subject</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase tracking-wider">Due Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData.activities.upcoming.length > 0 ? (
                    dashboardData.activities.upcoming.slice(0, 5).map((activity) => (
                      <tr key={activity.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-black">{activity.type}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-black">{activity.subject}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-black">{formatDate(activity.due_date)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-black">{activity.status.replace('_', ' ')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-center text-sm text-black">No upcoming activities</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
            <h3 className="text-lg font-medium text-black">Overdue Activities</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All
            </button>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase tracking-wider">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase tracking-wider">Subject</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase tracking-wider">Due Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData.activities.overdue.length > 0 ? (
                    dashboardData.activities.overdue.slice(0, 5).map((activity) => (
                      <tr key={activity.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-black">{activity.type}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-black">{activity.subject}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-black">{formatDate(activity.due_date)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-black">{activity.status.replace('_', ' ')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-center text-sm text-black">No overdue activities</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      {/* Leads and Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
            <h3 className="text-lg font-medium text-black">Leads by Status</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View Leads
            </button>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-black uppercase tracking-wider">Count</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData.leads.byStatus.map((status) => (
                    <tr key={status.status} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-black">
                        {status.status.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-black text-right">
                        {status.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
            <h3 className="text-lg font-medium text-black">Opportunities by Stage</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View Opportunities
            </button>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase tracking-wider">Stage</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-black uppercase tracking-wider">Count</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-black uppercase tracking-wider">Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData.opportunities.byStage.map((stage) => (
                    <tr key={stage.stage} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-black">
                        {stage.stage.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-black text-right">
                        {stage.count}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-black text-right">
                        {formatCurrency(stage.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMDashboard;