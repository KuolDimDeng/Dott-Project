///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/layout.js
'use client';

import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Container, 
  CircularProgress, 
  AppBar,
  Toolbar,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  useTheme,
  useMediaQuery,
  StepConnector,
  styled
} from '@mui/material';
import { useSession } from '@/hooks/useSession';
import { useRouter, usePathname } from 'next/navigation';
import { logger } from '@/utils/logger';
import { appendLanguageParam } from '@/utils/languageUtils';
import { ToastProvider } from '@/components/Toast/ToastProvider';
import { ONBOARDING_STEPS, STEPS } from '@/config/steps';
import Image from 'next/image';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BusinessIcon from '@mui/icons-material/Business';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import PaymentIcon from '@mui/icons-material/Payment';
import SettingsIcon from '@mui/icons-material/Settings';
import DoneAllIcon from '@mui/icons-material/DoneAll';

// Styled components for the step connector
const EnhancedConnector = styled(StepConnector)(({ theme }) => ({
  [`&.MuiStepConnector-alternativeLabel`]: {
    top: 22,
  },
  [`&.MuiStepConnector-active`]: {
    [`& .MuiStepConnector-line`]: {
      backgroundImage: `linear-gradient(95deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.primary.dark} 100%)`,
    },
  },
  [`&.MuiStepConnector-completed`]: {
    [`& .MuiStepConnector-line`]: {
      backgroundImage: `linear-gradient(95deg, ${theme.palette.success.light} 0%, ${theme.palette.success.main} 50%, ${theme.palette.success.dark} 100%)`,
    },
  },
  [`& .MuiStepConnector-line`]: {
    height: 4,
    border: 0,
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
    borderRadius: 4,
  },
}));

// Styled component for step icons
const EnhancedStepIconRoot = styled('div')(({ theme, ownerState }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#e0e0e0',
  zIndex: 1,
  color: '#fff',
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  boxShadow: '0 4px 10px 0 rgba(0,0,0,.1)',
  transition: 'all 0.3s ease',
  ...(ownerState.active && {
    backgroundImage: `linear-gradient(136deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.primary.dark} 100%)`,
    boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)',
    transform: 'scale(1.1)',
  }),
  ...(ownerState.completed && {
    backgroundImage: `linear-gradient(136deg, ${theme.palette.success.light} 0%, ${theme.palette.success.main} 50%, ${theme.palette.success.dark} 100%)`,
  }),
}));

// Step icon component with different icons for each step
function EnhancedStepIcon(props) {
  const { active, completed, className, icon } = props;

  const icons = {
    1: <BusinessIcon fontSize="small" />,
    2: <SubscriptionsIcon fontSize="small" />,
    3: <PaymentIcon fontSize="small" />,
    4: <SettingsIcon fontSize="small" />,
    5: <DoneAllIcon fontSize="small" />,
  };

  return (
    <EnhancedStepIconRoot ownerState={{ completed, active }} className={className}>
      {completed ? <CheckCircleIcon /> : icons[icon]}
    </EnhancedStepIconRoot>
  );
}

// Get current step based on pathname
const getCurrentStep = (pathname) => {
  if (pathname.includes('/business-info')) return 'business-info';
  if (pathname.includes('/subscription')) return 'subscription';
  if (pathname.includes('/payment')) return 'payment';
  if (pathname.includes('/setup')) return 'setup';
  if (pathname.includes('/complete')) return 'complete';
  return 'business-info'; // Default to first step
};

