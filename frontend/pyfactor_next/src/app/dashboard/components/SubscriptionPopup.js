import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Box, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  CircularProgress, 
  FormControl, 
  RadioGroup, 
  Radio, 
  FormControlLabel
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '@/hooks/auth';
import { useSnackbar } from '@/hooks/useSnackbar';
import { getSubscriptionPlanColor } from '@/utils/userAttributes';

const SubscriptionPopup = ({ open, onClose }) => {
  const { userData, updateUserAttributes } = useAuth();
  const { showSnackbar } = useSnackbar();
  
  const [selectedPlan, setSelectedPlan] = useState(userData?.subscription_type || 'free');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  
  // Reset selected plan when popup opens
  useEffect(() => {
    if (open) {
      setSelectedPlan(userData?.subscription_type || 'free');
    }
  }, [open, userData]);
  
  // Get plan color using the utility function
  const getPlanColor = (planId) => {
    return getSubscriptionPlanColor(planId);
  };
  
  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
  };
  
  const handleBillingCycleChange = (event) => {
    setBillingCycle(event.target.value);
  };
  
  const handleSubmit = async () => {
    if (selectedPlan === userData?.subscription_type) {
      onClose();
      return;
    }
    
    setIsSubmitting(true);
    try {
      await updateUserAttributes({
        subscription_type: selectedPlan
      });
      showSnackbar('Subscription updated successfully', 'success');
      onClose();
    } catch (error) {
      console.error('Error updating subscription:', error);
      showSnackbar('Failed to update subscription. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const plans = [
    {
      id: 'free',
      name: 'Free Plan',
      price: {
        monthly: 0,
        yearly: 0,
      },
      features: [
        'Basic Code Analysis',
        'Limited API Requests',
        'Community Support',
        'Single User',
      ],
    },
    {
      id: 'professional',
      name: 'Professional',
      price: {
        monthly: 29,
        yearly: 299,
      },
      features: [
        'Advanced Code Analysis',
        'Unlimited API Requests',
        'Priority Support',
        'Up to 5 Users',
        'Custom Integrations',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: {
        monthly: 99,
        yearly: 999,
      },
      features: [
        'Premium Code Analysis',
        'Unlimited Everything',
        'Dedicated Support',
        'Unlimited Users',
        'Custom Integrations',
        'Enterprise Security',
        'Custom Reporting',
      ],
    },
  ];
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 2,
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" fontWeight={600}>
            Choose Your Plan
          </Typography>
          <Button onClick={onClose} sx={{ minWidth: 'auto', p: 1 }}>
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>
      
      <Box sx={{ px: 3, pb: 2 }}>
        <FormControl component="fieldset">
          <RadioGroup
            row
            name="billingCycle"
            value={billingCycle}
            onChange={handleBillingCycleChange}
          >
            <FormControlLabel value="monthly" control={<Radio />} label="Monthly Billing" />
            <FormControlLabel 
              value="yearly" 
              control={<Radio />} 
              label={
                <Box display="flex" alignItems="center">
                  <Typography>Annual Billing</Typography>
                  <Box 
                    sx={{ 
                      ml: 1, 
                      bgcolor: 'success.main', 
                      color: 'white', 
                      px: 1, 
                      py: 0.5, 
                      borderRadius: 1, 
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                  >
                    SAVE 15%
                  </Box>
                </Box>
              } 
            />
          </RadioGroup>
        </FormControl>
      </Box>
      
      <DialogContent>
        <Grid container spacing={3}>
          {plans.map((plan) => (
            <Grid item xs={12} sm={4} key={plan.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  borderRadius: 3,
                  overflow: 'visible',
                  boxShadow: selectedPlan === plan.id 
                    ? '0 8px 24px rgba(0,0,0,0.12)' 
                    : '0 2px 12px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  transform: selectedPlan === plan.id ? 'translateY(-8px)' : 'none',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 8px 28px rgba(0,0,0,0.15)',
                  },
                  ...(selectedPlan === plan.id && {
                    border: '2px solid',
                    borderColor: getPlanColor(plan.id),
                  }),
                }}
              >
                {/* Popular badge */}
                {plan.id === 'professional' && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -12,
                      right: 24,
                      backgroundColor: getPlanColor('professional'),
                      color: 'white',
                      px: 2,
                      py: 0.5,
                      borderRadius: 10,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                      zIndex: 1
                    }}
                  >
                    <Typography variant="caption" fontWeight="bold">
                      POPULAR
                    </Typography>
                  </Box>
                )}
                
                {/* Best value badge */}
                {plan.id === 'enterprise' && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -12,
                      right: 24,
                      backgroundColor: getPlanColor('enterprise'),
                      color: 'white',
                      px: 2,
                      py: 0.5,
                      borderRadius: 10,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                      zIndex: 1
                    }}
                  >
                    <Typography variant="caption" fontWeight="bold">
                      BEST VALUE
                    </Typography>
                  </Box>
                )}
                
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Typography gutterBottom variant="h5" component="h2" fontWeight={600}>
                    {plan.name}
                  </Typography>
                  <Typography variant="h4" sx={{ color: getPlanColor(plan.id) }} gutterBottom fontWeight={700}>
                    ${plan.price[billingCycle]}
                    <Typography
                      component="span"
                      variant="subtitle1"
                      color="text.secondary"
                      sx={{ ml: 0.5, fontWeight: 400 }}
                    >
                      {billingCycle === 'monthly' ? '/month' : '/year'}
                    </Typography>
                  </Typography>
                  
                  {/* Plan features */}
                  <List sx={{ mt: 2 }}>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: '30px' }}>
                          <CheckCircleOutlineIcon sx={{ color: getPlanColor(plan.id) }} />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions sx={{ p: 3, pt: 0 }}>
                  <Button
                    fullWidth
                    variant={selectedPlan === plan.id ? 'contained' : 'outlined'}
                    onClick={() => handlePlanSelect(plan.id)}
                    disabled={isSubmitting}
                    sx={{ 
                      py: 1.2,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '1rem',
                      fontWeight: 500,
                      ...(selectedPlan === plan.id ? {
                        bgcolor: getPlanColor(plan.id),
                        '&:hover': { bgcolor: getPlanColor(plan.id) },
                        boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                      } : {
                        color: getPlanColor(plan.id),
                        borderColor: getPlanColor(plan.id)
                      })
                    }}
                  >
                    {isSubmitting && selectedPlan === plan.id ? (
                      <CircularProgress size={24} />
                    ) : (
                      userData?.subscription_type === plan.id ? 'Current Plan' : 'Select Plan'
                    )}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
        <Button 
          onClick={onClose}
          variant="outlined" 
          sx={{ 
            mr: 2, 
            px: 4, 
            py: 1.2, 
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '1rem'
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained" 
          disabled={isSubmitting || selectedPlan === userData?.subscription_type}
          sx={{ 
            px: 4, 
            py: 1.2, 
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '1rem',
            bgcolor: getPlanColor(selectedPlan),
            '&:hover': { bgcolor: getPlanColor(selectedPlan) },
          }}
        >
          {isSubmitting ? (
            <CircularProgress size={24} />
          ) : (
            'Confirm Selection'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SubscriptionPopup; 