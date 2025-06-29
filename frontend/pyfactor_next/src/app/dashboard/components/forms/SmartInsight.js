'use client';

import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import StandardSpinner, { CenteredSpinner, ButtonSpinner } from '@/components/ui/StandardSpinner';
import {
  SparklesIcon,
  PaperAirplaneIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  PlusIcon,
  LightBulbIcon,
  ChartBarIcon,
  TrendingUpIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  ClockIcon,
  DocumentTextIcon,
  XMarkIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';

// Query categories for Smart Insight
const INSIGHT_CATEGORIES = [
  {
    id: 'revenue',
    title: 'Revenue & Sales',
    icon: TrendingUpIcon,
    color: 'blue',
    queries: [
      "What's my revenue trend this month?",
      "Which products are bestsellers?",
      "Show me sales by customer segment",
      "What's my average order value?"
    ]
  },
  {
    id: 'customers',
    title: 'Customer Insights',
    icon: UserGroupIcon,
    color: 'green',
    queries: [
      "Who are my top customers?",
      "What's my customer retention rate?",
      "Show me new vs returning customers",
      "Which customers are at risk?"
    ]
  },
  {
    id: 'inventory',
    title: 'Inventory Analysis',
    icon: ShoppingBagIcon,
    color: 'purple',
    queries: [
      "What products need restocking?",
      "Show me inventory turnover rates",
      "Which items are slow-moving?",
      "What's my current stock value?"
    ]
  },
  {
    id: 'performance',
    title: 'Business Performance',
    icon: ChartBarIcon,
    color: 'yellow',
    queries: [
      "How is my business performing?",
      "Compare this month to last month",
      "What are my profit margins?",
      "Show me expense breakdown"
    ]
  }
];

// Credit packages
const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 100,
    price: 0.99,
    popular: false
  },
  {
    id: 'growth',
    name: 'Growth Pack',
    credits: 500,
    price: 3.99,
    popular: true,
    savings: '20%'
  },
  {
    id: 'pro',
    name: 'Professional',
    credits: 1000,
    price: 6.99,
    popular: false,
    savings: '30%'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    credits: 5000,
    price: 29.99,
    popular: false,
    savings: '40%'
  }
];

// Constants defined successfully

export default function SmartInsight({ onNavigate }) {
  console.log('[SmartInsight] Component mounting');
  
  const router = useRouter();
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // State management
  const [credits, setCredits] = useState(10); // Start with 10 free credits
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  console.log('[SmartInsight] Initial state setup complete');

  // Initialize tenant ID
  useEffect(() => {
    console.log('[SmartInsight] useEffect running for tenant initialization');
    const fetchTenantId = async () => {
      try {
        console.log('[SmartInsight] Calling getSecureTenantId...');
        const id = await getSecureTenantId();
        console.log('[SmartInsight] getSecureTenantId returned:', id, 'type:', typeof id);
        if (id) {
          setTenantId(id);
          console.log('[SmartInsight] Tenant ID set successfully');
        } else {
          console.error('[SmartInsight] No tenant ID returned');
          toast.error('Failed to initialize. Please refresh the page.');
        }
      } catch (error) {
        console.error('[SmartInsight] Error fetching tenant ID:', error);
        toast.error('Failed to initialize. Please try again.');
      } finally {
        console.log('[SmartInsight] Setting isInitialized to true');
        setIsInitialized(true);
      }
    };
    fetchTenantId();
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    if (credits <= 0) {
      toast.error('No credits remaining. Please purchase more credits.');
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
      // Call Smart Insights Claude API
      const response = await fetch('/api/smart-insights/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          context: {
            tenantId: await getSecureTenantId(),
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();
      
      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: data.response,
        timestamp: new Date(),
        usage: data.usage
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setCredits(prev => prev - 1);
      
      // Store credit usage (you might want to sync this with backend)
      logger.info('[SmartInsights] AI response received, tokens used:', data.usage);
      
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to get AI response. Please try again.');
      
      // Don't deduct credits if the request failed
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
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

  // Handle package selection
  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
    // Implement payment flow here
    toast.success(`Selected ${pkg.name} - ${pkg.credits} credits for $${pkg.price}`);
  };

  // Show loading while initializing or if tenant ID is not available
  console.log('[SmartInsight] Render check:', { 
    isInitialized, 
    tenantId,
    shouldShowLoading: !isInitialized || !tenantId 
  });
  
  if (!isInitialized || !tenantId) {
    console.log('[SmartInsight] Showing loading spinner');
    return <CenteredSpinner size="large" text="Initializing Smart Insight..." showText={true} />;
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
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <LightBulbIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Smart Insight</h1>
              <p className="text-gray-600">AI-powered business intelligence assistant</p>
            </div>
          </div>
          
          {/* Credits Display */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Available Credits</p>
              <p className="text-2xl font-bold text-blue-600">{credits || 0}</p>
            </div>
            <button
              onClick={() => setShowBuyCredits(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Buy Credits
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-12">
                <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Start a conversation</p>
                <p className="text-sm mt-2">Ask me anything about your business data</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : message.isError
                        ? 'bg-red-50 text-red-900 border border-red-200'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs mt-1 opacity-75">
                      {message.timestamp && typeof message.timestamp.toLocaleTimeString === 'function' 
                        ? message.timestamp.toLocaleTimeString() 
                        : 'Just now'}
                    </p>
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

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-4">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about your business..."
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
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Popular Queries</h3>
          
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
              <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className={`flex items-center mb-3 ${colorClasses[category.color]}`}>
                  <IconComponent className="h-5 w-5 mr-2" />
                  <h4 className="font-medium">{category.title}</h4>
                </div>
                <div className="space-y-2">
                  {category.queries && category.queries.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => handleTemplateQuery(query)}
                      className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
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
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
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
                      Buy Smart Insight Credits
                    </Dialog.Title>
                    <button
                      onClick={() => setShowBuyCredits(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <p className="text-gray-600 mb-6">
                    Choose a credit package to continue using Smart Insight
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {CREDIT_PACKAGES && CREDIT_PACKAGES.map((pkg) => (
                      <div
                        key={pkg.id}
                        className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedPackage?.id === pkg.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handlePackageSelect(pkg)}
                      >
                        {pkg.popular === true && (
                          <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                            Popular
                          </span>
                        )}
                        
                        <h4 className="font-semibold text-gray-900">{pkg.name}</h4>
                        <p className="text-2xl font-bold text-blue-600 mt-2">
                          ${pkg.price}
                        </p>
                        <p className="text-gray-600 text-sm mt-1">
                          {pkg.credits} credits
                        </p>
                        {pkg.savings && pkg.savings !== undefined && (
                          <p className="text-green-600 text-sm mt-1">
                            Save {pkg.savings}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setShowBuyCredits(false)}
                      className="px-4 py-2 text-gray-700 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (selectedPackage) {
                          toast.success('Payment integration coming soon!');
                          setShowBuyCredits(false);
                        }
                      }}
                      disabled={!selectedPackage}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue to Payment
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
          <p>Error loading Smart Insight</p>
          <p className="text-sm">{error.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }
}