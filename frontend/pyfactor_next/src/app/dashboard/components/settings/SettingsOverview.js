'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessionContext } from '@/providers/SessionProvider';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Building,
  Users,
  Shield,
  CreditCard,
  Calculator,
  Wallet,
  MapPin,
  Puzzle,
  FileText,
  DollarSign,
  Star,
  FolderOpen,
  History,
  Server
} from 'lucide-react';

const SettingsOverview = ({ onItemClick }) => {
  const { t } = useTranslation('settings');
  const { user } = useSessionContext();
  const { isOwner, isAdmin, isOwnerOrAdmin } = usePermissions();
  const [hoveredItem, setHoveredItem] = useState(null);

  // Settings grid configuration with proper permissions
  const settingsItems = [
    {
      id: 'business',
      title: 'Business',
      description: 'Company profile, business information and branding',
      icon: Building,
      color: 'bg-blue-500',
      value: 'company-profile',
      requiredRole: 'user'
    },
    {
      id: 'users',
      title: 'Users',
      description: 'Manage team members, roles and permissions',
      icon: Users,
      color: 'bg-green-500',
      value: 'user-management',
      requiredRole: 'admin'
    },
    {
      id: 'permission-templates',
      title: 'Permissions',
      description: 'Configure permission templates for different roles',
      icon: Star,
      color: 'bg-purple-500',
      value: 'permission-templates',
      requiredRole: 'admin'
    },
    {
      id: 'departments',
      title: 'Departments',
      description: 'Organize users into departments and teams',
      icon: FolderOpen,
      color: 'bg-indigo-500',
      value: 'departments',
      requiredRole: 'admin'
    },
    {
      id: 'audit-log',
      title: 'Audit Log',
      description: 'Track permission changes and system access',
      icon: History,
      color: 'bg-gray-500',
      value: 'audit-log',
      requiredRole: 'admin'
    },
    {
      id: 'banking',
      title: 'Banking',
      description: 'Connect and manage bank accounts for payments',
      icon: Server,
      color: 'bg-teal-500',
      value: 'bank-connections',
      requiredRole: 'admin'
    },
    {
      id: 'currency',
      title: 'Currency',
      description: 'Set your business currency preferences',
      icon: DollarSign,
      color: 'bg-yellow-500',
      value: 'currency',
      requiredRole: 'user'
    },
    {
      id: 'accounting',
      title: 'Accounting',
      description: 'Configure accounting standards and reporting',
      icon: FileText,
      color: 'bg-orange-500',
      value: 'accounting',
      requiredRole: 'admin'
    },
    {
      id: 'taxes',
      title: 'Taxes',
      description: 'Configure tax rates and filing settings',
      icon: Calculator,
      color: 'bg-red-500',
      value: 'taxes',
      requiredRole: 'admin'
    },
    {
      id: 'payroll',
      title: 'Payroll',
      description: 'Payroll settings and payment schedules',
      icon: Wallet,
      color: 'bg-pink-500',
      value: 'payroll',
      requiredRole: 'admin'
    },
    {
      id: 'geofencing',
      title: 'Geofencing',
      description: 'Set up location-based clock in/out zones',
      icon: MapPin,
      color: 'bg-cyan-500',
      value: 'geofencing',
      requiredRole: 'admin'
    },
    {
      id: 'billing',
      title: 'Billing',
      description: 'Manage subscriptions and payment methods',
      icon: CreditCard,
      color: 'bg-emerald-500',
      value: 'billing-subscriptions',
      requiredRole: 'owner'
    },
    {
      id: 'integrations',
      title: 'Integrations',
      description: 'Connect with external services and APIs',
      icon: Puzzle,
      color: 'bg-violet-500',
      value: 'integrations',
      requiredRole: 'user'
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Security settings and two-factor authentication',
      icon: Shield,
      color: 'bg-rose-500',
      value: 'security',
      requiredRole: 'admin'
    }
  ];

  // Filter items based on user permissions
  const availableItems = settingsItems.filter(item => {
    if (item.requiredRole === 'owner') return isOwner();
    if (item.requiredRole === 'admin') return isOwnerOrAdmin();
    return true; // 'user' level - everyone can access
  });

  const handleItemClick = (item) => {
    console.log('[SettingsOverview] Item clicked:', item);
    if (onItemClick) {
      onItemClick(item.value);
    }
    // Dispatch event for navigation
    window.dispatchEvent(new CustomEvent('settingsNavigation', { 
      detail: { section: item.value } 
    }));
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Settings
        </h1>
        <p className="text-gray-600">
          Manage your account, business settings, and system preferences
        </p>
      </div>

      {/* Grid Layout - 4 columns on desktop, responsive on smaller screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {availableItems.map((item) => {
          const Icon = item.icon;
          const isHovered = hoveredItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`
                relative bg-white rounded-xl border border-gray-200 p-6
                transition-all duration-200 cursor-pointer
                hover:shadow-lg hover:border-gray-300 hover:scale-[1.02]
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${isHovered ? 'shadow-lg' : 'shadow-sm'}
              `}
            >
              {/* Icon Container */}
              <div className={`
                w-12 h-12 rounded-lg ${item.color} bg-opacity-10 
                flex items-center justify-center mb-4
                transition-all duration-200
                ${isHovered ? 'scale-110' : ''}
              `}>
                <Icon className={`w-6 h-6 ${item.color.replace('bg-', 'text-')}`} />
              </div>

              {/* Content */}
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {item.description}
                </p>
              </div>

              {/* Hover Effect Arrow */}
              {isHovered && (
                <div className="absolute top-4 right-4 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}

              {/* Permission Badge for Admin/Owner only items */}
              {item.requiredRole === 'owner' && (
                <div className="absolute top-2 right-2">
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                    Owner Only
                  </span>
                </div>
              )}
              {item.requiredRole === 'admin' && !isOwner() && (
                <div className="absolute top-2 right-2">
                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                    Admin
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty State if no permissions */}
      {availableItems.length === 0 && (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Settings Available
          </h3>
          <p className="text-gray-500">
            You don't have permission to access any settings sections.
          </p>
        </div>
      )}
    </div>
  );
};

export default SettingsOverview;