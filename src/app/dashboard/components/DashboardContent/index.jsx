'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { useAuth } from '@/hooks/auth';
import axiosInstance from '@/lib/axiosConfig';
import { UserMessageProvider } from '@/contexts/userMessageContext';

function DashboardContent() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const [userData, setUserData] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [uiState, setUiState] = useState({
    showKPIDashboard: true,
    showMainDashboard: false,
    showHome: false
  });
  const [isLoading, setIsLoading] = useState(true);

  // Reset all UI state
  const resetAllStates = () => {
    setUiState({
      showKPIDashboard: false,
      showMainDashboard: false,
      showHome: false
    });
  };

  // Handle drawer toggle
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Handle main dashboard click
  const handleMainDashboardClick = () => {
    resetAllStates();
    setUiState(prev => ({ ...prev, showMainDashboard: true }));
  };

  // Handle KPI dashboard click
  const handleKPIDashboardClick = () => {
    resetAllStates();
    setUiState(prev => ({ ...prev, showKPIDashboard: true }));
  };

  // Handle home click
  const handleHomeClick = () => {
    resetAllStates();
    setUiState(prev => ({ ...prev, showHome: true }));
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      }
      router.push('/auth/signin');
    } catch (error) {
      logger.error('Logout error:', error);
    }
  };

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Get token from AppCache instead of localStorage
      const appCache = window.__APP_CACHE || {};
      const auth = appCache.auth || {};
      const token = auth.accessToken || '';
      
      const response = await axiosInstance.get('/api/profile/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (response.status === 200) {
        const data = response.data;
        logger.log('Dashboard User data:', data);
        data.first_name = data.first_name || data.email.split('@')[0];
        data.full_name = data.full_name || `${data.first_name} ${data.last_name}`;
        const activeSubscription = data.active_subscription;
        const subscriptionType = activeSubscription ? activeSubscription.subscription_type : 'free';
  
        setUserData({
          ...data,
          subscription_type: subscriptionType       
        });
        setIsLoading(false);
      } else {
        logger.error('Error fetching user data:', response.statusText);
        // Clear token from AppCache instead of localStorage
        if (window.__APP_CACHE && window.__APP_CACHE.auth) {
          delete window.__APP_CACHE.auth.accessToken;
        }
        router.push('/auth/signin');
      }
    } catch (error) {
      logger.error('Error fetching user data:', error);
      // Clear token from AppCache instead of localStorage
      if (window.__APP_CACHE && window.__APP_CACHE.auth) {
        delete window.__APP_CACHE.auth.accessToken;
      }
      router.push('/auth/signin');
    }
  }, [router]);

  // Initialize on component mount
  useEffect(() => {
    fetchUserData();
    resetAllStates();
    setUiState(prev => ({ ...prev, showKPIDashboard: true }));
  }, [fetchUserData]);

  // Render main content based on UI state
  const renderMainContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (uiState.showKPIDashboard) {
      return (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">KPI Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium">Sales</h3>
              <p className="text-3xl font-bold text-blue-600">$0</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium">Customers</h3>
              <p className="text-3xl font-bold text-green-600">0</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium">Orders</h3>
              <p className="text-3xl font-bold text-purple-600">0</p>
            </div>
          </div>
        </div>
      );
    }

    if (uiState.showMainDashboard) {
      return (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Main Dashboard</h2>
          <p>Welcome to your business dashboard. Here you can manage all aspects of your business.</p>
        </div>
      );
    }

    if (uiState.showHome) {
      return (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Home</h2>
          <p>Welcome home, {userData?.full_name || 'User'}.</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside 
        className={`bg-indigo-900 text-white w-64 fixed h-full transform transition-transform duration-300 ease-in-out ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5">
          <h2 className="text-2xl font-bold mb-6">Dott</h2>
          
          <nav className="mt-8">
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={handleKPIDashboardClick}
                  className={`flex items-center w-full p-3 rounded-lg transition ${
                    uiState.showKPIDashboard ? 'bg-indigo-800' : 'hover:bg-indigo-800'
                  }`}
                >
                  <span className="ml-3">KPI Dashboard</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={handleMainDashboardClick}
                  className={`flex items-center w-full p-3 rounded-lg transition ${
                    uiState.showMainDashboard ? 'bg-indigo-800' : 'hover:bg-indigo-800'
                  }`}
                >
                  <span className="ml-3">Main Dashboard</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={handleHomeClick}
                  className={`flex items-center w-full p-3 rounded-lg transition ${
                    uiState.showHome ? 'bg-indigo-800' : 'hover:bg-indigo-800'
                  }`}
                >
                  <span className="ml-3">Home</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${drawerOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <button 
              onClick={handleDrawerToggle}
              className="text-gray-600 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex items-center">
              <span className="mr-4">{userData?.full_name || 'User'}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="p-6">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <UserMessageProvider>
      <DashboardContent />
    </UserMessageProvider>
  );
} 