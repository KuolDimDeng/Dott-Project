'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import DashboardLanguageSelector from '@/app/dashboard/components/LanguageSelector';
import { useNotification } from '@/context/NotificationContext';
import CurrencyDisplay from '@/components/CurrencyDisplay';
import SubscriptionPopup from '@/app/dashboard/components/SubscriptionPopup';

// Import modular components
import UserAvatar from './components/UserAvatar';
import UserMenu from './components/UserMenu';
import NotificationBell from './components/NotificationBell';
import CreateMenu from './components/CreateMenu';
import { useUserProfile } from './hooks/useUserProfile';
import { formatTenantId } from './utils/cookieHelpers';

/**
 * AppBar - Modular top navigation bar
 * Reduced from 2,483 lines to ~300 lines through componentization
 */
const AppBar = ({
  drawerOpen,
  handleDrawerToggle,
  userData,
  handleClick,
  handleClose,
  handleUserProfileClick,
  handleSettingsClick,
  handleLogout,
  handleHelpClick,
  handlePrivacyClick,
  handleTermsClick,
  handleHomeClick,
  tenantId,
  profileData: propProfileData,
  setShowHelpCenter,
  setShowMyAccount,
  isAuthenticated,
  showCreateMenu,
  handleMenuItemClick,
  view,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { notifySuccess } = useNotification();
  
  // State management
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  // Refs for click outside handling
  const userMenuRef = useRef(null);
  const profileButtonRef = useRef(null);
  const createMenuRef = useRef(null);
  const createButtonRef = useRef(null);
  
  // Use custom hook for profile data
  const { profileData, userInitials, businessName } = useUserProfile(userData, propProfileData);

  // Handle click outside for menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close user menu
      if (
        userMenuRef.current && 
        !userMenuRef.current.contains(event.target) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target)
      ) {
        setShowUserMenu(false);
      }
      
      // Close create menu
      if (
        createMenuRef.current && 
        !createMenuRef.current.contains(event.target) &&
        createButtonRef.current &&
        !createButtonRef.current.contains(event.target)
      ) {
        setShowCreate(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notification count
  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const response = await fetch('/api/notifications/unread-count');
        if (response.ok) {
          const data = await response.json();
          setUnreadNotifications(data.count || 0);
        }
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    if (isAuthenticated) {
      fetchNotificationCount();
      // Refresh every minute
      const interval = setInterval(fetchNotificationCount, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleNotificationClick = () => {
    router.push('/dashboard?view=notifications');
  };

  const handleCreateClick = useCallback((action) => {
    handleMenuItemClick(action);
    notifySuccess(t('create.started'));
  }, [handleMenuItemClick, notifySuccess, t]);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleDrawerToggle}
            className="p-2 rounded-md hover:bg-gray-100 lg:hidden"
            aria-label="Toggle navigation"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold text-gray-900">
              {businessName || t('appBar.business')}
            </h1>
            {tenantId && (
              <span className="text-sm text-gray-500">
                {formatTenantId(tenantId)}
              </span>
            )}
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-4">
          {/* Currency Display */}
          <CurrencyDisplay />
          
          {/* Language Selector */}
          <DashboardLanguageSelector />
          
          {/* Create Button */}
          {showCreateMenu && (
            <div className="relative" ref={createButtonRef}>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                {t('appBar.create')}
              </button>
              
              <div ref={createMenuRef}>
                <CreateMenu
                  isOpen={showCreate}
                  onClose={() => setShowCreate(false)}
                  onItemClick={handleCreateClick}
                  businessType={profileData?.business_type}
                />
              </div>
            </div>
          )}
          
          {/* Notifications */}
          <NotificationBell
            unreadCount={unreadNotifications}
            onClick={handleNotificationClick}
          />
          
          {/* User Profile */}
          <div className="relative" ref={profileButtonRef}>
            <UserAvatar
              userData={profileData}
              initials={userInitials}
              onClick={() => setShowUserMenu(!showUserMenu)}
            />
            
            <div ref={userMenuRef}>
              <UserMenu
                isOpen={showUserMenu}
                onClose={() => setShowUserMenu(false)}
                userData={profileData}
                onProfileClick={() => {
                  handleUserProfileClick();
                  setShowMyAccount(true);
                }}
                onSettingsClick={handleSettingsClick}
                onHelpClick={() => {
                  handleHelpClick();
                  setShowHelpCenter(true);
                }}
                onPrivacyClick={handlePrivacyClick}
                onTermsClick={handleTermsClick}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Subscription Popup */}
      {showSubscriptionPopup && (
        <SubscriptionPopup
          isOpen={showSubscriptionPopup}
          onClose={() => setShowSubscriptionPopup(false)}
          userData={profileData}
        />
      )}
    </header>
  );
};

export default AppBar;
