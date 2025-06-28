'use client';

import React, { useState, useEffect, Fragment, useCallback, useMemo, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import {
  SparklesIcon,
  PaperAirplaneIcon,
  CreditCardIcon,
  BanknotesIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  TrendingUpIcon,
  CurrencyDollarIcon,
  PlusIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  EyeIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="cursor-help"
      >
        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      
      {showTooltip && (
        <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-4`}>
                <div className={`${position === 'top' ? '' : 'rotate-180'}`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Credit packages with 30% markup
const BASE_COST_PER_CREDIT = 0.002; // Your cost from Claude API
const USER_PRICE_PER_CREDIT = BASE_COST_PER_CREDIT * 1.30; // 30% markup = $0.0026

const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 100,
    price: 0.99,
    pricePerCredit: 0.0099,
    popular: false,
    description: 'Perfect for trying out Smart Business AI'
  },
  {
    id: 'growth',
    name: 'Growth Pack',
    credits: 500,
    price: 3.99,
    pricePerCredit: 0.008,
    popular: true,
    description: 'Great for regular business insights',
    savings: 20
  },
  {
    id: 'professional',
    name: 'Professional Pack',
    credits: 1000,
    price: 6.99,
    pricePerCredit: 0.007,
    popular: false,
    description: 'Ideal for data-driven businesses',
    savings: 30
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pack',
    credits: 5000,
    price: 29.99,
    pricePerCredit: 0.006,
    popular: false,
    description: 'Maximum value for power users',
    savings: 40
  }
];

// Payment methods by region
const PAYMENT_METHODS = {
  global: [
    { id: 'stripe', name: 'Credit/Debit Card', icon: CreditCardIcon, processor: 'stripe' },
    { id: 'paypal', name: 'PayPal', icon: BanknotesIcon, processor: 'paypal' }
  ],
  africa: [
    { id: 'mobile-money', name: 'Mobile Money', icon: DevicePhoneMobileIcon, processor: 'mobile-money' },
    { id: 'stripe', name: 'Credit/Debit Card', icon: CreditCardIcon, processor: 'stripe' },
    { id: 'paypal', name: 'PayPal', icon: BanknotesIcon, processor: 'paypal' }
  ]
};

// Query templates for quick start
const QUERY_TEMPLATES = [
  {
    category: 'Revenue & Sales',
    icon: TrendingUpIcon,
    color: 'green',
    queries: [
      "What was my total revenue last month?",
      "Which products are selling best this quarter?", 
      "Show me my sales trends over the past 6 months",
      "What's my average order value?"
    ]
  },
  {
    category: 'Customers',
    icon: UserGroupIcon,
    color: 'blue',
    queries: [
      "Who are my top 10 customers by revenue?",
      "How many new customers did I gain this month?",
      "What's my customer retention rate?",
      "Which customers haven't purchased recently?"
    ]
  },
  {
    category: 'Expenses & Costs',
    icon: CurrencyDollarIcon,
    color: 'red',
    queries: [
      "What were my biggest expenses last month?",
      "How do my costs compare year over year?",
      "What's my profit margin by product?",
      "Where can I cut costs?"
    ]
  },
  {
    category: 'Inventory & Products',
    icon: ShoppingBagIcon,
    color: 'purple',
    queries: [
      "Which products are running low on stock?",
      "What's my inventory turnover rate?",
      "Which products should I reorder?",
      "What's my best-selling product category?"
    ]
  }
];

/**
 * Smart Business AI Assistant Component
 * Industry-standard AI-powered business insights with credit system
 */
function SmartBusiness({ onNavigate }) {
  const router = useRouter();
  const [tenantId, setTenantId] = useState(null);
  const chatEndRef = useRef(null);
  
  // State management
  const [userCredits, setUserCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [businessContext, setBusinessContext] = useState(null);
  
  // Modal states
  const [isBuyCreditsModalOpen, setIsBuyCreditsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [userRegion, setUserRegion] = useState('global');
  
  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    name: '',
    email: '',
    phone: '' // For mobile money
  });

  // Initialize tenant ID and load user data
  useEffect(() => {
    const init = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
      
      // Detect user region (simplified)
      // In production, use proper geolocation
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone.includes('Africa')) {
        setUserRegion('africa');
      }
      
      await loadUserCredits(id);
      await loadBusinessContext(id);
      await loadChatHistory(id);
      setIsLoading(false);
    };
    init();
  }, []);

  // Scroll to bottom when chat updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Load user credits
  const loadUserCredits = async (businessId) => {
    try {
      // In production, fetch from your API
      const credits = localStorage.getItem(`credits_${businessId}`) || 50; // Default 50 credits
      setUserCredits(parseInt(credits));
    } catch (error) {
      logger.error('[SmartBusiness] Error loading credits:', error);
    }
  };

  // Load business context for AI
  const loadBusinessContext = async (businessId) => {
    try {
      // This would fetch real business data from your APIs
      const context = {
        business: {
          name: 'Your Business',
          industry: 'Retail',
          founded: '2023'
        },
        summary: {
          totalRevenue: 125000,
          totalExpenses: 89000,
          customerCount: 342,
          productCount: 156,
          avgOrderValue: 87.50
        },
        recentData: {
          lastMonthRevenue: 12500,
          lastMonthOrders: 143,
          topProducts: ['Product A', 'Product B', 'Product C'],
          topCustomers: ['Customer 1', 'Customer 2', 'Customer 3']
        }
      };
      setBusinessContext(context);
    } catch (error) {
      logger.error('[SmartBusiness] Error loading business context:', error);
    }
  };

  // Load chat history
  const loadChatHistory = async (businessId) => {
    try {
      const history = JSON.parse(localStorage.getItem(`chat_history_${businessId}`) || '[]');
      setChatHistory(history);
    } catch (error) {
      logger.error('[SmartBusiness] Error loading chat history:', error);
    }
  };

  // Save chat history
  const saveChatHistory = (history) => {
    if (tenantId) {
      localStorage.setItem(`chat_history_${tenantId}`, JSON.stringify(history));
    }
  };

  // Calculate credits needed for query
  const calculateCreditsNeeded = (query) => {
    const queryLower = query.toLowerCase();
    let credits = 1; // Base cost
    
    // Complex analysis queries cost more
    if (queryLower.includes('analyze') || queryLower.includes('compare') || queryLower.includes('trend')) {
      credits += 1;
    }
    
    // Time-based queries cost more
    if (queryLower.includes('year') || queryLower.includes('quarter') || queryLower.includes('annual')) {
      credits += 1;
    }
    
    return Math.min(credits, 5); // Max 5 credits per query
  };

  // Process AI query
  const handleQuery = async () => {
    if (!currentQuery.trim()) {
      toast.error('Please enter a question');
      return;
    }

    const creditsNeeded = calculateCreditsNeeded(currentQuery);
    
    if (userCredits < creditsNeeded) {
      toast.error(`You need ${creditsNeeded} credits for this query. Buy more credits to continue.`);
      setIsBuyCreditsModalOpen(true);
      return;
    }

    setIsProcessing(true);
    
    try {
      // Add user message to chat
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: currentQuery,
        timestamp: new Date().toISOString()
      };

      const updatedHistory = [...chatHistory, userMessage];
      setChatHistory(updatedHistory);
      
      // Create AI prompt with business context
      const prompt = createBusinessPrompt(currentQuery, businessContext);
      
      // Call Claude API (replace with your actual API endpoint)
      const response = await callClaudeAPI(prompt, creditsNeeded);
      
      // Add AI response to chat
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.content,
        creditsUsed: creditsNeeded,
        cost: (creditsNeeded * USER_PRICE_PER_CREDIT).toFixed(4),
        timestamp: new Date().toISOString(),
        suggestions: response.suggestions || []
      };

      const finalHistory = [...updatedHistory, aiMessage];
      setChatHistory(finalHistory);
      saveChatHistory(finalHistory);
      
      // Deduct credits
      const newCredits = userCredits - creditsNeeded;
      setUserCredits(newCredits);
      localStorage.setItem(`credits_${tenantId}`, newCredits.toString());
      
      setCurrentQuery('');
      toast.success(`Query processed! ${creditsNeeded} credits used.`);
      
    } catch (error) {
      logger.error('[SmartBusiness] Error processing query:', error);
      toast.error('Failed to process query. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Create business-specific prompt for Claude
  const createBusinessPrompt = (query, context) => {
    if (!context) return query;
    
    return `You are a helpful business analyst for ${context.business.name}.

Current Business Data:
- Total Revenue: $${context.summary.totalRevenue.toLocaleString()}
- Total Expenses: $${context.summary.totalExpenses.toLocaleString()}
- Customer Count: ${context.summary.customerCount}
- Product Count: ${context.summary.productCount}
- Average Order Value: $${context.summary.avgOrderValue}

Recent Performance:
- Last Month Revenue: $${context.recentData.lastMonthRevenue.toLocaleString()}
- Last Month Orders: ${context.recentData.lastMonthOrders}
- Top Products: ${context.recentData.topProducts.join(', ')}

User Question: ${query}

Please provide a clear, actionable answer based on the data above. Include specific numbers and insights. End with 2-3 actionable recommendations.`;
  };

  // Call Claude API (mock implementation)
  const callClaudeAPI = async (prompt, creditsUsed) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock response - replace with actual Claude API call
    const responses = [
      {
        content: "Based on your business data, your revenue has been performing well with an average order value of $87.50. Your customer base of 342 customers is generating solid revenue. I recommend focusing on customer retention and increasing order frequency.",
        suggestions: [
          "What's my customer retention rate?",
          "How can I increase average order value?",
          "Show me seasonal trends"
        ]
      },
      {
        content: "Your business shows healthy fundamentals with strong revenue growth. The profit margin appears good given your revenue vs expenses ratio. Consider expanding your top-performing products and optimizing inventory for better cash flow.",
        suggestions: [
          "Which products have the highest margins?",
          "What's my inventory turnover?",
          "How do I compare to industry averages?"
        ]
      }
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Handle payment processing
  const handlePayment = async () => {
    if (!selectedPackage || !selectedPaymentMethod) {
      toast.error('Please select a package and payment method');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Process payment based on method
      let paymentResult;
      
      switch (selectedPaymentMethod.processor) {
        case 'stripe':
          paymentResult = await processStripePayment(selectedPackage, paymentForm);
          break;
        case 'paypal':
          paymentResult = await processPayPalPayment(selectedPackage);
          break;
        case 'mobile-money':
          paymentResult = await processMobileMoneyPayment(selectedPackage, paymentForm);
          break;
        default:
          throw new Error('Unsupported payment method');
      }
      
      if (paymentResult.success) {
        // Add credits to user account
        const newCredits = userCredits + selectedPackage.credits;
        setUserCredits(newCredits);
        localStorage.setItem(`credits_${tenantId}`, newCredits.toString());
        
        // Track transaction
        await trackPurchase(selectedPackage, paymentResult);
        
        toast.success(`Payment successful! ${selectedPackage.credits} credits added to your account.`);
        setIsPaymentModalOpen(false);
        setIsBuyCreditsModalOpen(false);
        
        // Reset form
        setSelectedPackage(null);
        setSelectedPaymentMethod(null);
        setPaymentForm({
          cardNumber: '', expiryDate: '', cvv: '', name: '', email: '', phone: ''
        });
      }
      
    } catch (error) {
      logger.error('[SmartBusiness] Payment error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Mock payment processors (replace with real implementations)
  const processStripePayment = async (package_, form) => {
    // Simulate Stripe payment
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { success: true, transactionId: 'stripe_' + Date.now() };
  };

  const processPayPalPayment = async (package_) => {
    // Simulate PayPal payment
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { success: true, transactionId: 'paypal_' + Date.now() };
  };

  const processMobileMoneyPayment = async (package_, form) => {
    // Simulate Mobile Money payment
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { success: true, transactionId: 'mobile_' + Date.now() };
  };

  // Track purchase for analytics
  const trackPurchase = async (package_, paymentResult) => {
    try {
      const purchase = {
        timestamp: new Date().toISOString(),
        tenantId,
        package: package_.id,
        credits: package_.credits,
        amount: package_.price,
        paymentMethod: selectedPaymentMethod.processor,
        transactionId: paymentResult.transactionId
      };
      
      // Save to your analytics/billing system
      console.log('Purchase tracked:', purchase);
    } catch (error) {
      logger.error('[SmartBusiness] Error tracking purchase:', error);
    }
  };

  // Quick query templates
  const handleTemplateQuery = (query) => {
    setCurrentQuery(query);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black flex items-center">
            <SparklesIcon className="w-8 h-8 text-purple-600 mr-3" />
            Smart Business AI
          </h1>
          <p className="text-gray-600 mt-1">
            Get instant insights about your business data using AI-powered analysis
          </p>
        </div>
        
        {/* Credits Display */}
        <div className="flex items-center space-x-4">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
            <div className="flex items-center">
              <SparklesIcon className="w-5 h-5 text-purple-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-900">{userCredits} Credits</p>
                <p className="text-xs text-gray-500">Available</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setIsBuyCreditsModalOpen(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Buy Credits
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chat Interface */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <SparklesIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">AI Business Assistant</h3>
                  <p className="text-sm text-gray-500">Ask questions about your business data</p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 ? (
                <div className="text-center py-8">
                  <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Start a conversation by asking about your business</p>
                  <p className="text-sm text-gray-400 mt-1">Try: "What was my revenue last month?"</p>
                </div>
              ) : (
                chatHistory.map((message, index) => (
                  <div key={message.id || `msg-${index}`} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.type === 'user' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      
                      {message.type === 'ai' && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{message.creditsUsed} credits used</span>
                            <span>Cost: ${message.cost}</span>
                          </div>
                          
                          {message.suggestions && message.suggestions.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Suggested follow-ups:</p>
                              <div className="space-y-1">
                                {message.suggestions.map((suggestion, index) => (
                                  <button
                                    key={index}
                                    onClick={() => handleTemplateQuery(suggestion)}
                                    className="block text-xs text-purple-600 hover:text-purple-800 text-left"
                                  >
                                    • {suggestion}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-[80%]">
                    <div className="flex items-center">
                      <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-sm text-gray-600">AI is analyzing your data...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={currentQuery}
                  onChange={(e) => setCurrentQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleQuery()}
                  placeholder="Ask about your business data..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleQuery}
                  disabled={isProcessing || !currentQuery.trim()}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                Query will use ~{calculateCreditsNeeded(currentQuery)} credits
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Templates */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <LightBulbIcon className="w-5 h-5 text-yellow-500 mr-2" />
              Quick Insights
            </h3>
            
            <div className="space-y-3">
              {QUERY_TEMPLATES.map((category) => {
                const IconComponent = category.icon;
                return (
                  <div key={category.category}>
                    <h4 className={`text-sm font-medium text-${category.color}-600 mb-2 flex items-center`}>
                      <IconComponent className="w-4 h-4 mr-1" />
                      {category.category}
                    </h4>
                    <div className="space-y-1 ml-5">
                      {category.queries.slice(0, 2).map((query, index) => (
                        <button
                          key={index}
                          onClick={() => handleTemplateQuery(query)}
                          className="block text-xs text-gray-600 hover:text-purple-600 text-left"
                        >
                          • {query}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <ChartBarIcon className="w-5 h-5 text-blue-500 mr-2" />
              Usage Statistics
            </h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Queries</span>
                <span className="font-medium">{chatHistory.filter(m => m.type === 'user').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Credits Used</span>
                <span className="font-medium">
                  {chatHistory.filter(m => m.type === 'ai').reduce((sum, m) => sum + (m.creditsUsed || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Spent</span>
                <span className="font-medium">
                  ${chatHistory.filter(m => m.type === 'ai').reduce((sum, m) => sum + parseFloat(m.cost || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Business Context */}
          {businessContext && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <DocumentTextIcon className="w-5 h-5 text-gray-500 mr-2" />
                Business Overview
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Revenue</span>
                  <span className="font-medium">{formatCurrency(businessContext.summary.totalRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customers</span>
                  <span className="font-medium">{businessContext.summary.customerCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Products</span>
                  <span className="font-medium">{businessContext.summary.productCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Order</span>
                  <span className="font-medium">{formatCurrency(businessContext.summary.avgOrderValue)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Buy Credits Modal */}
      <Transition appear show={isBuyCreditsModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsBuyCreditsModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                      Buy AI Credits
                    </Dialog.Title>
                    <button
                      onClick={() => setIsBuyCreditsModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {CREDIT_PACKAGES.map((package_) => (
                      <div
                        key={package_.id}
                        onClick={() => {
                          setSelectedPackage(package_);
                          setIsPaymentModalOpen(true);
                        }}
                        className={`relative border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                          package_.popular ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {package_.popular && (
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                            <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                              Most Popular
                            </span>
                          </div>
                        )}
                        
                        <div className="text-center">
                          <h4 className="font-semibold text-gray-900">{package_.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{package_.description}</p>
                          
                          <div className="mt-4">
                            <div className="text-3xl font-bold text-purple-600">
                              {formatCurrency(package_.price)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {package_.credits.toLocaleString()} credits
                            </div>
                            <div className="text-xs text-gray-400">
                              ${package_.pricePerCredit.toFixed(4)} per credit
                            </div>
                            {package_.savings && (
                              <div className="text-xs text-green-600 font-medium mt-1">
                                Save {package_.savings}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">What can you do with credits?</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Ask questions about your business data</li>
                      <li>• Get AI-powered insights and recommendations</li>
                      <li>• Analyze trends and patterns in your sales</li>
                      <li>• Discover opportunities for growth</li>
                    </ul>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Payment Modal */}
      <Transition appear show={isPaymentModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsPaymentModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                      Complete Payment
                    </Dialog.Title>
                    <button
                      onClick={() => setIsPaymentModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  {selectedPackage && (
                    <div className="space-y-6">
                      {/* Package Summary */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900">{selectedPackage.name}</h4>
                        <div className="flex justify-between mt-2">
                          <span className="text-gray-600">{selectedPackage.credits} credits</span>
                          <span className="font-semibold">{formatCurrency(selectedPackage.price)}</span>
                        </div>
                      </div>

                      {/* Payment Methods */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Payment Method
                          <FieldTooltip text="Choose your preferred payment method. Mobile Money is available for African countries." />
                        </label>
                        
                        <div className="space-y-2">
                          {(PAYMENT_METHODS[userRegion] || PAYMENT_METHODS.global).map((method) => {
                            const IconComponent = method.icon;
                            return (
                              <button
                                key={method.id}
                                onClick={() => setSelectedPaymentMethod(method)}
                                className={`w-full flex items-center p-3 border rounded-lg text-left transition-colors ${
                                  selectedPaymentMethod?.id === method.id
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <IconComponent className="w-5 h-5 text-gray-500 mr-3" />
                                <span className="font-medium">{method.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Payment Form */}
                      {selectedPaymentMethod && (
                        <div className="space-y-4">
                          {selectedPaymentMethod.processor === 'stripe' && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Card Number
                                </label>
                                <input
                                  type="text"
                                  value={paymentForm.cardNumber}
                                  onChange={(e) => setPaymentForm({...paymentForm, cardNumber: e.target.value})}
                                  placeholder="1234 5678 9012 3456"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Expiry Date
                                  </label>
                                  <input
                                    type="text"
                                    value={paymentForm.expiryDate}
                                    onChange={(e) => setPaymentForm({...paymentForm, expiryDate: e.target.value})}
                                    placeholder="MM/YY"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    CVV
                                  </label>
                                  <input
                                    type="text"
                                    value={paymentForm.cvv}
                                    onChange={(e) => setPaymentForm({...paymentForm, cvv: e.target.value})}
                                    placeholder="123"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Cardholder Name
                                </label>
                                <input
                                  type="text"
                                  value={paymentForm.name}
                                  onChange={(e) => setPaymentForm({...paymentForm, name: e.target.value})}
                                  placeholder="John Doe"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                />
                              </div>
                            </>
                          )}
                          
                          {selectedPaymentMethod.processor === 'mobile-money' && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Phone Number
                                </label>
                                <input
                                  type="tel"
                                  value={paymentForm.phone}
                                  onChange={(e) => setPaymentForm({...paymentForm, phone: e.target.value})}
                                  placeholder="+254 7XX XXX XXX"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Name
                                </label>
                                <input
                                  type="text"
                                  value={paymentForm.name}
                                  onChange={(e) => setPaymentForm({...paymentForm, name: e.target.value})}
                                  placeholder="Account holder name"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                />
                              </div>
                            </>
                          )}
                          
                          {selectedPaymentMethod.processor === 'paypal' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <p className="text-sm text-blue-700">
                                You will be redirected to PayPal to complete your payment.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Payment Button */}
                      <button
                        onClick={handlePayment}
                        disabled={!selectedPaymentMethod || isProcessing}
                        className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isProcessing ? (
                          <>
                            <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Pay {formatCurrency(selectedPackage.price)}
                          </>
                        )}
                      </button>

                      {/* Security Notice */}
                      <div className="text-center">
                        <p className="text-xs text-gray-500">
                          🔒 Your payment information is secure and encrypted
                        </p>
                      </div>
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

export default SmartBusiness;