'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  HomeIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import DashboardOverview from './DashboardOverview';
import TaxFeedbackManager from './TaxFeedbackManager';
import NotificationManager from './NotificationManager';
import UserManager from './UserManager';
import { useAdminAuth } from '../hooks/useAdminAuth';
import StandardSpinner, { CenteredSpinner } from '@/components/ui/StandardSpinner';

const navigation = [
  { id: 'overview', name: 'Overview', icon: HomeIcon },
  { id: 'notifications', name: 'Notifications', icon: BellIcon },
  { id: 'feedback', name: 'Tax Feedback', icon: ChatBubbleLeftRightIcon },
  { id: 'users', name: 'Users', icon: UserGroupIcon },
  { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
  { id: 'settings', name: 'Settings', icon: Cog6ToothIcon },
];

export default function AdminDashboard({ adminUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getAuthHeaders } = useAdminAuth();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        toast.error('Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Dashboard data error:', error);
      toast.error('Error loading dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      onLogout();
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <CenteredSpinner size="large" />
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <DashboardOverview data={dashboardData} onRefresh={loadDashboardData} />;
      case 'notifications':
        return <NotificationManager adminUser={adminUser} />;
      case 'feedback':
        return <TaxFeedbackManager adminUser={adminUser} />;
      case 'users':
        return <UserManager adminUser={adminUser} />;
      case 'analytics':
        return <div className="p-6 text-center text-gray-500">Analytics coming soon...</div>;
      case 'settings':
        return <div className="p-6 text-center text-gray-500">Settings coming soon...</div>;
      default:
        return <DashboardOverview data={dashboardData} onRefresh={loadDashboardData} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Dott Admin Portal</h1>
                <p className="text-sm text-gray-600">Staff Dashboard & Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Admin User Info */}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{adminUser.full_name}</p>
                <p className="text-xs text-gray-600">{adminUser.admin_role} • {adminUser.department}</p>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white shadow-sm h-screen sticky top-0">
          <div className="p-4">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = activeTab === item.id;
                const hasPermission = checkPermission(item.id, adminUser);
                
                return (
                  <button
                    key={item.id}
                    onClick={() => hasPermission && setActiveTab(item.id)}
                    disabled={!hasPermission}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : hasPermission
                        ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <item.icon className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-700' : ''}`} />
                    {item.name}
                    {!hasPermission && (
                      <ExclamationTriangleIcon className="h-4 w-4 ml-auto text-gray-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permission Badge */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs text-blue-800">
                <p className="font-medium">Access Level: {adminUser.admin_role}</p>
                <div className="mt-1 space-y-1">
                  {adminUser.permissions.can_send_notifications && (
                    <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs mr-1">
                      Send Notifications
                    </span>
                  )}
                  {adminUser.permissions.can_view_all_users && (
                    <span className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs mr-1">
                      View Users
                    </span>
                  )}
                  {adminUser.permissions.can_view_feedback && (
                    <span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs mr-1">
                      View Feedback
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

function checkPermission(tabId, adminUser) {
  const permissions = adminUser.permissions;
  
  switch (tabId) {
    case 'overview':
      return true; // Everyone can see overview
    case 'notifications':
      return permissions.can_send_notifications;
    case 'feedback':
      return permissions.can_view_feedback;
    case 'users':
      return permissions.can_view_all_users;
    case 'analytics':
      return permissions.can_view_all_users || adminUser.admin_role === 'super_admin';
    case 'settings':
      return adminUser.admin_role === 'super_admin';
    default:
      return false;
  }
}