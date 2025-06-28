'use client';

import React, { useState, useEffect } from 'react';
import { taxesApi } from '@/services/api/taxes';
import { toast } from 'react-hot-toast';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

const TaxesDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [taxSummary, setTaxSummary] = useState({
    salesTax: { collected: 0, filed: 0, due: 0 },
    incomeTax: { estimated: 0, paid: 0, remaining: 0 },
    payrollTax: { withheld: 0, deposited: 0, pending: 0 }
  });
  const [upcomingFilings, setUpcomingFilings] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch tax summary data
      const summaryResponse = await taxesApi.dashboard.getSummary();
      if (summaryResponse.data) {
        setTaxSummary(summaryResponse.data);
      }
      
      // Fetch upcoming filings
      const filingsResponse = await taxesApi.filings.getUpcoming();
      if (filingsResponse.data) {
        setUpcomingFilings(filingsResponse.data);
      }
      
      // Fetch recent activities
      const activitiesResponse = await taxesApi.activities.getRecent();
      if (activitiesResponse.data) {
        setRecentActivities(activitiesResponse.data);
      }
    } catch (error) {
      console.error('Error fetching tax dashboard data:', error);
      toast.error('Failed to load tax dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <CenteredSpinner size="large" minHeight="h-96" />
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Tax Dashboard</h1>
      
      {/* Tax Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Sales Tax Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Sales Tax</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Collected</span>
              <span className="font-medium">${taxSummary.salesTax.collected.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Filed</span>
              <span className="font-medium">${taxSummary.salesTax.filed.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Due</span>
              <span className="font-bold text-red-600">${taxSummary.salesTax.due.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Income Tax Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Income Tax</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated</span>
              <span className="font-medium">${taxSummary.incomeTax.estimated.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Paid</span>
              <span className="font-medium">${taxSummary.incomeTax.paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Remaining</span>
              <span className="font-bold text-orange-600">${taxSummary.incomeTax.remaining.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payroll Tax Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Payroll Tax</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Withheld</span>
              <span className="font-medium">${taxSummary.payrollTax.withheld.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Deposited</span>
              <span className="font-medium">${taxSummary.payrollTax.deposited.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Pending</span>
              <span className="font-bold text-yellow-600">${taxSummary.payrollTax.pending.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Filings and Recent Activities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Filings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Upcoming Filings</h2>
          <div className="space-y-3">
            {upcomingFilings.length > 0 ? (
              upcomingFilings.map((filing, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-3 py-2">
                  <div className="font-medium">{filing.form_type}</div>
                  <div className="text-sm text-gray-600">Due: {new Date(filing.due_date).toLocaleDateString()}</div>
                  <div className="text-sm text-gray-500">{filing.description}</div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No upcoming filings</p>
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Recent Activities</h2>
          <div className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div key={index} className="border-l-4 border-green-500 pl-3 py-2">
                  <div className="font-medium">{activity.type}</div>
                  <div className="text-sm text-gray-600">{new Date(activity.date).toLocaleDateString()}</div>
                  <div className="text-sm text-gray-500">{activity.description}</div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No recent activities</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxesDashboard;