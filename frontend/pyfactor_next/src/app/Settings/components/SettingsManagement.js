'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { useProfile } from '@/hooks/useProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { logger } from '@/utils/logger';
import usersApi from '@/utils/api/usersApi';
import api from '@/utils/api';

// Import components
import UserManagementEnhanced from './sections/UserManagementEnhanced';
import CompanyProfile from './sections/CompanyProfile';
import BillingSubscriptions from './sections/BillingSubscriptions';
import SecuritySettings from './sections/SecuritySettings';

// Import icons
import { 
  UserGroupIcon, 
  BuildingOfficeIcon, 
  CreditCardIcon,
  ShieldCheckIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const SettingsManagement = () => {
  const { user } = useAuth();
  const { profileData, loading: profileLoading } = useProfile();
  const { notifySuccess, notifyError } = useNotification();
  const { isOwner, isAdmin, isOwnerOrAdmin } = usePermissions();
  
  // State management
  const [activeSection, setActiveSection] = useState('user-management');
  const [loading, setLoading] = useState(false);
  
  // Settings sections configuration - updated based on requirements
  const settingsSections = [
    {
      id: 'user-management',
      title: 'User Management',
      icon: UserGroupIcon,
      description: 'Manage user access, roles, and permissions',
      component: UserManagementEnhanced,
      requiredRole: 'admin' // Admin and Owner can access
    },
    {
      id: 'company-profile',
      title: 'Company Profile',
      icon: BuildingOfficeIcon,
      description: 'View and update company information',
      component: CompanyProfile,
      requiredRole: 'user' // All users can view, but editing is restricted
    },
    {
      id: 'billing-subscriptions',
      title: 'Billing & Subscriptions',
      icon: CreditCardIcon,
      description: 'Manage your subscription and view billing history',
      component: BillingSubscriptions,
      requiredRole: 'owner' // Only owner can access
    },
    {
      id: 'security',
      title: 'Security',
      icon: ShieldCheckIcon,
      description: 'MFA, audit trail, and compliance settings',
      component: SecuritySettings,
      requiredRole: 'admin' // Admin and Owner can access
    }
  ];

  // Filter sections based on user permissions
  const availableSections = settingsSections.filter(section => {
    if (section.requiredRole === 'owner') return isOwner();
    if (section.requiredRole === 'admin') return isOwnerOrAdmin();
    return true; // 'user' level - everyone can access
  });

  // Get active section component
  const ActiveSectionComponent = availableSections.find(
    section => section.id === activeSection
  )?.component;

  // Set default section if current is not available
  useEffect(() => {
    if (!availableSections.find(section => section.id === activeSection)) {
      setActiveSection(availableSections[0]?.id || 'company-profile');
    }
  }, [activeSection, availableSections]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Sidebar Navigation */}
          <nav className="lg:w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
            <div className="p-4">
              <ul className="space-y-1">
                {availableSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  
                  return (
                    <li key={section.id}>
                      <button
                        onClick={() => setActiveSection(section.id)}
                        className={`
                          w-full flex items-center justify-between px-4 py-3 rounded-lg
                          transition-all duration-200 group
                          ${isActive 
                            ? 'bg-blue-50 text-blue-700 font-medium' 
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                      >
                        <div className="flex items-center">
                          <Icon 
                            className={`h-5 w-5 mr-3 ${
                              isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'
                            }`} 
                          />
                          <span className="text-sm">{section.title}</span>
                        </div>
                        <ChevronRightIcon 
                          className={`h-4 w-4 ${
                            isActive ? 'text-blue-600' : 'text-gray-400'
                          }`} 
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* Main Content Area */}
          <main className="flex-1 p-6">
            <div className="bg-white shadow-sm rounded-lg">
              {ActiveSectionComponent ? (
                <ActiveSectionComponent 
                  user={user}
                  profileData={profileData}
                  isOwner={isOwner()}
                  isAdmin={isOwnerOrAdmin()}
                  notifySuccess={notifySuccess}
                  notifyError={notifyError}
                />
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>Select a section from the menu</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SettingsManagement;