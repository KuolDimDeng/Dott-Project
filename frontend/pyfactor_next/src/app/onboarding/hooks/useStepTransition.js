///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/hooks/useStepTransition.js
'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, getSession, signIn } from 'next-auth/react';
import { useToast } from '@/components/Toast/ToastProvider';
import { logger } from '@/utils/logger';
import { onboardingApi } from '@/services/api/onboarding';

export const useStepTransition = () => {
    const router = useRouter();
    const { data: session } = useSession();
    const [isTransitioning, setIsTransitioning] = useState(false);
    const toast = useToast();

    const verifySessionUpdate = async (expectedStatus, requestId, maxRetries = 5) => {
        logger.debug('Starting session verification:', {
            requestId,
            expectedStatus,
            currentStatus: session?.user?.onboarding_status
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        for (let i = 0; i < maxRetries; i++) {
            try {
                const currentSession = await getSession({ force: true });
                
                logger.debug('Session verification attempt:', {
                    requestId,
                    attempt: i + 1,
                    expectedStatus,
                    currentStatus: currentSession?.user?.onboarding_status,
                    matched: currentSession?.user?.onboarding_status === expectedStatus
                });

                if (currentSession?.user?.onboarding_status === expectedStatus) {
                    return true;
                }

                await new Promise(resolve => 
                    setTimeout(resolve, Math.min(1000 * Math.pow(2, i), 5000))
                );
            } catch (error) {
                logger.error('Session verification attempt failed:', {
                    requestId,
                    attempt: i + 1,
                    error: error.message
                });
            }
        }

        const finalSession = await getSession({ force: true });
        logger.error('Session verification failed:', {
            requestId,
            expectedStatus,
            finalStatus: finalSession?.user?.onboarding_status
        });

        return false;
    };

    const updateSession = async (newStatus, formData, requestId) => {
        logger.debug('Starting session update:', {
            requestId,
            newStatus,
            currentStatus: session?.user?.onboarding_status,
            hasFormData: !!formData
        });

        try {
            const result = await signIn('credentials', {
                redirect: false,
                onboarding_status: newStatus,
                current_step: newStatus,
                selected_plan: formData?.selected_plan,
                callbackUrl: `/onboarding/${newStatus}`
            });

            if (result?.error) {
                throw new Error(`Session update failed: ${result.error}`);
            }

            const updatedSession = await getSession({ force: true });
            const success = updatedSession?.user?.onboarding_status === newStatus;

            logger.debug('Session update complete:', {
                requestId,
                success,
                newStatus,
                currentStatus: updatedSession?.user?.onboarding_status
            });

            return success;
        } catch (error) {
            logger.error('Session update failed:', {
                requestId,
                error: error.message,
                newStatus
            });
            return false;
        }
    };

    const transition = useCallback(async (fromStep, toStep, formData) => {
        const requestId = crypto.randomUUID();
        const currentStep = fromStep || session?.user?.onboarding_status;
        const selectedPlan = formData?.selected_plan?.type || formData?.selected_plan || null;

        logger.debug('Step transition initiated:', {
            requestId,
            fromStep: currentStep,
            toStep,
            selected_plan,
            hasFormData: !!formData
        });

        if (!currentStep || !toStep) {
            logger.error('Invalid transition parameters:', {
                requestId,
                currentStep,
                toStep
            });
            return false;
        }

        if (isTransitioning) {
            logger.warn('Transition already in progress:', {
                requestId,
                currentStep,
                toStep
            });
            return false;
        }

        let toastId;
        try {
            setIsTransitioning(true);
            toastId = toast.loading('Saving your progress...');

            // Update backend status
            const statusResponse = await onboardingApi.updateStatus({
                current_step: currentStep,
                next_step: toStep,
                selected_plan: selected_plan,
                request_id: requestId,
                form_data: formData
            });

            if (!statusResponse?.success) {
                throw new Error(statusResponse?.error || 'Failed to update status');
            }

            // Update session state
            const sessionUpdated = await updateSession(toStep, formData, requestId);
            if (!sessionUpdated) {
                throw new Error('Failed to update session state');
            }

            // Verify the update
            const verified = await verifySessionUpdate(toStep, requestId);
            if (!verified) {
                throw new Error('Failed to verify session update');
            }

            if (toastId) {
                toast.dismiss(toastId);
                toast.success('Progress saved successfully');
            }

            logger.debug('Navigation starting:', {
                requestId,
                destination: `/onboarding/${toStep}`
            });

            await router.replace(`/onboarding/${toStep}`);
            return true;

        } catch (error) {
            logger.error('Transition failed:', {
                requestId,
                error: error.message,
                currentStep,
                toStep
            });

            if (toastId) {
                toast.dismiss(toastId);
                toast.error(error.message || 'Failed to proceed');
            }
            return false;

        } finally {
            setIsTransitioning(false);
        }
    }, [session, router, toast, isTransitioning]);

    const getStepUrl = useCallback((step) => {
        return `/onboarding/${step}`;
    }, []);

    return {
        transition,
        isTransitioning,
        getStepUrl
    };
};