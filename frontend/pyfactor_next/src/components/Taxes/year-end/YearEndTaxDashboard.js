import React, { useState, useEffect } from 'react';
import { CalendarIcon, DocumentTextIcon, UserGroupIcon, BuildingOfficeIcon, ArrowDownTrayIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import W2Management from './W2Management';
import Form1099Management from './Form1099Management';
import GenerationHistory from './GenerationHistory';

const YearEndTaxDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    currentYear: new Date().getFullYear() - 1,
    employeeCount: 0,
    vendorCount: 0,
    w2Generated: 0,
    form1099Generated: 0,
    lastGeneration: null
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch employee count
      const employeeResponse = await api.get('/hr/employees/');
      const activeEmployees = employeeResponse.data.filter(emp => emp.status === 'active');
      
      // Fetch vendor count requiring 1099
      const vendorResponse = await api.get('/taxes/year-end/1099-forms/vendors_requiring_1099/', {
        params: { tax_year: stats.currentYear }
      });
      
      // Fetch generation history
      const generationResponse = await api.get('/taxes/year-end/generation/');
      const lastGen = generationResponse.data[0];
      
      setStats({
        ...stats,
        employeeCount: activeEmployees.length,
        vendorCount: vendorResponse.data.length,
        w2Generated: lastGen?.w2_count || 0,
        form1099Generated: (lastGen?.form_1099_nec_count || 0) + (lastGen?.form_1099_misc_count || 0),
        lastGeneration: lastGen
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load year-end tax statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAll = async () => {
    try {
      setLoading(true);
      const response = await api.post('/taxes/year-end/generation/generate_all/', {
        tax_year: stats.currentYear,
        send_notifications: true
      });
      
      toast.success('Year-end tax forms generation started successfully');
      fetchStats(); // Refresh stats
      setActiveTab('history'); // Switch to history tab to see progress
    } catch (error) {
      console.error('Error generating tax forms:', error);
      toast.error(error.response?.data?.error || 'Failed to generate year-end tax forms');
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tax Year</p>
              <p className="text-2xl font-bold">{stats.currentYear}</p>
            </div>
            <CalendarIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Employees</p>
              <p className="text-2xl font-bold">{stats.employeeCount}</p>
              <p className="text-xs text-gray-500">{stats.w2Generated} W-2s generated</p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">1099 Vendors</p>
              <p className="text-2xl font-bold">{stats.vendorCount}</p>
              <p className="text-xs text-gray-500">{stats.form1099Generated} 1099s generated</p>
            </div>
            <BuildingOfficeIcon className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Last Generation</p>
              <p className="text-sm font-semibold">
                {stats.lastGeneration ? 
                  new Date(stats.lastGeneration.created_at).toLocaleDateString() : 
                  'Never'
                }
              </p>
              {stats.lastGeneration && (
                <p className="text-xs text-gray-500">
                  Status: {stats.lastGeneration.status}
                </p>
              )}
            </div>
            <DocumentTextIcon className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveTab('w2')}
            className="flex items-center justify-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <DocumentTextIcon className="h-5 w-5 text-blue-600" />
            <span>Manage W-2 Forms</span>
          </button>
          
          <button
            onClick={() => setActiveTab('1099')}
            className="flex items-center justify-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <DocumentTextIcon className="h-5 w-5 text-purple-600" />
            <span>Manage 1099 Forms</span>
          </button>
          
          <button
            onClick={handleGenerateAll}
            disabled={loading}
            className="flex items-center justify-center space-x-2 p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <StandardSpinner size="small" />
            ) : (
              <>
                <ArrowDownTrayIcon className="h-5 w-5" />
                <span>Generate All Forms</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Important Dates */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Important Deadlines</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium">W-2 Distribution to Employees</p>
                <p className="text-sm text-gray-600">Must be provided by January 31</p>
              </div>
            </div>
            <span className="text-sm font-medium text-yellow-600">
              {new Date(stats.currentYear + 1, 0, 31).toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium">1099-NEC Distribution to Recipients</p>
                <p className="text-sm text-gray-600">Must be provided by January 31</p>
              </div>
            </div>
            <span className="text-sm font-medium text-yellow-600">
              {new Date(stats.currentYear + 1, 0, 31).toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <DocumentTextIcon className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">W-3 & W-2 Filing with SSA</p>
                <p className="text-sm text-gray-600">Electronic filing deadline</p>
              </div>
            </div>
            <span className="text-sm font-medium text-blue-600">
              {new Date(stats.currentYear + 1, 0, 31).toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <DocumentTextIcon className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">1096 & 1099 Filing with IRS</p>
                <p className="text-sm text-gray-600">Paper filing deadline (Electronic: March 31)</p>
              </div>
            </div>
            <span className="text-sm font-medium text-blue-600">
              {new Date(stats.currentYear + 1, 1, 28).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black flex items-center">
          <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
          Year-End Tax Forms
        </h1>
        <p className="text-gray-600 mt-1">Generate and manage W-2, 1099, and other year-end tax forms</p>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('w2')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'w2'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            W-2 Forms
          </button>
          <button
            onClick={() => setActiveTab('1099')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === '1099'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            1099 Forms
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Generation History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {loading && activeTab === 'overview' ? (
        <div className="flex justify-center items-center h-64">
          <StandardSpinner />
        </div>
      ) : (
        <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'w2' && <W2Management taxYear={stats.currentYear} />}
          {activeTab === '1099' && <Form1099Management taxYear={stats.currentYear} />}
          {activeTab === 'history' && <GenerationHistory />}
        </>
      )}
    </div>
  );
};

export default YearEndTaxDashboard;