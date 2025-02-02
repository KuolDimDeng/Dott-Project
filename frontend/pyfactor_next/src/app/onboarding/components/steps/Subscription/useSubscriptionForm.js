import { useEffect, useCallback, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { logger } from '@/utils/logger';
import { persistenceService, STORAGE_KEYS } from '@/services/persistenceService';
import { generateRequestId } from '@/lib/authUtils';
import useOnboardingStore from '@/app/onboarding/store/onboardingStore';

const validationSchema = z.object({
    selected_plan: z.enum(['free', 'professional'], {
        required_error: 'Please select a plan',
        invalid_type_error: 'Invalid plan selected',
    }),
    billing_cycle: z.enum(['monthly', 'annual'], {
        required_error: 'Please select a billing cycle',
        invalid_type_error: 'Invalid billing cycle selected',
    }),
}).refine(data => {
    if (data.selected_plan === 'professional' && !data.billing_cycle) {
        return false;
    }
    return true;
}, {
    message: 'Billing cycle is required for professional plan',
    path: ['billing_cycle'],
});

const defaultValues = {
    selected_plan: '',
    billing_cycle: 'monthly',
    price: 0,
};

export const useSubscriptionForm = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const requestId = useRef(generateRequestId());
    const { selected_plan, current_step } = useOnboardingStore();

    const methods = useForm({
        resolver: zodResolver(validationSchema),
        defaultValues,
        mode: 'onChange',
        shouldUnregister: false,
        criteriaMode: 'all'
    });

    // Load any saved draft data when the form initializes
    useEffect(() => {
        const loadDraft = async () => {
            try {
                const draft = await persistenceService.getData(STORAGE_KEYS.SUBSCRIPTION_DATA);
                if (draft?.selected_plan) {
                    methods.reset(draft);
                }
            } catch (error) {
                logger.error('Failed to load draft:', {
                    error: error.message,
                    requestId: requestId.current
                });
            }
        };
        loadDraft();
    }, [methods]);

    const handleChange = useCallback(async (name, value) => {
        try {
            methods.setValue(name, value, { shouldValidate: true });
            const draftData = {
                ...methods.getValues(),
                timestamp: new Date().toISOString()
            };
            await persistenceService.saveData(STORAGE_KEYS.SUBSCRIPTION_DATA, draftData);
            
            logger.debug('Field updated:', {
                name,
                value,
                draftData,
                requestId: requestId.current
            });
        } catch (error) {
            logger.error('Failed to update field:', {
                error: error.message,
                name,
                requestId: requestId.current
            });
        }
    }, [methods]);

    return {
        methods,
        handleChange,
        isLoading,
        isSubmitting,
        setIsSubmitting,
        requestId: requestId.current
    };
};
