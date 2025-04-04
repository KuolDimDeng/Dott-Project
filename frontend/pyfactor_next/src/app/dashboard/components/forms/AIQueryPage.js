'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button, TextField, Card, Dialog } from '@/components/ui/TailwindComponents';
import { logger } from '@/utils/logger';

// Mock function to simulate API call to AI service
const queryAI = async (query, businessData) => {
  // In a real implementation, this would call your backend API that forwards to Claude
  logger.debug('Querying AI with:', { query, businessData });
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock response
  return {
    response: `This is a simulated response to your query: "${query}". In a real implementation, this would come from Claude 3.7 Sonnet or another AI model.`,
    tokensUsed: Math.floor(Math.random() * 200) + 50, // Random token count between 50-250
    cost: (Math.random() * 0.05).toFixed(3), // Random cost between $0.000 and $0.050
  };
};

// Token pricing and tiers information
const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free Tier",
    tokens: 5, // 5 AI credits
  },
  professional: {
    name: "Professional Tier",
    tokens: 10, // 10 AI credits
  },
  enterprise: {
    name: "Enterprise Tier",
    tokens: 15, // 15 AI credits
  }
};

// Token package options
const TOKEN_PACKAGES = [
  { id: 'basic', tokens: 10, price: 4.99 },
  { id: 'standard', tokens: 25, price: 9.99 },
  { id: 'premium', tokens: 50, price: 16.99 },
  { id: 'business', tokens: 100, price: 29.99 },
];

// Icons as SVG components for Tailwind compatibility
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
  </svg>
);

const ContentCopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
    <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
  </svg>
);

const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
  </svg>
);

const ShoppingCartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
  </svg>
);

const CreditCardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
  </svg>
);

const PaymentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
    <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
  </svg>
);

const AccountBalanceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

