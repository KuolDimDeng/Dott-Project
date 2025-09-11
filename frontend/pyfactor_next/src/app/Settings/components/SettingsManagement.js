'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSessionContext } from '@/providers/SessionProvider';
import { useNotification } from '@/context/NotificationContext';
import { useProfile } from '@/hooks/useProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { logger } from '@/utils/logger';
import usersApi from '@/utils/api/usersApi';
import api from '@/utils/api';
import { useTranslation } from 'react-i18next';

// Import components
import UserManagement from './sections/UserManagement';
import EnhancedUserManagement from './sections/EnhancedUserManagement';
import PermissionTemplates from './sections/PermissionTemplates';
import DepartmentManagement from './sections/DepartmentManagement';
import PermissionAuditLog from './sections/PermissionAuditLog';
import CompanyProfile from './sections/CompanyProfile';
import BillingSubscriptions from './sections/BillingSubscriptions';
import FeatureModules from './sections/FeatureModules';
import SecuritySettings from './sections/SecuritySettings';
import Integrations from './sections/Integrations';
import BankingSettings from '../banking/page';
import PayrollSettings from './sections/PayrollSettings';
import GeofencingSettings from './sections/GeofencingSettingsSimple';
import TaxSettings from './sections/TaxSettings';
import CurrencySettings from './sections/CurrencySettings';
import Accounting from './sections/Accounting';
// import WhatsAppSettings from './sections/WhatsAppSettings'; // REMOVED - WhatsApp is in Integrations

// Import icons
import { 
  UserGroupIcon, 
  BuildingOfficeIcon, 
  CreditCardIcon,
  ShieldCheckIcon,
  PuzzlePieceIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  ChatBubbleLeftRightIcon,
  CalculatorIcon,
  BuildingLibraryIcon,
  DocumentTextIcon,
  SparklesIcon,
  ClipboardDocumentListIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';

const SettingsManagement = () => {
  const { t } = useTranslation('settings');
  const { user } = useSessionContext();
  const { profileData, loading: profileLoading } = useProfile();
  const { notifySuccess, notifyError } = useNotification();
  const { isOwner, isAdmin, isOwnerOrAdmin } = usePermissions();
  
  // State management - Initialize to null to wait for permissions
  const [activeSection, setActiveSection] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Settings sections configuration - updated based on requirements
  // IMPORTANT NOTE: DO NOT ADD WHATSAPP TAB HERE - It's already in Integrations section
  const settingsSections = [
    {
      id: 'company-profile',
      title: 'Business', // Changed from Company Profile
      icon: BuildingOfficeIcon,
      description: t('general.businessInfo'),
      component: CompanyProfile,
      requiredRole: 'user' // All users can view, but editing is restricted
    },
    {
      id: 'user-management',
      title: 'Users', // Changed from User Management
      icon: UserGroupIcon,
      description: t('userManagement.title'),
      component: EnhancedUserManagement, // Use enhanced version
      requiredRole: 'admin' // Admin and Owner can access
    },
    {
      id: 'permission-templates',
      title: 'Permission Templates',
      icon: SparklesIcon,
      description: 'Manage permission templates for roles',
      component: PermissionTemplates,
      requiredRole: 'admin' // Admin and Owner can access
    },
    {
      id: 'departments',
      title: 'Departments',
      icon: BuildingOfficeIcon,
      description: 'Organize users into departments',
      component: DepartmentManagement,
      requiredRole: 'admin' // Admin and Owner can access
    },
    {
      id: 'audit-log',
      title: 'Audit Log',
      icon: ClipboardDocumentListIcon,
      description: 'Track permission changes and access',
      component: PermissionAuditLog,
      requiredRole: 'admin' // Admin and Owner can access
    },
    {
      id: 'bank-connections',
      title: 'Banking', // Changed from Bank Connections
      icon: BuildingLibraryIcon,
      description: 'Connect and manage bank accounts for payments and payroll',
      component: BankingSettings,
      requiredRole: 'admin' // Only admin and owner can access
    },
    {
      id: 'currency',
      title: 'Currency',
      icon: CurrencyDollarIcon,
      description: 'Set your business currency for invoices and reports',
      component: CurrencySettings,
      requiredRole: 'user' // All users can view their currency
    },
    {
      id: 'accounting',
      title: 'Accounting',
      icon: DocumentTextIcon,
      description: 'Configure accounting standards and financial reporting settings',
      component: Accounting,
      requiredRole: 'admin' // Only admin and owner can access
    },
    {
      id: 'taxes',
      title: 'Taxes',
      icon: CalculatorIcon,
      description: 'Configure sales tax rates and settings',
      component: TaxSettings,
      requiredRole: 'admin' // Only admin and owner can access
    },
    {
      id: 'payroll',
      title: t('tabs.payroll'),
      icon: BanknotesIcon,
      description: t('payroll.title'),
      component: PayrollSettings,
      requiredRole: 'admin' // Only admin and owner can access
    },
    {
      id: 'geofencing',
      title: t('tabs.geofencing'),
      icon: MapPinIcon,
      description: t('geofencing.title'),
      component: GeofencingSettings,
      requiredRole: 'admin' // Only admin and owner can access
    },
    {
      id: 'billing-subscriptions',
      title: t('tabs.billing'),
      icon: CreditCardIcon,
      description: t('billing.title'),
      component: BillingSubscriptions,
      requiredRole: 'owner' // Only owner can access
    },
    {
      id: 'feature-modules',
      title: 'Features',
      icon: SparklesIcon,
      description: 'Manage à la carte features for your business',
      component: FeatureModules,
      requiredRole: 'user' // All users can view, but only owner can modify
    },
    {
      id: 'integrations',
      title: t('tabs.integrations'),
      icon: PuzzlePieceIcon,
      description: t('integrations.title'),
      component: Integrations,
      requiredRole: 'user' // All users can access
    },
    // NOTE: WhatsApp tab removed - functionality is in Integrations section
    {
      id: 'security',
      title: t('tabs.security'),
      icon: ShieldCheckIcon,
      description: t('security.title'),
      component: SecuritySettings,
      requiredRole: 'admin' // Admin and Owner can access - MOVED TO END
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
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('subtitle')}
          </p>
        </div>

        {/* Tab Navigation - Responsive Grid */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex flex-wrap" aria-label="Settings tabs">
              {availableSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`
                      group flex items-center whitespace-nowrap gap-2 py-4 px-3 sm:px-4 border-b-2 font-medium text-sm
                      transition-all duration-200 flex-grow sm:flex-grow-0
                      ${isActive 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon 
                      className={`h-5 w-5 ${
                        isActive 
                          ? 'text-blue-600' 
                          : 'text-gray-400 group-hover:text-gray-500'
                      }`} 
                    />
                    <span className="text-center text-xs sm:text-sm">{section.title}</span>
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
