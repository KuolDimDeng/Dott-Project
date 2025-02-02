// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/config/steps.js
import { z } from 'zod';
import { logger } from '@/utils/logger';


// Define validation schemas for each step
const businessInfoSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  industry: z.string().min(1, 'Industry is required'),
  country: z.string().min(1, 'Country is required'),
  legalStructure: z.string().min(1, 'Legal structure is required'),
  dateFounded: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional().nullable(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required')
});

const subscriptionSchema = z.object({
  selected_plan: z.enum(['free', 'professional'], {
    required_error: 'Please select a plan'
  }),
  billingCycle: z.enum(['monthly', 'annual']).optional()
});

const paymentSchema = z.object({
  paymentMethod: z.string().min(1, 'Payment method is required'),
  paymentCompleted: z.boolean(),
  paymentReference: z.string().optional()
});

const setupSchema = z.object({
  databaseProvisioned: z.boolean().optional(),
  setupCompleted: z.boolean().optional(),
  technicalSetup: z.boolean().optional()
});

export const ONBOARDING_STEPS = {
  'business-info': {
    title: 'Business Information',
    description: 'Tell us about your business to get started',
    step: 1,
    next: 'subscription',
    previous: null,
    isPublic: true,
    schema: businessInfoSchema,
    validate: async (data) => {
      try {
        await businessInfoSchema.parseAsync(data);
        return { isValid: true };
      } catch (error) {
        return { 
          isValid: false, 
          errors: error.errors 
        };
      }
    }
  },
  
  'subscription': {
    title: 'Choose Your Plan',
    description: 'Select the plan that best fits your needs',
    step: 2,
    next: (data) => data?.selected_plan === 'free' ? 'setup' : 'payment',
    previous: 'business-info',
    isPublic: false,
    schema: subscriptionSchema,
    validate: async (data) => {
      try {
        await subscriptionSchema.parseAsync(data);
        return { isValid: true };
      } catch (error) {
        return { 
          isValid: false, 
          errors: error.errors 
        };
      }
    },
    canAccess: (session) => {
      return session?.user?.onboarding_status === 'business-info' ||
             session?.user?.onboarding_status === 'subscription';
    }
  },
  
  'payment': {
    title: 'Payment Information',
    description: 'Complete your payment to continue',
    step: 3,
    next: 'setup',
    previous: 'subscription',
    isPublic: false,
    schema: paymentSchema,
    validate: async (data) => {
      try {
        await paymentSchema.parseAsync(data);
        return { isValid: true };
      } catch (error) {
        return { 
          isValid: false, 
          errors: error.errors 
        };
      }
    },
    canAccess: (session) => {
      return session?.user?.selected_plan === 'professional' &&
             session?.user?.onboarding_status === 'payment';
    }
  },
  
  'setup': {
    title: 'Account Setup',
    description: 'Setting up your account',
    step: 4,
    next: 'complete',
    previous: (session) => session?.user?.selected_plan === 'free' ? 'subscription' : 'payment',
    isPublic: false,
    schema: setupSchema,
    validate: async (data) => {
      try {
        await setupSchema.parseAsync(data);
        return { isValid: true };
      } catch (error) {
        return { 
          isValid: false, 
          errors: error.errors 
        };
      }
    },
    canAccess: (session) => {
      // Allow setup access for free plan right after subscription
      if (session?.user?.selected_plan === 'free') {
        return session?.user?.onboarding_status === 'subscription' || 
               session?.user?.onboarding_status === 'setup';
      }
      
      // For professional plan, require payment completion
      if (session?.user?.selected_plan === 'professional') {
        return session?.user?.paymentCompleted && 
               (session?.user?.onboarding_status === 'payment' || 
                session?.user?.onboarding_status === 'setup');
      }
      
      return false;
    }
  },

  'complete': {
    title: 'Setup Complete',
    description: 'Your account is ready',
    step: 5,
    next: null,
    previous: 'setup',
    isPublic: false,
    validate: () => ({ isValid: true }),
    canAccess: (session) => {
      return session?.user?.onboarding_status === 'complete';
    }
  }
};

export const STEPS = {
  BUSINESS_INFO: 'business-info',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  SETUP: 'setup',
  COMPLETE: 'complete'
};

export const STEP_ORDER = [
  STEPS.BUSINESS_INFO,
  STEPS.SUBSCRIPTION,
  STEPS.PAYMENT,
  STEPS.SETUP
];

// Helper functions
export const getStepConfig = (step) => {
  return ONBOARDING_STEPS[step] || null;
};

// Update canAccessStep helper function to be more explicit
export const canAccessStep = (step, context) => {
    const config = getStepConfig(step);
    
    // Handle missing config
    if (!config) {
      logger.error('Invalid step configuration:', { step });
      return false;
    }
    
    // Public steps are always accessible
    if (config.isPublic) {
      return true;
    }
    
    // Must have user session for protected steps
    if (!context?.user) {
      return false;
    }
  
    // Special handling for setup step
    if (step === 'setup') {
      const { selected_plan, onboarding_status, paymentCompleted } = context.user;
      
      // Free plan can access after subscription
      if (selected_plan === 'free') {
        return onboarding_status === 'subscription' || onboarding_status === 'setup';
      }
      
      // Professional plan needs payment completed
      if (selected_plan === 'professional') {
        return paymentCompleted && 
               (onboarding_status === 'payment' || onboarding_status === 'setup');
      }
      
      return false;
    }
    
    // Use step's canAccess function if available
    return config.canAccess ? config.canAccess(context) : true;
  };

  export const getnext_step = (current_step) => {
    const currentIndex = STEP_ORDER.indexOf(current_step);
    return currentIndex < STEP_ORDER.length - 1 ? STEP_ORDER[currentIndex + 1] : null;
  };
  
  export const getPreviousStep = (current_step) => {
    const currentIndex = STEP_ORDER.indexOf(current_step);
    return currentIndex > 0 ? STEP_ORDER[currentIndex - 1] : null;
  };

// Update validateStepData to include plan validation
export const validateStepData = async (step, data) => {
    const config = getStepConfig(step);
    if (!config || !config.validate) {
      return { isValid: false, error: 'Invalid step or missing validation' };
    }
    
    // Special validation for setup step
    if (step === 'setup') {
      // Verify plan selection exists
      if (!data?.selected_plan) {
        return { 
          isValid: false, 
          error: 'No plan selected' 
        };
      }
      
      // Verify correct path based on plan
      if (data.selected_plan === 'professional' && !data.paymentCompleted) {
        return { 
          isValid: false, 
          error: 'Payment required for professional plan' 
        };
      }
    }
    
    return await config.validate(data);
  };