export default function OnboardingLayout({ children }) {
  const router = useRouter();
  const { status, data: session } = useSession();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentStep, setCurrentStep] = useState('');

  useEffect(() => {
    // Set current step based on pathname
    setCurrentStep(getCurrentStep(pathname));
  }, [pathname]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (status === 'unauthenticated') {
          logger.debug('User not authenticated, redirecting to sign in');
          router.push('/auth/signin');
          return;
        }

        if (status === 'authenticated') {
          const onboardingStatus = session.user['custom:onboarding'];
          
          // If onboarding is complete, redirect to dashboard
          if (onboardingStatus === 'complete') {
            logger.debug('Onboarding complete, redirecting to dashboard');
            router.push(appendLanguageParam('/dashboard'));
            return;
          }

          logger.debug('Onboarding status:', {
            status: onboardingStatus,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        logger.error('Error in onboarding layout:', error);
      }
    };

    checkAuth();
  }, [status, session, router]);

  // Format onboarding steps for stepper
  const steps = Object.entries(ONBOARDING_STEPS)
    .filter(([key]) => key !== 'complete')
    .map(([key, config]) => ({
      key,
      label: config.title,
      description: config.description,
      step: config.step
    }))
    .sort((a, b) => a.step - b.step);

  // Find active step index
  const activeStep = steps.findIndex(step => step.key === currentStep);
  
  if (status === 'loading') {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ToastProvider>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Header with logo */}
        <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: '1px solid #e0e0e0', backgroundColor: 'white' }}>
          <Toolbar>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
              <Image
                src="/static/images/Pyfactor.png"
                alt="Dott Logo"
                width={120}
                height={40}
                priority
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Setting up your account
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Step progress indicator */}
        <Paper
          elevation={2}
          sx={{
            borderBottom: '1px solid #e0e0e0',
            py: 4,
            px: { xs: 2, sm: 4 },
            backgroundColor: '#f8f9fa',
            position: 'relative',
            zIndex: 1,
            mb: 2
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ width: '100%' }}>
              <Typography 
                variant="h6" 
                align="center" 
                gutterBottom 
                sx={{ 
                  mb: 3, 
                  color: 'text.primary',
                  fontWeight: 500,
                  display: { xs: 'block', sm: 'none' }
                }}
              >
                Onboarding Progress
              </Typography>
              
              <Stepper 
                activeStep={activeStep} 
                alternativeLabel={!isMobile}
                orientation={isMobile ? 'vertical' : 'horizontal'}
                connector={<EnhancedConnector />}
                sx={{ 
                  '& .MuiStepLabel-label': {
                    mt: 1,
                    fontSize: '1rem'
                  }
                }}
              >
                {steps.map((step, index) => (
                  <Step key={step.key} completed={index < activeStep}>
                    <StepLabel 
                      StepIconComponent={EnhancedStepIcon}
                      optional={
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            display: { xs: 'block', sm: 'none' },
                            fontSize: '0.75rem',
                            mt: 0.5 
                          }}
                        >
                          {step.description}
                        </Typography>
                      }
                    >
                      <Typography 
                        variant="subtitle1" 
                        fontWeight={index === activeStep ? 600 : 400}
                        color={index === activeStep ? 'primary.main' : 'text.primary'}
                        sx={{ 
                          transition: 'all 0.3s ease',
                          transform: index === activeStep ? 'scale(1.05)' : 'scale(1)',
                          textShadow: index === activeStep ? '0 0 1px rgba(0,0,0,0.1)' : 'none',
                        }}
                      >
                        {step.label}
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
              
              {/* Progress visualization line - only visible on desktop */}
              {!isMobile && (
                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    mt: 3, 
                    px: 8,
                    mx: 'auto',
                    maxWidth: '90%'
                  }}
                >
                  {steps.map((step, index) => (
                    <Box 
                      key={`line-${step.key}`}
                      sx={{ 
                        textAlign: 'center',
                        position: 'relative',
                        width: '100%',
                        '&:not(:last-child)::after': {
                          content: '""',
                          position: 'absolute',
                          top: '50%',
                          left: '60%',
                          right: '-60%',
                          height: '2px',
                          borderTop: index < activeStep ? '2px dashed #4caf50' : '2px dashed #e0e0e0'
                        }
                      }}
                    >
                      {/* Empty box for spacing/structure */}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Container>
        </Paper>

        {/* Page content */}
        <Box sx={{ flexGrow: 1, py: 4, backgroundColor: '#f5f7fa' }}>
          <Container 
            maxWidth="lg"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minHeight: '100%'
            }}
          >
            {/* Current step description */}
            <Box sx={{ mb: 4, textAlign: 'center', maxWidth: 'md', mx: 'auto' }}>
              <Typography variant="h4" component="h1" gutterBottom>
                {steps[activeStep]?.label || 'Getting Started'}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {steps[activeStep]?.description || 'Complete the following steps to set up your account'}
              </Typography>
            </Box>
            
            {/* Main content */}
            {children}
          </Container>
        </Box>

        {/* Footer */}
        <Box 
          component="footer" 
          sx={{ 
            py: 3, 
            px: 2, 
            mt: 'auto', 
            backgroundColor: 'white',
            borderTop: '1px solid #e0e0e0',
            textAlign: 'center'
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Dott. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </ToastProvider>
  );
}
