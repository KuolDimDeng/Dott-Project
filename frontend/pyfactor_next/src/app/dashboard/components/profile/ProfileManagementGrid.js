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

// Dynamically import the original Profile page to avoid loading all its dependencies upfront
const ProfilePage = dynamic(() => import('@/app/profile/page'), {
  loading: () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
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
    'profile': { title: 'My Profile', icon: 'User' },
    'pay': { title: 'Pay & Compensation', icon: 'Wallet' },
    'documents': { title: 'Documents', icon: 'FileText' },
    'timesheet': { title: 'Timesheets', icon: 'Clock' },
    'organization': { title: 'Organization', icon: 'Building' },
    'security': { title: 'Security', icon: 'Shield' }
  };

  // Map sections to existing tabs in ProfilePage
  const sectionToTabMap = {
    'profile': 'profile',
    'pay': 'pay',
    'documents': 'documents',
    'timesheet': 'timesheet',
    'organization': 'organization',
    'security': 'security'
  };

  // Handle navigation from overview
  const handleSectionClick = (sectionId) => {
    console.log('[ProfileManagementGrid] Navigating to section:', sectionId);
    
    // Map the section to the corresponding tab
    const tabName = sectionToTabMap[sectionId] || 'profile';
    setSelectedSection(tabName);
    setCurrentView('detail');
  };

  // Handle back to overview
  const handleBackToOverview = () => {
    setCurrentView('overview');
    setSelectedSection(null);
    // Remove tab parameter from URL
    const url = new URL(window.location);
    url.searchParams.delete('tab');
    router.replace(url.pathname + url.search);
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
    if (tab) {
      setSelectedSection(tab);
      setCurrentView('detail');
    }
  }, [searchParams]);

  // Get the section info
  const getSectionInfo = () => {
    // Find the key that maps to the selected tab
    const sectionKey = Object.keys(sectionToTabMap).find(
      key => sectionToTabMap[key] === selectedSection
    ) || selectedSection;
    return sectionMetadata[sectionKey];
  };

  const sectionInfo = getSectionInfo();

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
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">Back to Profile Overview</span>
            </button>
            {sectionInfo && (
              <h2 className="text-2xl font-bold text-gray-900 mt-2">
                {sectionInfo.title}
              </h2>
            )}
          </div>
          
          {/* Component Content - Render the original ProfilePage with the selected tab */}
          <div className="p-6">
            <ProfilePageWrapper 
              initialTab={selectedSection} 
              onBackClick={handleBackToOverview}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Wrapper component to pass the selected tab to ProfilePage
const ProfilePageWrapper = ({ initialTab, onBackClick }) => {
  const router = useRouter();
  
  useEffect(() => {
    // Update URL with tab parameter
    if (initialTab) {
      const url = new URL(window.location);
      url.searchParams.set('tab', initialTab);
      router.replace(url.pathname + url.search);
    }
  }, [initialTab, router]);

  return <ProfilePage />;
};

export default ProfileManagementGrid;