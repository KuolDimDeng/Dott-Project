'use client';

import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import StandardSpinner, { CenteredSpinner, ButtonSpinner } from '@/components/ui/StandardSpinner';
import { parseVisualizationData, shouldShowVisualization } from '@/utils/visualizationUtils';
import { useTranslation } from 'react-i18next';

// Dynamic import for visualization to prevent SSR issues
const SmartInsightVisualization = React.lazy(() => 
  import('@/components/SmartInsightVisualization').catch(() => {
    console.warn('Failed to load SmartInsightVisualization');
    return { default: () => <div className="text-gray-500 text-sm">Charts unavailable</div> };
  })
);
import {
  SparklesIcon,
  PaperAirplaneIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  PlusIcon,
  LightBulbIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  ClockIcon,
  DocumentTextIcon,
  XMarkIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';

// Query categories for Smart Insight
const getInsightCategories = (t) => [
  {
    id: 'revenue',
    title: t('smartInsights.categories.revenue.title', 'Revenue & Sales'),
    icon: ArrowTrendingUpIcon,
    color: 'blue',
    queries: [
      t('smartInsights.categories.revenue.query1', 'Show my revenue trend with a chart'),
      t('smartInsights.categories.revenue.query2', 'Which products are bestsellers? Include a chart'),
      t('smartInsights.categories.revenue.query3', 'Create a chart of sales by customer segment'),
      t('smartInsights.categories.revenue.query4', "What's my average order value trend?")
    ]
  },
  {
    id: 'customers',
    title: t('smartInsights.categories.customers.title', 'Customer Insights'),
    icon: UserGroupIcon,
    color: 'green',
    queries: [
      t('smartInsights.categories.customers.query1', 'Show my top customers in a chart'),
      t('smartInsights.categories.customers.query2', "What's my customer retention rate? Show as percentage chart"),
      t('smartInsights.categories.customers.query3', 'Create a visualization of new vs returning customers'),
      t('smartInsights.categories.customers.query4', 'Which customers are at risk? Include analysis chart')
    ]
  },
  {
    id: 'inventory',
    title: t('smartInsights.categories.inventory.title', 'Inventory Analysis'),
    icon: ShoppingBagIcon,
    color: 'purple',
    queries: [
      t('smartInsights.categories.inventory.query1', 'What products need restocking? Show in a chart'),
      t('smartInsights.categories.inventory.query2', 'Visualize inventory turnover rates'),
      t('smartInsights.categories.inventory.query3', 'Create a chart of slow-moving vs fast-moving items'),
      t('smartInsights.categories.inventory.query4', 'Show my current stock value breakdown')
    ]
  },
  {
    id: 'performance',
    title: t('smartInsights.categories.performance.title', 'Business Performance'),
    icon: ChartBarIcon,
    color: 'yellow',
    queries: [
      t('smartInsights.categories.performance.query1', 'How is my business performing? Include charts'),
      t('smartInsights.categories.performance.query2', 'Compare this month to last month with visualizations'),
      t('smartInsights.categories.performance.query3', 'Show my profit margins in a chart'),
      t('smartInsights.categories.performance.query4', 'Create an expense breakdown visualization')
    ]
  }
];

// Credit packages
const getCreditPackages = (t) => [
  {
    id: 'starter',
    name: t('smartInsights.packages.starter.name', 'Starter Pack'),
    credits: 100,
    price: 0.99,
    popular: false
  },
  {
    id: 'growth',
    name: t('smartInsights.packages.growth.name', 'Growth Pack'),
    credits: 500,
    price: 3.99,
    popular: true,
    savings: '20%'
  },
  {
    id: 'pro',
    name: t('smartInsights.packages.pro.name', 'Professional'),
    credits: 1000,
    price: 6.99,
    popular: false,
    savings: '30%'
  },
  {
    id: 'enterprise',
    name: t('smartInsights.packages.enterprise.name', 'Enterprise'),
    credits: 5000,
    price: 29.99,
    popular: false,
    savings: '40%'
  }
];

// Constants defined successfully

export default function SmartInsight({ onNavigate }) {
  console.log('[SmartInsight] Component mounting');
  const { t } = useTranslation('navigation');
  
  const router = useRouter();
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);
  
  // State management
  const [credits, setCredits] = useState(0); // Will be fetched from backend
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [creditPackages, setCreditPackages] = useState([]);
  const [monthlyUsage, setMonthlyUsage] = useState(null);
  const INSIGHT_CATEGORIES = getInsightCategories(t);
  const CREDIT_PACKAGES = getCreditPackages(t);

  console.log('[SmartInsight] Initial state setup complete');

  // Initialize tenant ID and fetch user credits
  useEffect(() => {
    console.log('[SmartInsight] useEffect running for initialization');
    const initialize = async () => {
      try {
        // Get tenant ID
        console.log('[SmartInsight] Calling getSecureTenantId...');
        const id = await getSecureTenantId();
        console.log('[SmartInsight] getSecureTenantId returned:', id, 'type:', typeof id);
        if (id) {
          setTenantId(id);
          console.log('[SmartInsight] Tenant ID set successfully');
          
          // Fetch user credits
          const creditsResponse = await fetch('/api/smart-insights/credits/');
          if (creditsResponse.ok) {
            const creditsData = await creditsResponse.json();
            setCredits(creditsData.credits);
            setMonthlyUsage(creditsData.monthly_usage);
            console.log('[SmartInsight] Credits fetched:', creditsData.credits);
          }
          
          // Fetch available packages
          const packagesResponse = await fetch('/api/smart-insights/packages/');
          if (packagesResponse.ok) {
            const packagesData = await packagesResponse.json();
            setCreditPackages(packagesData.results || packagesData);
            console.log('[SmartInsight] Credit packages fetched');
          }
        } else {
          console.error('[SmartInsight] No tenant ID returned');
          toast.error(t('smartInsights.errors.initFailed', 'Failed to initialize. Please refresh the page.'));
        }
      } catch (error) {
        console.error('[SmartInsight] Error during initialization:', error);
        toast.error(t('smartInsights.errors.initFailed', 'Failed to initialize. Please try again.'));
      } finally {
        console.log('[SmartInsight] Setting isInitialized to true');
        setIsInitialized(true);
      }
    };
    initialize();
  }, []);

  // Auto-scroll to bottom of chat only when new messages are added
  useEffect(() => {
    // Only scroll if we have messages and the chat area is visible
    if (messages.length > 0 && chatContainerRef.current) {
      // Check if user is near the bottom of the chat (within 100px)
      const container = chatContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      // Only auto-scroll if user is already near the bottom
      if (isNearBottom) {
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    }
  }, [messages.length]); // Only trigger on message count change, not content changes

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    if (credits <= 0) {
      toast.error(t('smartInsights.errors.noCredits', 'No credits remaining. Please purchase more credits.'));
      setShowBuyCredits(true);
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call backend Smart Insights query endpoint
      const response = await fetch('/api/smart-insights/query/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          include_visualization: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.detail || 'Failed to get AI response');
      }

      const data = await response.json();
      
      // Parse visualizations from the response
      const visualizations = parseVisualizationData(data.response);
      
      // Remove JSON code blocks from the displayed content
      let cleanContent = data.response;
      if (visualizations.length > 0) {
        // Remove all ```json...``` blocks from the display text
        cleanContent = cleanContent.replace(/```json[\s\S]*?```/g, '').trim();
      }
      
      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: cleanContent,
        timestamp: new Date(),
        usage: data.usage,
        tokensUsed: data.total_tokens,
        creditsUsed: data.credits_used,
        visualizations: visualizations,
        hasVisualization: visualizations.length > 0
      };
      
      setMessages(prev => [...prev, aiResponse]);
      
      // Update credits from backend response
      if (data.remaining_credits !== undefined) {
        setCredits(data.remaining_credits);
      }
      
      logger.info('[SmartInsights] AI response received, credits used:', data.credits_used, 'tokens:', data.total_tokens);
      
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to get AI response. Please try again.');
      
      // Don't deduct credits if the request failed
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: t('smartInsights.errors.processingError', 'I apologize, but I encountered an error processing your request. Please try again.'),
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle template query click
  const handleTemplateQuery = (query) => {
    setInputValue(query);
    inputRef.current?.focus();
  };

  // Handle package selection and purchase
  const handlePackageSelect = async (pkg) => {
    setSelectedPackage(pkg);
    
    try {
      // Create checkout session
      const response = await fetch('/api/smart-insights/purchase/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          package_id: pkg.id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      
      const data = await response.json();
      
      // Redirect to Stripe checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Failed to process purchase. Please try again.');
    }
  };

  // Show loading while initializing or if tenant ID is not available
  console.log('[SmartInsight] Render check:', { 
    isInitialized, 
    tenantId,
    shouldShowLoading: !isInitialized || !tenantId 
  });
  
  if (!isInitialized || !tenantId) {
    console.log('[SmartInsight] Showing loading spinner');
    return <CenteredSpinner size="large" text={t('smartInsights.loading', 'Initializing Smart Insight...')} showText={true} />;
  }
  
  console.log('[SmartInsight] Proceeding with main render');
  
  // Verify all required values
  if (typeof credits !== 'number') {
    console.error('[SmartInsight] Credits is not a number:', credits, typeof credits);
  }
  if (!Array.isArray(messages)) {
    console.error('[SmartInsight] Messages is not an array:', messages, typeof messages);
  }
  if (!Array.isArray(INSIGHT_CATEGORIES)) {
    console.error('[SmartInsight] INSIGHT_CATEGORIES is not an array:', INSIGHT_CATEGORIES, typeof INSIGHT_CATEGORIES);
  }
  if (!Array.isArray(CREDIT_PACKAGES)) {
    console.error('[SmartInsight] CREDIT_PACKAGES is not an array:', CREDIT_PACKAGES, typeof CREDIT_PACKAGES);
  }

  try {
    return (
    <div className="max-w-[1400px] mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <LightBulbIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('smartInsights.title', 'Smart Insight')}</h1>
              <p className="text-gray-600">{t('smartInsights.subtitle', 'AI-powered business intelligence assistant')}</p>
            </div>
          </div>
          
          {/* Credits Display */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">{t('smartInsights.credits.available', 'Available Credits')}</p>
              <p className="text-2xl font-bold text-blue-600">{credits || 0}</p>
              {monthlyUsage && (
                <p className="text-xs text-gray-500 mt-1">
                  {t('smartInsights.credits.usedThisMonth', 'Used this month: {{count}}', { count: monthlyUsage.total_credits_used || 0 })}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowBuyCredits(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              {t('smartInsights.credits.buyButton', 'Buy Credits')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[750px]">
          {/* Messages - 70% of space */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-12">
                <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">{t('smartInsights.chat.startConversation', 'Start a conversation')}</p>
                <p className="text-sm mt-2">{t('smartInsights.chat.askAnything', 'Ask me anything about your business data')}</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-4xl px-4 py-2 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : message.isError
                        ? 'bg-red-50 text-red-900 border border-red-200'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Show visualizations for AI responses */}
                    {message.type === 'ai' && message.hasVisualization && message.visualizations && typeof window !== 'undefined' && (
                      <div className="mt-3">
                        <React.Suspense fallback={<StandardSpinner size="small" />}>
                          <SmartInsightVisualization 
                            visualizations={message.visualizations}
                            className="max-w-full"
                          />
                        </React.Suspense>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs opacity-75">
                        {message.timestamp && typeof message.timestamp.toLocaleTimeString === 'function' 
                          ? message.timestamp.toLocaleTimeString() 
                          : 'Just now'}
                      </p>
                      
                      {/* Show visualization indicator */}
                      {message.type === 'ai' && message.hasVisualization && (
                        <div className="flex items-center text-xs opacity-75">
                          <ChartBarIcon className="h-3 w-3 mr-1" />
                          <span>{message.visualizations?.length || 0} chart{(message.visualizations?.length || 0) !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading === true && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <StandardSpinner size="small" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area - 30% of space, fixed at bottom */}
          <div className="border-t border-gray-200 p-4 flex-shrink-0">
            <div className="flex space-x-4">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={t('smartInsights.chat.placeholder', 'Ask about your business...')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading === true ? (
                  <StandardSpinner size="small" />
                ) : (
                  <PaperAirplaneIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Query Templates */}
        <div className="space-y-3 lg:col-span-1">
          <h3 className="text-lg font-semibold text-gray-900">{t('smartInsights.popularQueries', 'Popular Queries')}</h3>
          
          {INSIGHT_CATEGORIES && INSIGHT_CATEGORIES.map((category) => {
            const IconComponent = category.icon;
            const colorClasses = {
              blue: 'text-blue-600',
              green: 'text-green-600',
              purple: 'text-blue-600',
              yellow: 'text-yellow-600'
            };
            
            if (!IconComponent) {
              console.error('[SmartInsight] IconComponent is undefined for category:', category.id);
              return null;
            }
            
            return (
              <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className={`flex items-center mb-2 ${colorClasses[category.color]}`}>
                  <IconComponent className="h-4 w-4 mr-2 flex-shrink-0" />
                  <h4 className="font-medium text-sm">{category.title}</h4>
                </div>
                <div className="space-y-1">
                  {category.queries && category.queries.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => handleTemplateQuery(query)}
                      className="block w-full text-left text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Buy Credits Modal */}
      <Transition show={showBuyCredits} as={Fragment}>
        <Dialog onClose={() => setShowBuyCredits(false)} className="relative z-50">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="absolute inset-0 bg-black/30" />
          </Transition.Child>

          <div className="absolute inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl bg-white rounded-xl shadow-xl">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title className="text-xl font-semibold text-gray-900">
                      {t('smartInsights.buyCredits.title', 'Buy Smart Insight Credits')}
                    </Dialog.Title>
                    <button
                      onClick={() => setShowBuyCredits(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <p className="text-gray-600 mb-6">
                    {t('smartInsights.buyCredits.description', 'Choose a credit package to continue using Smart Insight')}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {creditPackages && creditPackages.length > 0 ? creditPackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedPackage?.id === pkg.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handlePackageSelect(pkg)}
                      >
                        {pkg.credits >= 500 && pkg.credits < 1000 && (
                          <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                            {t('smartInsights.buyCredits.bestValue', 'Best Value')}
                          </span>
                        )}
                        
                        <h4 className="font-semibold text-gray-900">{pkg.name}</h4>
                        <p className="text-2xl font-bold text-blue-600 mt-2">
                          ${pkg.price}
                        </p>
                        <p className="text-gray-600 text-sm mt-1">
                          {t('smartInsights.buyCredits.creditsCount', '{{count}} credits', { count: pkg.credits })}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          {t('smartInsights.buyCredits.perCredit', '${{price}} per credit', { price: (pkg.price / pkg.credits).toFixed(3) })}
                        </p>
                      </div>
                    )) : (
                      <div className="col-span-2 text-center text-gray-500 py-8">
                        <CreditCardIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>{t('smartInsights.buyCredits.loadingPackages', 'Loading credit packages...')}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setShowBuyCredits(false)}
                      className="px-4 py-2 text-gray-700 hover:text-gray-900"
                    >
                      {t('smartInsights.buyCredits.cancel', 'Cancel')}
                    </button>
                    <button
                      onClick={() => {
                        if (selectedPackage) {
                          handlePackageSelect(selectedPackage);
                        }
                      }}
                      disabled={!selectedPackage}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('smartInsights.buyCredits.continueToPayment', 'Continue to Payment')}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
  } catch (error) {
    console.error('[SmartInsight] Render error:', error);
    console.error('[SmartInsight] Error stack:', error.stack);
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">
          <p>{t('smartInsights.errors.loadingError', 'Error loading Smart Insight')}</p>
          <p className="text-sm">{error.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }
}