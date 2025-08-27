// Mobile App Entry Point with Offline Support
import React, { useEffect, useState } from 'react';
import offlineManager from '@/utils/offline-manager';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export default function MobileApp() {
  const [isOnline, setIsOnline] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check network status
      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      setIsOnline(status.connected);

      // Listen for network changes
      Network.addListener('networkStatusChange', (status) => {
        setIsOnline(status.connected);
      });

      // Try to load user session
      await loadUserSession();
      
      // Load dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserSession = async () => {
    try {
      // First try to get from local storage
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key: 'user_session' });
      
      if (value) {
        const session = JSON.parse(value);
        setUser(session);
      }

      // Then try to refresh from server if online
      if (isOnline) {
        const response = await fetch(`${API_BASE}/api/auth/session`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          // Save to local storage
          await Preferences.set({
            key: 'user_session',
            value: JSON.stringify(data.user)
          });
        }
      }
    } catch (error) {
      console.error('Session load error:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      const data = await offlineManager.smartFetch(`${API_BASE}/api/dashboard/overview`);
      setDashboardData(data);
    } catch (error) {
      console.error('Dashboard load error:', error);
      // Load sample data for demo
      setDashboardData({
        revenue: 45000,
        expenses: 28000,
        profit: 17000,
        customers: 142,
        invoices: 89,
        products: 234
      });
    }
  };

  const handleLogin = async (email, password) => {
    if (!isOnline) {
      alert('Please connect to the internet to log in');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        
        // Save session locally
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.set({
          key: 'user_session',
          value: JSON.stringify(data.user)
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading Dott...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen 
        onLogin={handleLogin}
        isOnline={isOnline}
      />
    );
  }

  return (
    <DashboardScreen
      user={user}
      data={dashboardData}
      isOnline={isOnline}
      onRefresh={loadDashboardData}
    />
  );
}

function LoginScreen({ onLogin, isOnline }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <h1>Welcome to Dott</h1>
        {!isOnline && (
          <div className="offline-warning">
            ⚠️ No internet connection. Please connect to log in.
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!isOnline}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!isOnline}
          />
          <button type="submit" disabled={!isOnline}>
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}

function DashboardScreen({ user, data, isOnline, onRefresh }) {
  return (
    <div className="dashboard">
      <header>
        <h1>Hi, {user?.name || 'User'}</h1>
        <div className="status">
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </div>
      </header>

      {!isOnline && (
        <div className="offline-banner">
          Working offline. Your changes will sync when you're back online.
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Revenue</h3>
          <p>${data?.revenue?.toLocaleString() || '0'}</p>
        </div>
        <div className="stat-card">
          <h3>Expenses</h3>
          <p>${data?.expenses?.toLocaleString() || '0'}</p>
        </div>
        <div className="stat-card">
          <h3>Profit</h3>
          <p>${data?.profit?.toLocaleString() || '0'}</p>
        </div>
        <div className="stat-card">
          <h3>Customers</h3>
          <p>{data?.customers || '0'}</p>
        </div>
      </div>

      <button onClick={onRefresh} className="refresh-btn">
        {isOnline ? 'Refresh Data' : 'Offline Mode'}
      </button>

      {data?.fromCache && (
        <p className="cache-notice">
          Showing cached data from last sync
        </p>
      )}
    </div>
  );
}