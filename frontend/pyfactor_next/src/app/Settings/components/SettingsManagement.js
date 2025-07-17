'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSessionContext } from '@/providers/SessionProvider';
import { useNotification } from '@/context/NotificationContext';
import { useProfile } from '@/hooks/useProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { logger } from '@/utils/logger';
import usersApi from '@/utils/api/usersApi';
import api from '@/utils/api';

// Import components
import UserManagement from './sections/UserManagement';
import CompanyProfile from './sections/CompanyProfile';
import BillingSubscriptions from './sections/BillingSubscriptions';
import SecuritySettings from './sections/SecuritySettings';
import Integrations from './sections/Integrations';
import BankConnections from './sections/BankConnections';
import PayrollSettings from './sections/PayrollSettings';

// Import icons
import { 
  UserGroupIcon, 
  BuildingOfficeIcon, 
  CreditCardIcon,
  ShieldCheckIcon,
  PuzzlePieceIcon,
  BanknotesIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

const SettingsManagement = () => {
  const { user } = useSessionContext();
  const { profileData, loading: profileLoading } = useProfile();
  const { notifySuccess, notifyError } = useNotification();
  const { isOwner, isAdmin, isOwnerOrAdmin } = usePermissions();
  
  // State management - Initialize to null to wait for permissions
  const [activeSection, setActiveSection] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Settings sections configuration - updated based on requirements
  const settingsSections = [
    {
      id: 'company-profile',
      title: 'Company Profile',
      icon: BuildingOfficeIcon,
      description: 'View and update company information',
      component: CompanyProfile,
      requiredRole: 'user' // All users can view, but editing is restricted
    },
    {
      id: 'user-management',
      title: 'User Management',
      icon: UserGroupIcon,
      description: 'Manage user access, roles, and permissions',
      component: UserManagement,
      requiredRole: 'admin' // Admin and Owner can access
    },
    {
      id: 'bank-connections',
      title: 'Bank Connections',
      icon: BanknotesIcon,
      description: 'Connect bank accounts for payroll, payments, and transfers',
      component: BankConnections,
      requiredRole: 'admin' // Only admin and owner can access
    },
    {
      id: 'payroll',
      title: 'Payroll',
      icon: CurrencyDollarIcon,
      description: 'Configure pay periods, pay dates, and payroll settings',
      component: PayrollSettings,
      requiredRole: 'admin' // Only admin and owner can access
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
      id: 'integrations',
      title: 'Integrations',
      icon: PuzzlePieceIcon,
      description: 'Connect and manage third-party app integrations',
      component: Integrations,
      requiredRole: 'user' // All users can access
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

  // Set default section when permissions are loaded
  useEffect(() => {
    // If activeSection is null (initial load) and we have available sections
    if (activeSection === null && availableSections.length > 0) {
      // Prefer company-profile if available, otherwise use first available
      const companyProfileSection = availableSections.find(s => s.id === 'company-profile');
      setActiveSection(companyProfileSection ? 'company-profile' : availableSections[0].id);
    }
    // If current section is not available anymore (permissions changed)
    else if (activeSection && !availableSections.find(section => section.id === activeSection)) {
      setActiveSection(availableSections[0]?.id || 'company-profile');
    }
  }, [activeSection, availableSections]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="py-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Settings tabs">
              {availableSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`
                      group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                      transition-all duration-200
                      ${isActive 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon 
                      className={`mr-2 h-5 w-5 ${
                        isActive 
                          ? 'text-blue-600' 
                          : 'text-gray-400 group-hover:text-gray-500'
                      }`} 
                    />
                    <span>{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <main>
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
  );
};

export default SettingsManagement;
