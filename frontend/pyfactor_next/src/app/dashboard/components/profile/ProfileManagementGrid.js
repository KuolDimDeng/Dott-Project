'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/hooks/useSession-v2';
import { useNotification } from '@/context/NotificationContext';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import dynamic from 'next/dynamic';

// Import the overview grid
import ProfileOverview from './ProfileOverview';

// Import individual components that are used in the Profile tabs
import EmployeeInfo from '@/app/profile/components/EmployeeInfo';
import TimesheetTab from '@/app/profile/components/TimesheetTab';
import SupervisorApprovals from '@/components/Timesheet/SupervisorApprovals';
import PayStubViewer from '@/components/PayStubViewer';

// Dynamically import the ProfilePageContent to extract just the content
const ProfilePageContent = dynamic(() => import('./ProfilePageContent'), {
  loading: () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ),
  ssr: false
});

const ProfileManagementGrid = () => {
  const { t } = useTranslation('profile');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useSession();
  const { notifySuccess, notifyError } = useNotification();
  
  // State for navigation
  const [currentView, setCurrentView] = useState('overview');
  const [selectedSection, setSelectedSection] = useState(null);

  // Section metadata for display
  const sectionMetadata = {
    'profile': { title: 'My Profile', description: 'View and edit your personal information' },
    'pay': { title: 'Pay & Compensation', description: 'View your payment and compensation details' },
    'documents': { title: 'Documents', description: 'Access your employment documents' },
    'timesheet': { title: 'Timesheets', description: 'Manage your timesheets and hours' },
    'organization': { title: 'Organization', description: 'View the organization structure' },
    'security': { title: 'Security', description: 'Manage your security settings' }
  };

  // Handle navigation from overview
  const handleSectionClick = (sectionId) => {
    console.log('[ProfileManagementGrid] Navigating to section:', sectionId);
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
    const handleProfileNavigation = (event) => {
      const { section } = event.detail;
      console.log('[ProfileManagementGrid] Navigation event received:', section);
      if (section) {
        handleSectionClick(section);
      }
    };

    window.addEventListener('profileNavigation', handleProfileNavigation);
    return () => {
      window.removeEventListener('profileNavigation', handleProfileNavigation);
    };
  }, []);

  // Handle initial tab parameter from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && sectionMetadata[tab]) {
      setSelectedSection(tab);
      setCurrentView('detail');
    }
  }, [searchParams]);

  const sectionInfo = selectedSection ? sectionMetadata[selectedSection] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'overview' ? (
        <ProfileOverview onItemClick={handleSectionClick} />
      ) : (
        <div className="h-full">
          {/* Back Button Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <button
              onClick={handleBackToOverview}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">Back to Profile Overview</span>
            </button>
            {sectionInfo && (
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {sectionInfo.title}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {sectionInfo.description}
                </p>
              </div>
            )}
          </div>
          
          {/* Component Content - Render only the specific tab content */}
          <div className="p-6">
            <ProfilePageContent 
              activeTab={selectedSection}
              hideTabNavigation={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileManagementGrid;