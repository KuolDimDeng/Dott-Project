'use client';

import React, { useState, useEffect } from 'react';
import { useSessionContext } from '@/providers/SessionProvider';
import { useNotification } from '@/context/NotificationContext';
import { useProfile } from '@/hooks/useProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Import the overview grid
import SettingsOverview from './SettingsOverview';

// Import all settings components
import EnhancedUserManagement from '@/app/Settings/components/sections/EnhancedUserManagement';
import PermissionTemplates from '@/app/Settings/components/sections/PermissionTemplates';
import DepartmentManagement from '@/app/Settings/components/sections/DepartmentManagement';
import PermissionAuditLog from '@/app/Settings/components/sections/PermissionAuditLog';
import CompanyProfile from '@/app/Settings/components/sections/CompanyProfile';
import BillingSubscriptions from '@/app/Settings/components/sections/BillingSubscriptions';
import SecuritySettings from '@/app/Settings/components/sections/SecuritySettings';
import Integrations from '@/app/Settings/components/sections/Integrations';
import BankingSettings from '@/app/Settings/banking/page';
import PayrollSettings from '@/app/Settings/components/sections/PayrollSettings';
import GeofencingSettings from '@/app/Settings/components/sections/GeofencingSettingsSimple';
import TaxSettings from '@/app/Settings/components/sections/TaxSettings';
import CurrencySettings from '@/app/Settings/components/sections/CurrencySettings';
import Accounting from '@/app/Settings/components/sections/Accounting';

const SettingsManagementGrid = () => {
  const { t } = useTranslation('settings');
  const { user } = useSessionContext();
  const { profileData } = useProfile();
  const { notifySuccess, notifyError } = useNotification();
  const { isOwner, isAdmin, isOwnerOrAdmin } = usePermissions();
  
  // State for navigation
  const [currentView, setCurrentView] = useState('overview');
  const [selectedSection, setSelectedSection] = useState(null);

  // Component mapping
  const componentMap = {
    'company-profile': CompanyProfile,
    'user-management': EnhancedUserManagement,
    'permission-templates': PermissionTemplates,
    'departments': DepartmentManagement,
    'audit-log': PermissionAuditLog,
    'bank-connections': BankingSettings,
    'currency': CurrencySettings,
    'accounting': Accounting,
    'taxes': TaxSettings,
    'payroll': PayrollSettings,
    'geofencing': GeofencingSettings,
    'billing-subscriptions': BillingSubscriptions,
    'integrations': Integrations,
    'security': SecuritySettings
  };

  // Section metadata for display
  const sectionMetadata = {
    'company-profile': { title: 'Business Settings', icon: 'Building' },
    'user-management': { title: 'User Management', icon: 'Users' },
    'permission-templates': { title: 'Permission Templates', icon: 'Star' },
    'departments': { title: 'Department Management', icon: 'FolderOpen' },
    'audit-log': { title: 'Audit Log', icon: 'History' },
    'bank-connections': { title: 'Banking Settings', icon: 'Server' },
    'currency': { title: 'Currency Settings', icon: 'DollarSign' },
    'accounting': { title: 'Accounting Settings', icon: 'FileText' },
    'taxes': { title: 'Tax Settings', icon: 'Calculator' },
    'payroll': { title: 'Payroll Settings', icon: 'Wallet' },
    'geofencing': { title: 'Geofencing Settings', icon: 'MapPin' },
    'billing-subscriptions': { title: 'Billing & Subscriptions', icon: 'CreditCard' },
    'integrations': { title: 'Integrations', icon: 'Puzzle' },
    'security': { title: 'Security Settings', icon: 'Shield' }
  };

  // Handle navigation from overview
  const handleSectionClick = (sectionId) => {
    console.log('[SettingsManagementGrid] Navigating to section:', sectionId);
    setSelectedSection(sectionId);
    setCurrentView('detail');
  };

  // Handle back to overview
  const handleBackToOverview = () => {
    setCurrentView('overview');
    setSelectedSection(null);
  };

  // Listen for navigation events
  useEffect(() => {
    const handleSettingsNavigation = (event) => {
      const { section } = event.detail;
      console.log('[SettingsManagementGrid] Navigation event received:', section);
      if (section) {
        handleSectionClick(section);
      }
    };

    window.addEventListener('settingsNavigation', handleSettingsNavigation);
    return () => {
      window.removeEventListener('settingsNavigation', handleSettingsNavigation);
    };
  }, []);

  // Get the active component
  const ActiveComponent = selectedSection ? componentMap[selectedSection] : null;
  const sectionInfo = selectedSection ? sectionMetadata[selectedSection] : null;

  // Check permissions for selected section
  const hasPermission = (sectionId) => {
    if (!sectionId) return true;
    
    // Define permission requirements
    const ownerOnlySections = ['billing-subscriptions'];
    const adminSections = [
      'user-management', 'permission-templates', 'departments', 
      'audit-log', 'bank-connections', 'accounting', 'taxes', 
      'payroll', 'geofencing', 'security'
    ];
    
    if (ownerOnlySections.includes(sectionId)) return isOwner();
    if (adminSections.includes(sectionId)) return isOwnerOrAdmin();
    return true;
  };

  // Permission check
  if (selectedSection && !hasPermission(selectedSection)) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-red-900 mb-2">
            Access Denied
          </h3>
          <p className="text-red-700">
            You don't have permission to access this settings section.
          </p>
          <button
            onClick={handleBackToOverview}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Back to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'overview' ? (
        <SettingsOverview onItemClick={handleSectionClick} />
      ) : (
        <div className="h-full">
          {/* Back Button Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <button
              onClick={handleBackToOverview}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">Back to Settings</span>
            </button>
            {sectionInfo && (
              <h2 className="text-2xl font-bold text-gray-900 mt-2">
                {sectionInfo.title}
              </h2>
            )}
          </div>
          
          {/* Component Content */}
          <div className="p-6">
            {ActiveComponent ? (
              <ActiveComponent 
                userData={user}
                profileData={profileData}
                onUpdate={(data) => {
                  notifySuccess('Settings updated successfully');
                  console.log('[SettingsManagementGrid] Settings updated:', data);
                }}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  Settings component not found
                </p>
                <button
                  onClick={handleBackToOverview}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Back to Settings
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsManagementGrid;