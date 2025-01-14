// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Subscription/useSubscriptionForm.js
import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast/ToastProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { logger } from '@/utils/logger';
import { subscriptionDefaultValues } from './Subscription.types';
import { persistenceService } from '@/services/persistenceService';
import { RoutingManager } from '@/lib/routingManager';

import { 
    validateStep,
    canTransitionToStep, 
    validateTierAccess,
    STEP_VALIDATION,
    STEP_PROGRESSION,
    VALIDATION_DIRECTION 
} from '@/app/onboarding/components/registry';

import { 
    validateUserState, 
    handleAuthError, 
    generateRequestId,
    validateOnboardingStep,
    makeRequest 
} from '@/lib/authUtils';

const validationSchema = z.object({
    selectedPlan: z.enum(['free', 'professional'], {
        required_error: 'Please select a plan',
        invalid_type_error: 'Invalid plan selected',
    }),
    billingCycle: z.enum(['monthly', 'annual'], {
        required_error: 'Please select a billing cycle',
        invalid_type_error: 'Invalid billing cycle selected',
    }),
});

export const useSubscriptionForm = () => {
    const router = useRouter();
    const { data: session } = useSession();
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [requestId] = useState(() => generateRequestId());

    const methods = useForm({
        resolver: zodResolver(validationSchema),
        defaultValues: subscriptionDefaultValues,
        mode: 'onChange',
        reValidateMode: 'onChange'
    });

    const handleChange = useCallback(async (name, value) => {
        try {
            if (!name || value === undefined) {
                logger.warn('Invalid field update attempt:', { name, value, requestId });
                return;
            }

            const userState = await validateUserState(session, requestId);
            if (!userState.isValid) {
                throw new Error(userState.reason);
            }

            methods.setValue(name, value, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true
            });

            await persistenceService.saveData('subscription-draft', {
                ...methods.getValues(),
                timestamp: Date.now()
            });

        } catch (error) {
            const errorResult = handleAuthError(error);
            logger.error('Failed to handle change:', { 
                error: errorResult, 
                field: name,
                requestId 
            });
            toast.error(errorResult.message);
        }
    }, [methods, session, toast, requestId]);

    const handleSubscriptionSelect = useCallback(async (plan) => {
        let toastId;
        
        try {
            if (isSubmitting) return;
            setIsSubmitting(true);
            toastId = toast.loading('Saving your selection...');
    
            logger.debug('handleSubscriptionSelect called:', {
                selectedPlan: plan.type,
                currentFormData: methods.getValues(),
                isSubmitting: isSubmitting
            });
    
            // Update form with selected plan
            methods.setValue('selectedPlan', plan.type);
    
            logger.debug('Form updated with plan:', {
                newFormData: methods.getValues(),
                selectedPlan: methods.getValues().selectedPlan
            });
    
            // Prepare subscription data
            const subscriptionData = {
                selectedPlan: plan.type,
                billingCycle: methods.getValues().billingCycle || 'monthly'
            };
    
            logger.debug('Saving subscription data:', {
                subscriptionData,
                requestUrl: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboarding/subscription/`
            });
    
            // Make API request with detailed logging
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboarding/subscription/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.user?.accessToken}`
                },
                body: JSON.stringify(subscriptionData)
            });
    
            logger.debug('API response received:', {
                status: response.status,
                ok: response.ok
            });
    
            const responseData = await response.json();
            logger.debug('Response data:', responseData);
    
            if (!response.ok) {
                throw new Error(responseData.error || 'Failed to save subscription');
            }
    
            // Log navigation attempt
            logger.debug('Attempting navigation:', {
                nextStep: plan.type === 'free' ? '/onboarding/setup' : '/onboarding/payment',
                selectedPlan: plan.type
            });
    
            // Navigate based on plan type
            if (plan.type === 'free') {
                await router.replace('/onboarding/setup');
            } else {
                await router.replace('/onboarding/payment');
            }
    
        } catch (error) {
            logger.error('Subscription selection failed:', {
                error: error.message,
                plan: plan?.type,
                requestData: subscriptionData
            });
            toast.error(error.message || 'Failed to save subscription');
        } finally {
            if (toastId) toast.dismiss(toastId);
            setIsSubmitting(false);
        }
    }, [methods, session, router, toast]);
    
    const handlePreviousStep = useCallback(async () => {
        try {
            logger.debug('Navigating to previous step:', {
                requestId,
                currentStep: 'subscription',
                targetStep: 'business-info'
            });

            // Save current state
            await persistenceService.saveData('subscription-draft', {
                ...methods.getValues(),
                timestamp: Date.now()
            });

            await router.replace('/onboarding/business-info');

        } catch (error) {
            logger.error('Navigation failed:', {
                requestId,
                error: error.message,
                context: {
                    hasSession: !!session,
                    currentStep: 'subscription'
                }
            });
            
            toast.error('Failed to navigate to previous step');
        }
    }, [methods, router, session, toast, requestId]);

    useEffect(() => {
        const loadDraft = async () => {
            try {
                const draft = await persistenceService.getData('subscription-draft');
                if (draft?.timestamp) {
                    const validationResult = await validateOnboardingStep(
                        session,
                        'subscription',
                        {
                            ...draft,
                            selectedPlan: draft.selectedPlan
                        },
                        requestId
                    );

                    if (validationResult.isValid) {
                        methods.reset(validationResult.data);
                    }
                }
            } catch (error) {
                const errorResult = handleAuthError(error);
                logger.error('Failed to load draft:', { 
                    error: errorResult,
                    requestId 
                });
            }
        };

        loadDraft();
    }, [methods, session, requestId]);

    return {
        methods,
        handleChange,
        handleSubscriptionSelect,
        handlePreviousStep,
        isLoading,
        isSubmitting,
        requestId
    };
};