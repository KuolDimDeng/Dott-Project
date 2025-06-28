'use client';

import React, { useState, useEffect } from 'react';
import { getSubscriptionPlanColor } from '@/utils/userAttributes';
import SubscriptionPopup from './SubscriptionPopup';
import { customerApi, productApi, supplierApi } from '@/utils/apiClient';
import { 
  CheckCircleIcon, 
  UserPlusIcon, 
  CubeIcon, 
  WrenchIcon,
  TruckIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
  ClockIcon,
  CalendarIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

/**
 * Home Component
 * An improved dashboard home page with real data and better UX
 */
function Home({ userData, onNavigate }) {
  const [planDetailsOpen, setPlanDetailsOpen] = useState(false);
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);
  const [checklistData, setChecklistData] = useState({
    profileComplete: false,
    hasCustomers: false,
    hasProducts: false,
    hasServices: false,
    hasSuppliers: false,
    hasInvoices: false,
    exploredDashboard: false
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    customers: 0,
    products: 0,
    services: 0,
    suppliers: 0,
    invoices: 0
  });

  // Fetch real data for checklist and stats
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Session is managed server-side, no need to check cookies directly
        // The API calls will handle authentication automatically
        
        // Fetch various stats in parallel
        const [customerStats, serviceStats, dashboardMetrics] = await Promise.all([
          fetch('/api/customers/stats', { credentials: 'include' }).then(res => res.json()).catch(() => ({ total: 0 })),
          fetch('/api/services/stats', { credentials: 'include' }).then(res => res.json()).catch(() => ({ stats: { total: 0 } })),
          fetch('/api/dashboard/metrics/summary', { credentials: 'include' }).then(res => res.json()).catch(() => ({ metrics: {} }))
        ]);

        // Fetch entity counts
        const [customers, products, suppliers] = await Promise.all([
          customerApi.getAll().catch((error) => {
            console.error('[Home] Error fetching customers:', error);
            return [];
          }),
          productApi.getAll().catch((error) => {
            console.error('[Home] Error fetching products:', error);
            return [];
          }),
          supplierApi.getAll().catch((error) => {
            console.error('[Home] Error fetching suppliers:', error);
            return [];
          })
        ]);

        // Update stats
        setStats({
          customers: customerStats.total || customers.length || 0,
          products: products.length || 0,
          services: serviceStats.stats?.total || 0,
          suppliers: suppliers.length || 0,
          invoices: dashboardMetrics.metrics?.invoices?.total || 0
        });

        // Update checklist based on real data
        const checklistStatus = {
          profileComplete: !!(userData?.businessName || userData?.business_name || userData?.company_name),
          hasCustomers: (customerStats.total || customers.length) > 0,
          hasProducts: products.length > 0,
          hasServices: (serviceStats.stats?.total || 0) > 0,
          hasSuppliers: suppliers.length > 0,
          hasInvoices: (dashboardMetrics.metrics?.invoices?.total || 0) > 0,
          exploredDashboard: true // Can track this via localStorage or user activity
        };
        
        console.log('[Home] Checklist Status:', checklistStatus);
        console.log('[Home] Raw Data:', {
          customerStats,
          customers: customers.length,
          products: products.length,
          serviceStats,
          suppliers: suppliers.length,
          dashboardMetrics
        });
        
        setChecklistData(checklistStatus);

        // Generate recent activity from dashboard metrics
        const activities = [];
        
        // Add recent sales activity
        if (dashboardMetrics.metrics?.sales?.today > 0) {
          activities.push({
            id: 'sales-today',
            type: 'sales',
            message: `$${dashboardMetrics.metrics.sales.today.toFixed(2)} in sales today`,
            timestamp: new Date(),
            icon: 'chart'
          });
        }

        // Add invoice activity
        if (dashboardMetrics.metrics?.invoices?.unpaid > 0) {
          activities.push({
            id: 'unpaid-invoices',
            type: 'warning',
            message: `${dashboardMetrics.metrics.invoices.unpaid} unpaid invoice${dashboardMetrics.metrics.invoices.unpaid > 1 ? 's' : ''} pending`,
            timestamp: new Date(),
            icon: 'alert'
          });
        }

        if (dashboardMetrics.metrics?.invoices?.overdue > 0) {
          activities.push({
            id: 'overdue-invoices',
            type: 'error',
            message: `${dashboardMetrics.metrics.invoices.overdue} overdue invoice${dashboardMetrics.metrics.invoices.overdue > 1 ? 's' : ''} need attention`,
            timestamp: new Date(),
            icon: 'alert'
          });
        }

        // Add customer activity
        if (customerStats.new_this_month > 0) {
          activities.push({
            id: 'new-customers',
            type: 'success',
            message: `${customerStats.new_this_month} new customer${customerStats.new_this_month > 1 ? 's' : ''} this month`,
            timestamp: new Date(),
            icon: 'user'
          });
        }

        setRecentActivity(activities);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userData]);

  // Helper functions
  const handlePlanDetailsOpen = () => setPlanDetailsOpen(true);
  const handlePlanDetailsClose = () => setPlanDetailsOpen(false);
  const handleUpgradeDialogOpen = () => setShowSubscriptionPopup(true);
  const handleUpgradeDialogClose = () => setShowSubscriptionPopup(false);

  // Navigate to specific pages
  const navigateToCreateCustomer = () => {
    if (onNavigate) {
      onNavigate('customers', { showCreateForm: true });
    }
  };

  const navigateToCreateProduct = () => {
    if (onNavigate) {
      onNavigate('sales-products', { activeTab: 'create' });
    }
  };

  const navigateToCreateService = () => {
    if (onNavigate) {
      onNavigate('sales-services', { activeTab: 'create' });
    }
  };

  const navigateToCreateSupplier = () => {
    if (onNavigate) {
      onNavigate('inventory-suppliers', { showCreateForm: true });
    }
  };

  const navigateToCreateInvoice = () => {
    if (onNavigate) {
      onNavigate('invoices', { showCreateForm: true });
    }
  };

  const navigateToProfile = () => {
    if (onNavigate) {
      onNavigate('settings', { activeTab: 'profile' });
    }
  };

  // Data for subscription plans
  const PLANS = [
    {
      id: 'free',
      name: 'Free Plan',
      price: '0',
      description: 'Basic features for small businesses just getting started',
      features: [
        'Basic invoicing',
        'Up to 5 clients',
        'Basic reporting',
        'Email support',
        '2GB storage',
      ],
      limitations: [
        'Limited to 5 invoices per month',
        'No custom branding',
        'Basic reporting only',
        'No API access',
        'Single user only',
      ]
    },
    {
      id: 'professional',
      name: 'Professional Plan',
      price: '15',
      description: 'Advanced features for growing businesses',
      features: [
        'Unlimited invoicing',
        'Unlimited clients',
        'Advanced reporting',
        'Priority support',
        'Custom branding',
        '15GB storage',
        'Up to 3 users',
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise Plan',
      price: '45',
      description: 'Full suite of tools for established businesses',
      features: [
        'Everything in Professional',
        'Unlimited storage',
        'Unlimited users',
        'Dedicated account manager',
        'Advanced API access',
        'Custom roles & permissions',
        'Advanced security features',
        'Preferential transaction rates',
      ]
    },
  ];

  // Helper function to get the effective subscription type
  const getEffectiveSubscriptionType = () => {
    const plan = userData?.selected_plan || 
                 userData?.selectedPlan ||
                 userData?.subscription_plan ||
                 userData?.subscriptionPlan ||
                 userData?.subscriptionType || 
                 userData?.subscription_type ||
                 'free';
    return plan.toLowerCase();
  };

  // Find current user's plan
  const currentPlan = PLANS.find(plan => 
    plan.id === getEffectiveSubscriptionType()
  ) || PLANS[0];

  // Function to get personalized greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    let greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    
    if (userData?.given_name) {
      return `${greeting}, ${userData.given_name}!`;
    } else if (userData?.first_name) {
      return `${greeting}, ${userData.first_name}!`;
    } else if (userData?.email) {
      const username = userData.email.split('@')[0];
      return `${greeting}, ${username.charAt(0).toUpperCase() + username.slice(1)}!`;
    } else if (userData?.name) {
      return `${greeting}, ${userData.name}!`;
    }
    return `${greeting}!`;
  };

  // Getting started checklist items
  const checklistItems = [
    {
      id: 'profile',
      title: 'Complete your business profile',
      completed: checklistData.profileComplete,
      action: navigateToProfile,
      icon: BuildingOfficeIcon,
      description: 'Add your business details and logo'
    },
    {
      id: 'customer',
      title: checklistData.hasCustomers ? `${stats.customers} customers added` : 'Add your first customer',
      completed: checklistData.hasCustomers,
      action: navigateToCreateCustomer,
      icon: UserPlusIcon,
      description: checklistData.hasCustomers ? 'Manage your customers' : 'Start building your customer base'
    },
    {
      id: 'product',
      title: checklistData.hasProducts ? `${stats.products} products created` : 'Create your first product',
      completed: checklistData.hasProducts,
      action: navigateToCreateProduct,
      icon: CubeIcon,
      description: checklistData.hasProducts ? 'Manage your products' : 'Add products to your inventory'
    },
    {
      id: 'service',
      title: checklistData.hasServices ? `${stats.services} services created` : 'Create your first service',
      completed: checklistData.hasServices,
      action: navigateToCreateService,
      icon: WrenchIcon,
      description: checklistData.hasServices ? 'Manage your services' : 'Define services you offer'
    },
    {
      id: 'supplier',
      title: checklistData.hasSuppliers ? `${stats.suppliers} suppliers added` : 'Add your first supplier',
      completed: checklistData.hasSuppliers,
      action: navigateToCreateSupplier,
      icon: TruckIcon,
      description: checklistData.hasSuppliers ? 'Manage your suppliers' : 'Track your supply chain'
    },
    {
      id: 'invoice',
      title: checklistData.hasInvoices ? `${stats.invoices} invoices created` : 'Create your first invoice',
      completed: checklistData.hasInvoices,
      action: navigateToCreateInvoice,
      icon: DocumentTextIcon,
      description: checklistData.hasInvoices ? 'Manage your invoices' : 'Start billing your customers'
    }
  ];

  // Get activity icon
  const getActivityIcon = (activity) => {
    switch (activity.icon) {
      case 'chart':
        return <ChartBarIcon className="h-5 w-5" />;
      case 'alert':
        return <ExclamationCircleIcon className="h-5 w-5" />;
      case 'user':
        return <UserPlusIcon className="h-5 w-5" />;
      default:
        return <ClockIcon className="h-5 w-5" />;
    }
  };

  // Get activity color
  const getActivityColor = (type) => {
    switch (type) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  // Calculate progress
  const completedItems = checklistItems.filter(item => item.completed).length;
  const progressPercentage = (completedItems / checklistItems.length) * 100;

  return (
    <>
      <div className="pt-1.5 pb-2">
        <h1 className="text-2xl font-bold mb-2">
          Welcome to your dashboard!
        </h1>
        
        <p className="mb-4 text-lg">
          {getGreeting()}
        </p>
        
        {/* Subscription Expired Banner */}
        {userData?.subscription_expired && (
          <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
            <div className="flex">
              <ExclamationCircleIcon className="h-6 w-6 text-red-400 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-1 text-red-800">
                  Your {userData.previous_plan} subscription has expired
                </h2>
                <p className="mb-3 text-red-700">
                  Your account has been downgraded to the Free plan. You now have limited access to features.
                </p>
                <div className="flex gap-2">
                  <button 
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    onClick={handleUpgradeDialogOpen}
                  >
                    Renew Subscription
                  </button>
                  <button 
                    className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                    onClick={handlePlanDetailsOpen}
                  >
                    View Plan Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Regular Plan Banner (shown when subscription is not expired) */}
        {!userData?.subscription_expired && (
          <div className="p-4 mb-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1 text-blue-900">
                  Your {currentPlan.name} is active
                </h2>
                <p className="text-blue-700">
                  You have access to all the features included in your plan.
                </p>
              </div>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={handlePlanDetailsOpen}
              >
                View Plan Details
              </button>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Getting Started Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Getting Started
                </h2>
                <span className="text-sm text-gray-500">
                  {completedItems} of {checklistItems.length} completed
                </span>
              </div>
              
              {/* Loading indicator while fetching data */}
              {loading && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 text-blue-500 mr-2 animate-pulse" />
                    <p className="text-sm text-blue-800">Loading your progress...</p>
                  </div>
                </div>
              )}
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Complete these steps to get the most out of your account:
              </p>
              
              <div className="space-y-3">
                {checklistItems.map((item) => (
                  <div 
                    key={item.id}
                    className={`flex items-start p-3 rounded-lg border transition-all ${
                      item.completed 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 cursor-pointer'
                    }`}
                    onClick={!item.completed ? item.action : undefined}
                  >
                    <div className="flex-shrink-0 mr-3">
                      {item.completed ? (
                        <CheckCircleIconSolid className="h-6 w-6 text-green-600" />
                      ) : (
                        <item.icon className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.description}
                      </p>
                    </div>
                    {!item.completed && (
                      <ArrowRightIcon className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              
              {completedItems === checklistItems.length && (
                <div className="mt-4 p-4 bg-green-100 rounded-lg">
                  <p className="text-green-800 font-medium flex items-center">
                    <CheckCircleIconSolid className="h-5 w-5 mr-2" />
                    Congratulations! You've completed all setup steps.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Recent Updates Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Recent Updates
                </h2>
                <CalendarIcon className="h-5 w-5 text-gray-400" />
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start">
                      <div className={`p-2 rounded-lg mr-3 ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          {activity.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-2">
                    No recent updates to display.
                  </p>
                  <p className="text-sm text-gray-500">
                    Updates about your account activity will appear here.
                  </p>
                </div>
              )}
              
              {/* Quick Stats */}
              {!loading && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Stats</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stats.customers}</p>
                      <p className="text-sm text-gray-600">Customers</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stats.products}</p>
                      <p className="text-sm text-gray-600">Products</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stats.services}</p>
                      <p className="text-sm text-gray-600">Services</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stats.invoices}</p>
                      <p className="text-sm text-gray-600">Invoices</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Plan Details Dialog */}
        {planDetailsOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Your Subscription Details</h2>
                  <button 
                    onClick={handlePlanDetailsClose}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mb-4">
                  <h3 className="text-xl font-medium mb-1">
                    {currentPlan.name}
                  </h3>
                  <div className="flex items-center mb-2">
                    <span className="text-2xl font-bold text-blue-600 mr-1">
                      ${currentPlan.price}
                    </span>
                    <span className="text-sm text-gray-500">
                      per month
                    </span>
                  </div>
                  <p className="mb-3">
                    {currentPlan.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full text-sm border border-green-500 text-green-700 bg-green-50 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Active
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm border border-blue-500 text-blue-700 bg-blue-50 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Current Plan
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 my-4"></div>

                <div>
                  <h4 className="text-lg font-medium mb-2">
                    Features Included
                  </h4>
                  <ul className="space-y-2">
                    {currentPlan.features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {currentPlan.id === 'free' && (
                  <>
                    <div className="border-t border-gray-200 my-4"></div>
                    
                    <div>
                      <h4 className="text-lg font-medium mb-2">
                        Limitations on Free Plan
                      </h4>
                      <ul className="space-y-2">
                        {currentPlan.limitations.map((limitation) => (
                          <li key={limitation} className="flex items-start">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="mt-4 mb-1">
                      <p className="mb-3">
                        Upgrade now to unlock all features and remove limitations!
                      </p>
                      <button 
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={handleUpgradeDialogOpen}
                      >
                        Upgrade Here
                      </button>
                    </div>
                  </>
                )}

                {currentPlan.id === 'professional' && (
                  <>
                    <div className="border-t border-gray-200 my-4"></div>
                    
                    <div className="mt-4 mb-1">
                      <button 
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={handleUpgradeDialogOpen}
                      >
                        Upgrade to Enterprise
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="bg-gray-50 px-6 py-3 flex justify-end border-t border-gray-200">
                <button 
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                  onClick={handlePlanDetailsClose}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add the subscription popup */}
        <SubscriptionPopup 
          open={showSubscriptionPopup} 
          onClose={handleUpgradeDialogClose} 
        />
      </div>
    </>
  );
}

export default Home;