'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Stack,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Tooltip,
  Tab,
  Tabs,
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  InputAdornment,
  Select,
  MenuItem,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HistoryIcon from '@mui/icons-material/History';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PaymentIcon from '@mui/icons-material/Payment';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { styled } from '@mui/material/styles';
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

// Styled components
const QueryContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  padding: theme.spacing(2),
}));

const ResponseCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
}));

const QueryInputContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: '240px', // Adjust based on your drawer width
  right: 0,
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  zIndex: 1000,
}));

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
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={paymentTab} onChange={handlePaymentTabChange} aria-label="payment method tabs">
            <Tab icon={<CreditCardIcon />} label="Credit/Debit Card" />
            <Tab icon={<PaymentIcon />} label="PayPal" disabled />
            <Tab icon={<AccountBalanceIcon />} label="Mobile Money" disabled />
          </Tabs>
        </Box>
        <Box sx={{ p: 3 }}>
          {paymentTab === 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>Enter Your Card Details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Card Number"
                    placeholder="1234 5678 9012 3456"
                    variant="outlined"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <CreditCardIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Expiry Date"
                    placeholder="MM/YY"
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="CVV"
                    placeholder="123"
                    variant="outlined"
                    type="password"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Name on Card"
                    placeholder="John Doe"
                    variant="outlined"
                  />
                </Grid>
              </Grid>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2 }}>
                Your payment is secure and encrypted. We use Stripe for secure payment processing.
              </Typography>
            </Box>
          )}
          {paymentTab === 1 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography>PayPal integration coming soon</Typography>
            </Box>
          )}
          {paymentTab === 2 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography>Mobile Money integration coming soon</Typography>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ height: 'calc(100vh - 130px)', position: 'relative', color: '#0d47a1' }}>
      {/* Token counter and stats */}
      <Box 
        sx={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 100,
          padding: 2,
          backgroundColor: 'white',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Typography variant="h5" component="h1" sx={{ color: '#0d47a1' }}>A.I. Query</Typography>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Chip 
            label={`${remainingTokens} Credits Remaining`} 
            color="primary" 
            variant="outlined" 
            sx={{ color: '#0d47a1', borderColor: '#0d47a1' }}
          />
          <Chip 
            label={`Tokens Used: ${totalTokensUsed}`} 
            color="primary" 
            variant="outlined" 
            sx={{ color: '#0d47a1', borderColor: '#0d47a1' }}
          />
          <Chip 
            label={`Cost: $${totalCost.toFixed(3)}`} 
            color="primary" 
            variant="outlined" 
            sx={{ color: '#0d47a1', borderColor: '#0d47a1' }}
          />
          <Tooltip title="Purchase Tokens">
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<ShoppingCartIcon />}
              onClick={handleBuyTokens}
            >
              Buy Tokens
            </Button>
          </Tooltip>
          <Tooltip title="View History">
            <IconButton onClick={() => setHistoryDialogOpen(true)}>
              <HistoryIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      
      {/* Responses area */}
      <Box 
        ref={responsesContainerRef}
        sx={{ 
          height: 'calc(100% - 180px)', // Reduced height to make space for larger input area
          overflowY: 'auto',
          padding: 2,
          pb: 20, // Increased padding at bottom for larger input box
        }}
      >
        {conversations.length === 0 ? (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              color: '#0d47a1'
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: '#0d47a1' }}>
              Ask questions about your business data
            </Typography>
            <Typography variant="body1" align="center" sx={{ maxWidth: 600, mb: 2, color: '#0d47a1' }}>
              Examples:
            </Typography>
            <Stack spacing={1} sx={{ maxWidth: 600 }}>
              <Button 
                variant="outlined" 
                onClick={() => setQuery("What was my highest selling product last month?")}
                sx={{ color: '#0d47a1', borderColor: '#0d47a1' }}
              >
                What was my highest selling product last month?
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => setQuery("Show me the trends in my monthly expenses this year")}
                sx={{ color: '#0d47a1', borderColor: '#0d47a1' }}
              >
                Show me the trends in my monthly expenses this year
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => setQuery("Which customer has spent the most money with us?")}
                sx={{ color: '#0d47a1', borderColor: '#0d47a1' }}
              >
                Which customer has spent the most money with us?
              </Button>
            </Stack>
          </Box>
        ) : (
          conversations.map((message, index) => (
            <Box 
              key={index} 
              sx={{ 
                display: 'flex', 
                justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                mb: 2 
              }}
            >
              <ResponseCard 
                sx={{ 
                  maxWidth: '80%',
                  backgroundColor: message.type === 'user' ? '#e3f2fd' : '#ffffff',
                  boxShadow: message.type === 'error' ? '0 0 0 2px #f44336' : 'none',
                  border: '1px solid',
                  borderColor: message.type === 'error' ? '#f44336' : '#e0e0e0',
                }}
              >
                <CardContent>
                  <Typography color={message.type === 'user' ? '#0d47a1' : '#000000'} component="div">
                    {message.content}
                  </Typography>
                  
                  {message.tokensUsed && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="textSecondary">
                          Tokens: {message.tokensUsed} | Cost: ${message.cost}
                        </Typography>
                        <IconButton 
                          size="small" 
                          onClick={() => handleCopyResponse(message.content)}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </>
                  )}
                </CardContent>
              </ResponseCard>
            </Box>
          ))
        )}
      </Box>
      
      {/* Query input */}
      <Box 
        component="form" 
        onSubmit={handleSubmit} 
        sx={{ 
          position: 'fixed',
          bottom: 60, // Moved up from bottom to avoid Crisp chat widget
          left: 'auto',
          right: 0,
          width: 'calc(100% - 228px)', // Adjust based on your drawer width
          padding: '16px 16px 24px 16px', // Increased padding
          backgroundColor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ width: '100%', maxWidth: '1200px' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Ask a question about your business data..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            InputProps={{
              sx: { pr: 1, color: '#0d47a1' }
            }}
            sx={{ '& .MuiInputBase-root': { minHeight: '56px' } }} // Increased input height
          />
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={isLoading || !query.trim() || remainingTokens <= 0}
            startIcon={isLoading ? <CircularProgress size={20} /> : <SendIcon />}
            sx={{ height: '56px', minWidth: '100px' }} // Increased button height
          >
            Send
          </Button>
        </Stack>
        {remainingTokens <= 0 && (
          <Alert 
            severity="warning" 
            sx={{ 
              mt: 1, 
              width: '100%', 
              maxWidth: '1200px',
              position: 'absolute',
              top: '80px',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          >
            You've used all your AI credits. Purchase more to continue using AI Query.
          </Alert>
        )}
      </Box>
      
      {/* History dialog */}
      <Dialog 
        open={historyDialogOpen} 
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: '#0d47a1' }}>Query History</Typography>
            <Button 
              variant="outlined" 
              color="error" 
              size="small"
              onClick={handleClearHistory}
              disabled={queryHistory.length === 0}
            >
              Clear History
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {queryHistory.length === 0 ? (
            <Typography align="center" color="textSecondary" py={4}>
              No query history yet
            </Typography>
          ) : (
            <Stack spacing={2}>
              {queryHistory.map((item, index) => (
                <Card 
                  key={index} 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: '#f5f5f5'
                    }
                  }}
                  onClick={() => handleHistoryItemClick(item)}
                >
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom noWrap sx={{ color: '#0d47a1' }}>
                      {item.query}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" noWrap>
                      {item.response.substring(0, 100)}...
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(item.timestamp).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Tokens: {item.tokensUsed} | Cost: ${item.cost}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)} sx={{ color: '#0d47a1' }}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Purchase Tokens Dialog */}
      <Dialog
        open={purchaseDialogOpen}
        onClose={() => setPurchaseDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ color: '#0d47a1' }}>Purchase AI Credits</Typography>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText paragraph>
            Select a token package to enhance your AI analytics capabilities:
          </DialogContentText>
          
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {TOKEN_PACKAGES.map((pkg) => (
              <Grid item xs={12} sm={6} md={3} key={pkg.id}>
                <Card 
                  variant={selectedPackage === pkg.id ? 'outlined' : 'elevation'} 
                  sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    border: selectedPackage === pkg.id ? '2px solid #0d47a1' : '1px solid #e0e0e0',
                    backgroundColor: selectedPackage === pkg.id ? '#e3f2fd' : 'white',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  <Typography variant="h6" sx={{ color: '#0d47a1' }}>{pkg.tokens} Credits</Typography>
                  <Typography variant="h5" sx={{ my: 1, fontWeight: 'bold', color: '#0d47a1' }}>${pkg.price.toFixed(2)}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    ${(pkg.price / pkg.tokens).toFixed(2)} per credit
                  </Typography>
                  <Radio 
                    checked={selectedPackage === pkg.id}
                    onChange={() => setSelectedPackage(pkg.id)}
                    value={pkg.id}
                    name="token-package-radio"
                    inputProps={{ 'aria-label': `${pkg.tokens} tokens` }}
                    sx={{ mt: 1 }}
                  />
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {renderPaymentTabs()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurchaseDialogOpen(false)} sx={{ color: '#0d47a1' }}>Cancel</Button>
          <Button 
            onClick={handlePurchaseTokens} 
            variant="contained" 
            color="primary"
            disabled={paymentTab !== 0} // Only enable for card payments for now
          >
            Purchase
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIQueryPage; 