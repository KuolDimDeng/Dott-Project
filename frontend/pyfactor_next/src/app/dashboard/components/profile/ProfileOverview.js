'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession-v2';
import { useTranslation } from 'react-i18next';
import {
  User,
  Wallet,
  FileText,
  Clock,
  Building,
  Shield
} from 'lucide-react';

const ProfileOverview = ({ onItemClick }) => {
  const { t } = useTranslation('profile');
  const { session } = useSession();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isSupervisor, setIsSupervisor] = useState(false);

  // Check if user is a supervisor
  useEffect(() => {
    if (session?.employee) {
      setIsSupervisor(session.employee.is_supervisor || false);
    }
  }, [session]);

  // Profile grid configuration - Only essential sections
  const profileItems = [
    {
      id: 'profile',
      title: 'My Profile',
      description: 'View and edit your personal information and photo',
      icon: User,
      color: 'bg-blue-500',
      value: 'profile',
      available: true
    },
    {
      id: 'pay',
      title: 'Pay & Compensation',
      description: 'View pay stubs, salary details, and payment history',
      icon: Wallet,
      color: 'bg-green-500',
      value: 'pay',
      available: true
    },
    {
      id: 'documents',
      title: 'Documents',
      description: 'Access employment documents, contracts, and forms',
      icon: FileText,
      color: 'bg-purple-500',
      value: 'documents',
      available: true
    },
    {
      id: 'timesheet',
      title: 'Timesheets',
      description: 'Submit and track your working hours and attendance',
      icon: Clock,
      color: 'bg-orange-500',
      value: 'timesheet',
      available: true
    },
    {
      id: 'organization',
      title: 'Organization',
      description: 'View company org chart and team structure',
      icon: Building,
      color: 'bg-indigo-500',
      value: 'organization',
      available: true
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Manage login sessions and two-factor authentication',
      icon: Shield,
      color: 'bg-red-500',
      value: 'security',
      available: true
    }
  ];

  // Filter available items
  const availableItems = profileItems.filter(item => item.available);

  const handleItemClick = (item) => {
    console.log('[ProfileOverview] Item clicked:', item);
    if (onItemClick) {
      onItemClick(item.value);
    }
    // Dispatch event for navigation
    window.dispatchEvent(new CustomEvent('profileNavigation', { 
      detail: { section: item.value } 
    }));
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          {/* User Avatar */}
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {session?.user?.first_name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {session?.user?.first_name && session?.user?.last_name 
                ? `${session.user.first_name} ${session.user.last_name}`
                : session?.user?.email || 'My Profile'}
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your profile, security, and preferences
            </p>
            {isSupervisor && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                Supervisor
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid Layout - 3 columns on desktop, responsive on smaller screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                ${!item.available ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              disabled={!item.available}
            >
              {/* Icon Container */}
              <div className={`
                w-12 h-12 rounded-lg ${item.color} bg-opacity-10 
                flex items-center justify-center mb-4
                transition-all duration-200
                ${isHovered && item.available ? 'scale-110' : ''}
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
              {isHovered && item.available && (
                <div className="absolute top-4 right-4 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileOverview;