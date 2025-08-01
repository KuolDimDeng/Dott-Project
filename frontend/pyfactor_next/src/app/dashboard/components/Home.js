'use client';

import React, { useState, useEffect } from 'react';
import { getSubscriptionPlanColor } from '@/utils/userAttributes';
import SubscriptionPopup from './SubscriptionPopup';
import { customerApi, productApi, supplierApi } from '@/utils/apiClient';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('dashboard');
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
        const [customersResponse, productsResponse, suppliersResponse] = await Promise.all([
          customerApi.getAll().then(res => {
            console.log('[Home] Customers response:', res);
            // Django REST Framework paginated response format
            if (res.results && Array.isArray(res.results)) return res.results;
            // Handle different response formats
            if (Array.isArray(res)) return res;
            if (res.customers && Array.isArray(res.customers)) return res.customers;
            if (res.data && Array.isArray(res.data)) return res.data;
            return [];
          }).catch((error) => {
            console.error('[Home] Error fetching customers:', error);
            return [];
          }),
          productApi.getAll().then(res => {
            console.log('[Home] Products response:', res);
            // Handle different response formats from /api/products route
            if (res.products && Array.isArray(res.products)) return res.products;
            if (res.results && Array.isArray(res.results)) return res.results;
            if (Array.isArray(res)) return res;
            if (res.data && Array.isArray(res.data)) return res.data;
            return [];
          }).catch((error) => {
            console.error('[Home] Error fetching products:', error);
            return [];
          }),
          supplierApi.getAll().then(res => {
            console.log('[Home] Suppliers response:', res);
            // Django REST Framework paginated response format
            if (res.results && Array.isArray(res.results)) return res.results;
            // Handle different response formats
            if (Array.isArray(res)) return res;
            if (res.suppliers && Array.isArray(res.suppliers)) return res.suppliers;
            if (res.data && Array.isArray(res.data)) return res.data;
            return [];
          }).catch((error) => {
            console.error('[Home] Error fetching suppliers:', error);
            return [];
          })
        ]);

        // Extract the actual arrays from the responses
        const customers = customersResponse || [];
        const products = productsResponse || [];
        const suppliers = suppliersResponse || [];

        // Update stats - use actual data counts, not failing stats endpoints
        setStats({
          customers: customers.length || customerStats.total || 0,
          products: products.length || 0,
          services: serviceStats.stats?.total || serviceStats.total || 0,
          suppliers: suppliers.length || 0,
          invoices: dashboardMetrics.metrics?.invoices?.total || dashboardMetrics.total || 0
        });

        // Update checklist based on real data
        const checklistStatus = {
          profileComplete: !!(userData?.businessName || userData?.business_name || userData?.company_name),
          hasCustomers: customers.length > 0 || customerStats.total > 0,
          hasProducts: products.length > 0,
          hasServices: (serviceStats.stats?.total || serviceStats.total || 0) > 0,
          hasSuppliers: suppliers.length > 0,
          hasInvoices: (dashboardMetrics.metrics?.invoices?.total || dashboardMetrics.total || 0) > 0,
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
            message: t('home.recentUpdates.activities.salesToday', { amount: dashboardMetrics.metrics.sales.today.toFixed(2) }),
            timestamp: new Date(),
            icon: 'chart'
          });
        }

        // Add invoice activity
        if (dashboardMetrics.metrics?.invoices?.unpaid > 0) {
          activities.push({
            id: 'unpaid-invoices',
            type: 'warning',
            message: t('home.recentUpdates.activities.unpaidInvoices', { 
              count: dashboardMetrics.metrics.invoices.unpaid,
              plural: dashboardMetrics.metrics.invoices.unpaid > 1 ? 's' : ''
            }),
            timestamp: new Date(),
            icon: 'alert'
          });
        }

        if (dashboardMetrics.metrics?.invoices?.overdue > 0) {
          activities.push({
            id: 'overdue-invoices',
            type: 'error',
            message: t('home.recentUpdates.activities.overdueInvoices', { 
              count: dashboardMetrics.metrics.invoices.overdue,
              plural: dashboardMetrics.metrics.invoices.overdue > 1 ? 's' : ''
            }),
            timestamp: new Date(),
            icon: 'alert'
          });
        }

        // Add customer activity
        if (customerStats.new_this_month > 0) {
          activities.push({
            id: 'new-customers',
            type: 'success',
            message: t('home.recentUpdates.activities.newCustomers', { 
              count: customerStats.new_this_month,
              plural: customerStats.new_this_month > 1 ? 's' : ''
            }),
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
      name: t('home.plans.free.name'),
      price: '0',
      description: t('home.plans.free.description'),
      features: t('home.plans.free.features', { returnObjects: true }),
      limitations: t('home.plans.free.limitations', { returnObjects: true })
    },
    {
      id: 'professional',
      name: t('home.plans.professional.name'),
      price: '15',
      description: t('home.plans.professional.description'),
      features: t('home.plans.professional.features', { returnObjects: true })
    },
    {
      id: 'enterprise',
      name: t('home.plans.enterprise.name'),
      price: '45',
      description: t('home.plans.enterprise.description'),
      features: t('home.plans.enterprise.features', { returnObjects: true })
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
    let greetingKey = hour < 12 ? 'home.greeting.morning' : hour < 18 ? 'home.greeting.afternoon' : 'home.greeting.evening';
    let greeting = t(greetingKey);
    
    if (userData?.given_name) {
      return `${greeting}, ${userData?.given_name}!`;
    } else if (userData?.first_name) {
      return `${greeting}, ${userData?.first_name}!`;
    } else if (userData?.email) {
      const username = userData?.email?.split('@')[0] || '';
      return `${greeting}, ${username.charAt(0).toUpperCase() + username.slice(1)}!`;
    } else if (userData?.name) {
      return `${greeting}, ${userData?.name}!`;
    }
    return `${greeting}!`;
  };

  // Getting started checklist items
  const checklistItems = [
    {
      id: 'profile',
      title: t('home.gettingStarted.steps.profile.title'),
      completed: checklistData.profileComplete,
      action: navigateToProfile,
      icon: BuildingOfficeIcon,
      description: t('home.gettingStarted.steps.profile.description')
    },
    {
      id: 'customer',
      title: checklistData.hasCustomers 
        ? t('home.gettingStarted.steps.customer.titleWithCount', { count: stats.customers })
        : t('home.gettingStarted.steps.customer.titleEmpty'),
      completed: checklistData.hasCustomers,
      action: navigateToCreateCustomer,
      icon: UserPlusIcon,
      description: checklistData.hasCustomers 
        ? t('home.gettingStarted.steps.customer.descriptionWithCount')
        : t('home.gettingStarted.steps.customer.descriptionEmpty')
    },
    {
      id: 'product',
      title: checklistData.hasProducts 
        ? t('home.gettingStarted.steps.product.titleWithCount', { count: stats.products })
        : t('home.gettingStarted.steps.product.titleEmpty'),
      completed: checklistData.hasProducts,
      action: navigateToCreateProduct,
      icon: CubeIcon,
      description: checklistData.hasProducts 
        ? t('home.gettingStarted.steps.product.descriptionWithCount')
        : t('home.gettingStarted.steps.product.descriptionEmpty')
    },
    {
      id: 'service',
      title: checklistData.hasServices 
        ? t('home.gettingStarted.steps.service.titleWithCount', { count: stats.services })
        : t('home.gettingStarted.steps.service.titleEmpty'),
      completed: checklistData.hasServices,
      action: navigateToCreateService,
      icon: WrenchIcon,
      description: checklistData.hasServices 
        ? t('home.gettingStarted.steps.service.descriptionWithCount')
        : t('home.gettingStarted.steps.service.descriptionEmpty')
    },
    {
      id: 'supplier',
      title: checklistData.hasSuppliers 
        ? t('home.gettingStarted.steps.supplier.titleWithCount', { count: stats.suppliers })
        : t('home.gettingStarted.steps.supplier.titleEmpty'),
      completed: checklistData.hasSuppliers,
      action: navigateToCreateSupplier,
      icon: TruckIcon,
      description: checklistData.hasSuppliers 
        ? t('home.gettingStarted.steps.supplier.descriptionWithCount')
        : t('home.gettingStarted.steps.supplier.descriptionEmpty')
    },
    {
      id: 'invoice',
      title: checklistData.hasInvoices 
        ? t('home.gettingStarted.steps.invoice.titleWithCount', { count: stats.invoices })
        : t('home.gettingStarted.steps.invoice.titleEmpty'),
      completed: checklistData.hasInvoices,
      action: navigateToCreateInvoice,
      icon: DocumentTextIcon,
      description: checklistData.hasInvoices 
        ? t('home.gettingStarted.steps.invoice.descriptionWithCount')
        : t('home.gettingStarted.steps.invoice.descriptionEmpty')
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
        <h1 className="text-2xl font-bold mb-4">
          {getGreeting()}
        </h1>
        
        {/* Subscription Expired Banner */}
        {userData?.subscription_expired && (
          <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
            <div className="flex">
              <ExclamationCircleIcon className="h-6 w-6 text-red-400 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-1 text-red-800">
                  {t('home.subscriptionBanner.expired', { previousPlan: userData?.previous_plan || 'previous' })}
                </h2>
                <p className="mb-3 text-red-700">
                  {t('home.subscriptionBanner.expiredDescription')}
                </p>
                <div className="flex gap-2">
                  <button 
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    onClick={handleUpgradeDialogOpen}
                  >
                    {t('home.subscriptionBanner.renewButton')}
                  </button>
                  <button 
                    className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                    onClick={handlePlanDetailsOpen}
                  >
                    {t('home.subscriptionBanner.viewDetailsButton')}
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
                  {t('home.subscriptionBanner.active', { planName: currentPlan.name })}
                </h2>
                <p className="text-blue-700">
                  {t('home.subscriptionBanner.activeDescription')}
                </p>
              </div>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={handlePlanDetailsOpen}
              >
                {t('home.subscriptionBanner.viewDetailsButton')}
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
                  {t('home.gettingStarted.title')}
                </h2>
                <span className="text-sm text-gray-500">
                  {t('home.gettingStarted.progress', { completed: completedItems, total: checklistItems.length })}
                </span>
              </div>
              
              {/* Loading indicator while fetching data */}
              {loading && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 text-blue-500 mr-2 animate-pulse" />
                    <p className="text-sm text-blue-800">{t('home.gettingStarted.loading')}</p>
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
                {t('home.gettingStarted.description')}
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
                    {t('home.gettingStarted.congratulations')}
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
                  {t('home.recentUpdates.title')}
                </h2>
                <CalendarIcon className="h-5 w-5 text-gray-400" />
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <StandardSpinner size="default" />
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
                    {t('home.recentUpdates.noUpdates')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('home.recentUpdates.description')}
                  </p>
                </div>
              )}
              
              {/* Quick Stats */}
              {!loading && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">{t('home.quickStats.title')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stats.customers}</p>
                      <p className="text-sm text-gray-600">{t('home.quickStats.customers')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stats.products}</p>
                      <p className="text-sm text-gray-600">{t('home.quickStats.products')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stats.services}</p>
                      <p className="text-sm text-gray-600">{t('home.quickStats.services')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stats.invoices}</p>
                      <p className="text-sm text-gray-600">{t('home.quickStats.invoices')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Plan Details Dialog */}
        {planDetailsOpen && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">{t('home.planDetails.title')}</h2>
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
                      {t('home.planDetails.perMonth')}
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
                      {t('home.planDetails.active')}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm border border-blue-500 text-blue-700 bg-blue-50 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      {t('home.planDetails.currentPlan')}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 my-4"></div>

                <div>
                  <h4 className="text-lg font-medium mb-2">
                    {t('home.planDetails.featuresIncluded')}
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
                        {t('home.planDetails.limitations')}
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
                        {t('home.planDetails.upgradePrompt')}
                      </p>
                      <button 
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={handleUpgradeDialogOpen}
                      >
                        {t('home.planDetails.upgradeButton')}
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
                        {t('home.planDetails.upgradeToEnterprise')}
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
                  {t('home.planDetails.close')}
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