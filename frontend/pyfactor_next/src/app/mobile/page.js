'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession-v2';
import Link from 'next/link';
import SmartAppBanner from '@/components/SmartAppBanner';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CameraIcon,
  UserGroupIcon,
  BellIcon,
  Cog6ToothIcon,
  ArrowRightIcon,
  DevicePhoneMobileIcon,
  WifiIcon,
  CloudArrowUpIcon,
  BoltIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { getWhatsAppBusinessVisibility } from '@/utils/whatsappCountryDetection';

export default function MobilePage() {
  const router = useRouter();
  const { session, loading, refreshSession } = useSession();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [whatsappVisible, setWhatsappVisible] = useState(false);

  // Update WhatsApp visibility when session changes
  useEffect(() => {
    if (session?.user) {
      const shouldShow = shouldShowWhatsAppBusiness();
      console.log('📱 [Mobile PWA] WhatsApp visibility check:', {
        show_whatsapp_commerce: session.user.show_whatsapp_commerce,
        country: session.user.country,
        shouldShow,
        sessionTimestamp: session.timestamp || 'no timestamp',
        fullUser: session.user
      });
      setWhatsappVisible(shouldShow);
    } else {
      console.log('📱 [Mobile PWA] No session or user data');
    }
  }, [session]);

  // Listen for WhatsApp preference changes
  useEffect(() => {
    const handleWhatsAppChange = async (event) => {
      console.log('📱 [Mobile PWA] WhatsApp preference changed:', event.detail);
      // Refresh session to get latest data
      if (refreshSession) {
        await refreshSession();
      }
      // Update visibility
      const shouldShow = shouldShowWhatsAppBusiness();
      setWhatsappVisible(shouldShow);
    };

    window.addEventListener('whatsappPreferenceChanged', handleWhatsAppChange);
    return () => {
      window.removeEventListener('whatsappPreferenceChanged', handleWhatsAppChange);
    };
  }, [refreshSession, session]);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check for pending items
    const pendingSales = JSON.parse(localStorage.getItem('pendingSales') || '[]');
    const pendingInvoices = JSON.parse(localStorage.getItem('pendingInvoices') || '[]');
    setPendingSync(pendingSales.length + pendingInvoices.length);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get WhatsApp Business visibility
  const getUserCountry = () => {
    return session?.user?.country || 'US';
  };
  
  const shouldShowWhatsAppBusiness = () => {
    try {
      console.log('📱 [Mobile PWA] Checking WhatsApp visibility...', {
        sessionUser: session?.user,
        show_whatsapp_commerce: session?.user?.show_whatsapp_commerce,
        hasPreference: session?.user?.show_whatsapp_commerce !== undefined,
        country: session?.user?.country
      });
      
      // Use the profile preference from the session (database-backed)
      // This is the same logic used in the main dashboard menu
      if (session?.user?.show_whatsapp_commerce !== undefined && session?.user?.show_whatsapp_commerce !== null) {
        console.log('📱 [Mobile PWA] Using explicit preference:', session.user.show_whatsapp_commerce);
        return session.user.show_whatsapp_commerce;
      }
      
      // Fallback to country-based detection if profile preference not available
      const userCountry = getUserCountry();
      const whatsappVisibility = getWhatsAppBusinessVisibility(userCountry);
      console.log('📱 [Mobile PWA] Using country default for', userCountry, ':', whatsappVisibility.showInMenu);
      return whatsappVisibility.showInMenu;
    } catch (error) {
      console.error('📱 [Mobile PWA] Error checking WhatsApp visibility:', error);
      return false;
    }
  };

  const baseQuickActions = [
    {
      title: 'Quick Sale',
      description: 'Process sales instantly',
      icon: CurrencyDollarIcon,
      href: '/pos',
      color: 'bg-blue-500'
    },
    {
      title: 'Scan Product',
      description: 'Barcode scanner',
      icon: CameraIcon,
      href: '/inventory/scan',
      color: 'bg-green-500'
    },
    {
      title: 'Timesheet',
      description: 'Clock in/out & hours',
      icon: ClockIcon,
      href: '/mobile/timesheet',
      color: 'bg-indigo-500'
    },
    {
      title: 'Pay Stubs',
      description: 'View & download',
      icon: BanknotesIcon,
      href: '/mobile/paystubs',
      color: 'bg-emerald-500'
    },
    {
      title: 'New Invoice',
      description: 'Create on the go',
      icon: DocumentTextIcon,
      href: '/invoices/new',
      color: 'bg-purple-500'
    },
    {
      title: 'Dashboard',
      description: 'View metrics',
      icon: ChartBarIcon,
      href: session?.tenantId ? `/${session.tenantId}/dashboard` : '/dashboard',
      color: 'bg-orange-500'
    }
  ];

  // Add WhatsApp Business if it should be shown
  const quickActions = whatsappVisible ? [
    ...baseQuickActions.slice(0, 2), // Keep first 2 actions
    {
      title: 'WhatsApp Business',
      description: 'Sell via WhatsApp',
      icon: ChatBubbleLeftRightIcon,
      href: '/mobile/whatsapp-business',
      color: 'bg-green-600'
    },
    ...baseQuickActions.slice(2) // Keep the rest
  ] : baseQuickActions;

  // Debug: Log the quick actions array
  console.log('📱 [Mobile PWA] Quick actions array:', {
    whatsappVisible,
    totalActions: quickActions.length,
    hasWhatsApp: quickActions.some(action => action.title === 'WhatsApp Business'),
    actionTitles: quickActions.map(action => action.title)
  });

  const features = [
    {
      icon: WifiIcon,
      title: 'Works Offline',
      description: 'Continue selling even without internet'
    },
    {
      icon: CloudArrowUpIcon,
      title: 'Auto Sync',
      description: 'Data syncs when connection returns'
    },
    {
      icon: DevicePhoneMobileIcon,
      title: 'Mobile First',
      description: 'Optimized for phones and tablets'
    },
    {
      icon: BoltIcon,
      title: 'Lightning Fast',
      description: 'Instant loading with caching'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If not logged in, show a message or redirect
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <img src="/static/images/favicon.png" alt="Dott" className="h-20 w-20 rounded-2xl shadow-lg mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Dott Mobile</h2>
        <p className="text-gray-600 text-center mb-8 max-w-sm">
          Please sign in to access your global business platform and tools.
        </p>
        <div className="space-y-3 w-full max-w-sm">
          <Link
            href="/auth/mobile-login"
            className="block w-full bg-blue-600 text-white rounded-xl py-3 font-semibold text-center hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/mobile-signup"
            className="block w-full bg-white text-blue-600 rounded-xl py-3 font-semibold text-center border-2 border-blue-600 hover:bg-blue-50 transition-colors"
          >
            Create Account
          </Link>
          <Link
            href="/mobile/landing"
            className="block w-full text-center text-gray-600 hover:text-gray-800 mt-4"
          >
            Learn More →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Smart App Banner */}
      <SmartAppBanner />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/static/images/favicon.png" alt="Dott" className="h-10 w-10 rounded-lg" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Dott: AI Global Business Platform</h1>
                <div className="flex items-center space-x-2 text-sm">
                  <span className={`flex items-center ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-2 h-2 rounded-full mr-1 ${isOnline ? 'bg-green-600' : 'bg-gray-400'}`}></div>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                  {pendingSync > 0 && (
                    <span className="text-orange-600">
                      • {pendingSync} pending
                    </span>
                  )}
                  {/* Debug: Show WhatsApp status */}
                  <span className={`text-xs px-2 py-1 rounded ${whatsappVisible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    WA: {whatsappVisible ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 rounded-lg hover:bg-gray-100 relative">
                <BellIcon className="w-6 h-6 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button
                onClick={async () => {
                  console.log('📱 [Mobile PWA] Manual session refresh triggered');
                  if (refreshSession) {
                    await refreshSession();
                  }
                }}
                className="p-2 rounded-lg hover:bg-gray-100"
                title="Refresh session"
              >
                <ArrowPathIcon className="w-6 h-6 text-gray-600" />
              </button>
              <button
                onClick={() => router.push('/settings')}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <Cog6ToothIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Section */}
      {session && (
        <div className="px-4 py-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {session.user?.given_name || session.user?.name || 'User'}!
          </h2>
          <p className="text-gray-600 mt-1">What would you like to do today?</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 pb-6">
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className={`${action.color} w-12 h-12 rounded-lg flex items-center justify-center mb-3`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">{action.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-4 pb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Sale #1234</p>
                  <p className="text-sm text-gray-500">2 minutes ago</p>
                </div>
              </div>
              <span className="font-semibold text-gray-900">$125.00</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <DocumentTextIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Invoice #5678</p>
                  <p className="text-sm text-gray-500">1 hour ago</p>
                </div>
              </div>
              <span className="font-semibold text-gray-900">$450.00</span>
            </div>
          </div>
          <Link
            href="/activities"
            className="mt-4 flex items-center justify-center text-blue-600 hover:text-blue-700 font-medium"
          >
            View all activity
            <ArrowRightIcon className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>

      {/* PWA Features */}
      <div className="px-4 pb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Mobile Features</h3>
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature) => (
            <div key={feature.title} className="bg-white rounded-lg border border-gray-200 p-3">
              <feature.icon className="w-6 h-6 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900 text-sm">{feature.title}</h4>
              <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="grid grid-cols-5 py-2">
          <button className="flex flex-col items-center py-2 text-blue-600">
            <ChartBarIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button 
            onClick={() => router.push('/pos')}
            className="flex flex-col items-center py-2 text-gray-600 hover:text-blue-600"
          >
            <CurrencyDollarIcon className="w-6 h-6" />
            <span className="text-xs mt-1">POS</span>
          </button>
          <button
            onClick={() => router.push('/inventory/scan')}
            className="flex flex-col items-center py-2 text-gray-600 hover:text-blue-600"
          >
            <CameraIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Scan</span>
          </button>
          <button className="flex flex-col items-center py-2 text-gray-600 hover:text-blue-600">
            <DocumentTextIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Invoices</span>
          </button>
          <button className="flex flex-col items-center py-2 text-gray-600 hover:text-blue-600">
            <UserGroupIcon className="w-6 h-6" />
            <span className="text-xs mt-1">More</span>
          </button>
        </div>
      </div>
    </div>
  );
}