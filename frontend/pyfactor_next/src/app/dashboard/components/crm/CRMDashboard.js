'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/authStore';
import { logger } from '@/utils/logger';

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
  const token = useStore((state) => state.token);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
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
        
        setDashboardData({
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
        });
      } catch (error) {
        logger.error('Error fetching CRM dashboard data:', error);
        // Show mock data for demonstration purposes
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
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [token]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-main"></div>
      </div>
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
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        CRM Dashboard
      </h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Customers
          </h3>
          <p className="text-3xl font-semibold mt-2 text-gray-900 dark:text-white">
            {dashboardData.customers.total}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {dashboardData.customers.new30d} new in last 30 days
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Leads
          </h3>
          <p className="text-3xl font-semibold mt-2 text-gray-900 dark:text-white">
            {dashboardData.leads.total}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {dashboardData.leads.new30d} new in last 30 days
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Opportunities
          </h3>
          <p className="text-3xl font-semibold mt-2 text-gray-900 dark:text-white">
            {dashboardData.opportunities.total}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Value: {formatCurrency(dashboardData.opportunities.totalValue)}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Deals
          </h3>
          <p className="text-3xl font-semibold mt-2 text-gray-900 dark:text-white">
            {dashboardData.deals.total}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Value: {formatCurrency(dashboardData.deals.totalValue)}
          </p>
        </div>
      </div>
      
      {/* Activities Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Upcoming Activities</h3>
            <button className="text-sm text-primary-main hover:text-primary-dark font-medium">
              View All
            </button>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Subject</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Due Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {dashboardData.activities.upcoming.length > 0 ? (
                    dashboardData.activities.upcoming.slice(0, 5).map((activity) => (
                      <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{activity.type}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{activity.subject}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatDate(activity.due_date)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{activity.status.replace('_', ' ')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-center text-sm text-gray-500 dark:text-gray-400">No upcoming activities</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Overdue Activities</h3>
            <button className="text-sm text-primary-main hover:text-primary-dark font-medium">
              View All
            </button>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Subject</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Due Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {dashboardData.activities.overdue.length > 0 ? (
                    dashboardData.activities.overdue.slice(0, 5).map((activity) => (
                      <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{activity.type}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{activity.subject}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatDate(activity.due_date)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{activity.status.replace('_', ' ')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-center text-sm text-gray-500 dark:text-gray-400">No overdue activities</td>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Leads by Status</h3>
            <button className="text-sm text-primary-main hover:text-primary-dark font-medium">
              View Leads
            </button>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Count</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {dashboardData.leads.byStatus.map((status) => (
                    <tr key={status.status} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {status.status.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">
                        {status.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Opportunities by Stage</h3>
            <button className="text-sm text-primary-main hover:text-primary-dark font-medium">
              View Opportunities
            </button>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stage</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Count</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {dashboardData.opportunities.byStage.map((stage) => (
                    <tr key={stage.stage} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {stage.stage.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">
                        {stage.count}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">
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