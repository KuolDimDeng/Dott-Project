// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/setup/page.js
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Setup } from '../components/steps';
import { OnboardingLayout } from '../components/layout';
import { STEP_METADATA } from '../components/registry';
import { persistenceService } from '@/services/persistenceService';
import { logger } from '@/utils/logger';

const SetupPage = () => {
  const [metadata, setMetadata] = useState(STEP_METADATA.SETUP);
  const searchParams = useSearchParams();
  
  // Load tier and update metadata accordingly
  useEffect(() => {
    const loadTierMetadata = async () => {
      try {
        // Try to get tier from URL first, then persistence service
        const urlTier = searchParams.get('tier');
        const savedTier = await persistenceService.getCurrentTier();
        const tier = urlTier || savedTier || 'free';

        // Update metadata based on tier
        setMetadata({
          ...STEP_METADATA.SETUP,
          title: tier === 'professional' 
            ? 'Professional Setup' 
            : 'Basic Setup',
          description: tier === 'professional'
            ? 'Setting up your professional workspace with advanced features'
            : 'Setting up your basic workspace',
          setupSteps: tier === 'professional'
            ? STEP_METADATA.SETUP.professionalSteps
            : STEP_METADATA.SETUP.basicSteps
        });

        logger.debug('Setup page initialized', {
          tier,
          fromUrl: !!urlTier,
          fromStorage: !!savedTier
        });

      } catch (error) {
        logger.error('Failed to load tier metadata:', error);
        // Fallback to basic setup if there's an error
        setMetadata(STEP_METADATA.SETUP);
      }
    };

    loadTierMetadata();
  }, [searchParams]);

  return (
    <OnboardingLayout>
      <Setup metadata={metadata} />
    </OnboardingLayout>
  );
};

export default SetupPage;