// Main component
const AIQueryPage = ({ userData }) => {
  const [query, setQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalTokensUsed, setTotalTokensUsed] = useState(0);
  const [remainingTokens, setRemainingTokens] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [queryHistory, setQueryHistory] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [selectedPackage, setSelectedPackage] = useState('standard');
  const [paymentTab, setPaymentTab] = useState(0);
  const responsesContainerRef = useRef(null);

  // Get user subscription tier from userData
  const subscriptionTier = userData?.subscription_type || 'free';
  const tierTokens = SUBSCRIPTION_TIERS[subscriptionTier]?.tokens || SUBSCRIPTION_TIERS.free.tokens;

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (responsesContainerRef.current) {
      responsesContainerRef.current.scrollTop = responsesContainerRef.current.scrollHeight;
    }
  }, [conversations]);

  // Load conversation history and token data from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('aiQueryHistory');
    const savedTokens = localStorage.getItem('aiQueryTokens');
    const savedCost = localStorage.getItem('aiQueryCost');
    const savedRemainingTokens = localStorage.getItem('aiQueryRemainingTokens');
    
    if (savedHistory) {
      try {
        setQueryHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error parsing saved query history:', e);
      }
    }
    
    if (savedTokens) setTotalTokensUsed(parseInt(savedTokens, 10) || 0);
    if (savedCost) setTotalCost(parseFloat(savedCost) || 0);
    
    // Set initial remaining tokens based on subscription tier if not in localStorage yet
    if (savedRemainingTokens) {
      setRemainingTokens(parseInt(savedRemainingTokens, 10));
    } else {
      setRemainingTokens(tierTokens);
      localStorage.setItem('aiQueryRemainingTokens', tierTokens.toString());
    }
  }, [tierTokens]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    // Check if user has enough tokens
    if (remainingTokens <= 0) {
      setPurchaseDialogOpen(true);
      return;
    }
    
    const currentQuery = query;
    setQuery('');
    setIsLoading(true);
    
    // Add user query to conversation
    setConversations(prev => [...prev, { type: 'user', content: currentQuery }]);
    
    try {
      // In a real implementation, you would fetch business data here
      const businessData = {
        // Example data that would be sent along with the query
        sales: [],
        customers: [],
        products: [],
        expenses: []
      };
      
      // Call AI service
      const result = await queryAI(currentQuery, businessData);
      
      // Add AI response to conversation
      setConversations(prev => [...prev, { 
        type: 'ai', 
        content: result.response,
        tokensUsed: result.tokensUsed,
        cost: result.cost
      }]);
      
      // Update totals
      const newTotalTokens = totalTokensUsed + result.tokensUsed;
      const newTotalCost = totalCost + parseFloat(result.cost);
      const tokenUsed = 1; // Each query uses 1 token/credit
      const newRemainingTokens = remainingTokens - tokenUsed;
      
      setTotalTokensUsed(newTotalTokens);
      setTotalCost(parseFloat(newTotalCost.toFixed(3)));
      setRemainingTokens(newRemainingTokens);
      
      // Save to history
      const newHistoryItem = {
        query: currentQuery,
        response: result.response,
        timestamp: new Date().toISOString(),
        tokensUsed: result.tokensUsed,
        cost: result.cost
      };
      
      const updatedHistory = [newHistoryItem, ...queryHistory];
      setQueryHistory(updatedHistory);
      
      // Save to localStorage
      localStorage.setItem('aiQueryHistory', JSON.stringify(updatedHistory));
      localStorage.setItem('aiQueryTokens', newTotalTokens.toString());
      localStorage.setItem('aiQueryCost', newTotalCost.toString());
      localStorage.setItem('aiQueryRemainingTokens', newRemainingTokens.toString());
      
    } catch (error) {
      console.error('Error querying AI:', error);
      setConversations(prev => [...prev, { 
        type: 'error', 
        content: 'Sorry, there was an error processing your request. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResponse = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleHistoryItemClick = (item) => {
    setQuery(item.query);
    setHistoryDialogOpen(false);
  };

  const handleClearHistory = () => {
    setQueryHistory([]);
    localStorage.removeItem('aiQueryHistory');
  };

  const handleBuyTokens = () => {
    setPurchaseDialogOpen(true);
  };

  const handlePaymentTabChange = (event, newValue) => {
    setPaymentTab(newValue);
  };

  const handlePaymentMethodChange = (event) => {
    setPaymentMethod(event.target.value);
  };

  const handlePackageChange = (event) => {
    setSelectedPackage(event.target.value);
  };

  const handlePurchaseTokens = () => {
    // In a real implementation, this would integrate with Stripe, PayPal, etc.
    // For now, we'll just simulate adding tokens
    const packageToAdd = TOKEN_PACKAGES.find(pkg => pkg.id === selectedPackage);
    
    if (packageToAdd) {
      const newRemainingTokens = remainingTokens + packageToAdd.tokens;
      setRemainingTokens(newRemainingTokens);
      localStorage.setItem('aiQueryRemainingTokens', newRemainingTokens.toString());
      
      // Close dialog
      setPurchaseDialogOpen(false);
      
      // In a real implementation, you would redirect to Stripe checkout or handle payment processing
      alert(`Successfully purchased ${packageToAdd.tokens} tokens for $${packageToAdd.price.toFixed(2)}!`);
    }
  };

  const renderPaymentTabs = () => {
    return (
      <div className="w-full">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              className={`flex items-center py-2 px-4 ${paymentTab === 0 
                ? 'text-blue-600 border-b-2 border-blue-600 font-medium' 
                : 'text-gray-500 hover:text-blue-600'}`}
              onClick={(e) => handlePaymentTabChange(e, 0)}
              aria-label="Credit/Debit Card"
            >
              <CreditCardIcon />
              <span className="ml-2">Credit/Debit Card</span>
            </button>
            <button
              className="flex items-center py-2 px-4 text-gray-400 cursor-not-allowed"
              disabled
              aria-label="PayPal"
            >
              <PaymentIcon />
              <span className="ml-2">PayPal</span>
            </button>
            <button
              className="flex items-center py-2 px-4 text-gray-400 cursor-not-allowed"
              disabled
              aria-label="Mobile Money"
            >
              <AccountBalanceIcon />
              <span className="ml-2">Mobile Money</span>
            </button>
          </div>
        </div>
        <div className="p-4">
          {paymentTab === 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Enter Your Card Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-12">
                  <TextField
                    fullWidth
                    label="Card Number"
                    placeholder="1234 5678 9012 3456"
                    endAdornment={<CreditCardIcon />}
                  />
                </div>
                <div className="md:col-span-6">
                  <TextField
                    fullWidth
                    label="Expiry Date"
                    placeholder="MM/YY"
                  />
                </div>
                <div className="md:col-span-6">
                  <TextField
                    fullWidth
                    label="CVV"
                    placeholder="123"
                    type="password"
                  />
                </div>
                <div className="md:col-span-12">
                  <TextField
                    fullWidth
                    label="Name on Card"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Your payment is secure and encrypted. We use Stripe for secure payment processing.
              </p>
            </div>
          )}
          {paymentTab === 1 && (
            <div className="text-center py-8">
              <p>PayPal integration coming soon</p>
            </div>
          )}
          {paymentTab === 2 && (
            <div className="text-center py-8">
              <p>Mobile Money integration coming soon</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-130px)] relative text-blue-900">
      {/* Token counter and stats */}
      <div className="sticky top-0 z-50 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-xl font-bold text-blue-900 dark:text-blue-100">A.I. Query</h1>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 dark:bg-blue-900 border border-blue-500 text-blue-800 dark:text-blue-100">
            {remainingTokens} Credits Remaining
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 dark:bg-blue-900 border border-blue-500 text-blue-800 dark:text-blue-100">
            Used: {totalTokensUsed}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 dark:bg-blue-900 border border-blue-500 text-blue-800 dark:text-blue-100">
            Cost: ${totalCost.toFixed(3)}
          </span>
          <Button 
            variant="primary"
            onClick={handleBuyTokens}
            className="sm:w-auto w-full flex items-center justify-center"
          >
            <ShoppingCartIcon />
            <span className="ml-2">Buy Credits</span>
          </Button>
          <button 
            onClick={() => setHistoryDialogOpen(true)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="View history"
          >
            <HistoryIcon />
          </button>
        </div>
      </div>
      
      {/* Responses area */}
      <div 
        ref={responsesContainerRef}
        className="h-[calc(100%-180px)] overflow-y-auto p-4 pb-28 mb-16"
      >
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-blue-900 dark:text-blue-100">
            <h2 className="text-lg font-semibold mb-2">
              Ask questions about your business data
            </h2>
            <p className="text-center max-w-lg mb-4">
              Examples:
            </p>
            <div className="flex flex-col space-y-2 max-w-lg w-full">
              <Button 
                variant="outlined"
                onClick={() => setQuery("What was my highest selling product last month?")}
                className="border-blue-900 text-blue-900 dark:border-blue-400 dark:text-blue-100"
              >
                What was my highest selling product last month?
              </Button>
              <Button 
                variant="outlined"
                onClick={() => setQuery("Show me the trends in my monthly expenses this year")}
                className="border-blue-900 text-blue-900 dark:border-blue-400 dark:text-blue-100"
              >
                Show me the trends in my monthly expenses this year
              </Button>
              <Button 
                variant="outlined"
                onClick={() => setQuery("Which customer has spent the most money with us?")}
                className="border-blue-900 text-blue-900 dark:border-blue-400 dark:text-blue-100"
              >
                Which customer has spent the most money with us?
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-lg shadow-sm border 
                  ${message.type === 'user' 
                    ? 'bg-blue-50 dark:bg-blue-900 border-blue-100 dark:border-blue-800' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'} 
                  ${message.type === 'error' ? 'border-red-500 dark:border-red-500' : ''}`}
                >
                  <div className="p-4">
                    <p className={message.type === 'user' ? 'text-blue-900 dark:text-blue-100' : 'text-gray-800 dark:text-gray-100'}>
                      {message.content}
                    </p>
                    
                    {message.tokensUsed && (
                      <>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Tokens: {message.tokensUsed} | Cost: ${message.cost}
                          </span>
                          <button 
                            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => handleCopyResponse(message.content)}
                            aria-label="Copy response"
                          >
                            <ContentCopyIcon />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Query input */}
      <form 
        onSubmit={handleSubmit} 
        className="fixed bottom-20 left-0 sm:left-[70px] lg:left-[260px] right-0 sm:w-[calc(100%-70px)] lg:w-[calc(100%-260px)] p-4 sm:p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 flex justify-center shadow-md"
      >
        <div className="flex space-x-2 w-full max-w-6xl">
          <TextField
            fullWidth
            placeholder="Ask a question about your business data..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            className="border-blue-900 focus:ring-blue-500 rounded-lg"
          />
          <Button
            variant="primary"
            type="submit"
            disabled={isLoading || !query.trim() || remainingTokens <= 0}
            className="h-14 min-w-[100px] rounded-lg"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Send
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <SendIcon />
                <span className="ml-2">Send</span>
              </span>
            )}
          </Button>
        </div>
        {remainingTokens <= 0 && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-full max-w-6xl bg-yellow-50 border-l-4 border-yellow-400 p-4 text-yellow-700">
            <p className="font-medium">You've used all your AI credits. Purchase more to continue using AI Query.</p>
          </div>
        )}
      </form>
      
      {/* History dialog */}
      <Dialog 
        open={historyDialogOpen} 
        onClose={() => setHistoryDialogOpen(false)}
      >
        <div>
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Query History
            </h2>
            <Button 
              variant="outlined"
              onClick={handleClearHistory}
              disabled={queryHistory.length === 0}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              Clear History
            </Button>
          </div>
        </div>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 max-h-[60vh] overflow-y-auto">
          {queryHistory.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No query history yet
            </p>
          ) : (
            <div className="space-y-4">
              {queryHistory.map((item, index) => (
                <div 
                  key={index} 
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => handleHistoryItemClick(item)}
                >
                  <p className="font-medium text-blue-900 dark:text-blue-100 truncate">
                    {item.query}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {item.response.substring(0, 100)}...
                  </p>
                  <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                    <span>
                      Tokens: {item.tokensUsed} | Cost: ${item.cost}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 flex justify-end">
          <Button 
            onClick={() => setHistoryDialogOpen(false)}
            className="text-blue-900 dark:text-blue-100"
          >
            Close
          </Button>
        </div>
      </Dialog>
      
      {/* Purchase Tokens Dialog */}
      <Dialog
        open={purchaseDialogOpen}
        onClose={() => setPurchaseDialogOpen(false)}
      >
        <div>
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Purchase AI Credits
            </h2>
            <button 
              onClick={() => setPurchaseDialogOpen(false)} 
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            Select a token package to enhance your AI analytics capabilities:
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {TOKEN_PACKAGES.map((pkg) => (
              <div 
                key={pkg.id}
                className={`p-4 text-center rounded-lg cursor-pointer ${
                  selectedPackage === pkg.id 
                    ? 'border-2 border-blue-900 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500' 
                    : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
                onClick={() => setSelectedPackage(pkg.id)}
              >
                <p className="text-lg text-blue-900 dark:text-blue-100">{pkg.tokens} Credits</p>
                <p className="text-xl font-bold my-2 text-blue-900 dark:text-blue-100">${pkg.price.toFixed(2)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ${(pkg.price / pkg.tokens).toFixed(2)} per credit
                </p>
                <div className="mt-2 flex justify-center">
                  <input 
                    type="radio" 
                    checked={selectedPackage === pkg.id}
                    onChange={() => setSelectedPackage(pkg.id)}
                    value={pkg.id}
                    name="token-package-radio"
                    aria-label={`${pkg.tokens} tokens`}
                    className="form-radio h-5 w-5 text-blue-600"
                  />
                </div>
              </div>
            ))}
          </div>
          
          {renderPaymentTabs()}
        </div>
        <div className="p-4 flex justify-end space-x-2">
          <Button 
            variant="text"
            onClick={() => setPurchaseDialogOpen(false)}
            className="text-blue-900 dark:text-blue-100"
          >
            Cancel
          </Button>
          <Button 
            variant="primary"
            onClick={handlePurchaseTokens}
            disabled={paymentTab !== 0} // Only enable for card payments for now
          >
            Purchase
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

export default AIQueryPage; 