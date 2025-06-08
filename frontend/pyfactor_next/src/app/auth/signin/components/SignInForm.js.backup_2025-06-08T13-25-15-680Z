import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import jwtDecode from 'jwt-decode';
import { fetchAuthSession } from '../../services/auth';
import { getTenantId } from '../../utils/tenantUtils';
import { logger } from '../../utils/logger';

const SignInForm = () => {
  const router = useRouter();
  const [onboardingStatus, setOnboardingStatus] = useState('incomplete');
  const [setupDone, setSetupDone] = useState(false);

  useEffect(() => {
    if (onboardingStatus === 'complete' && setupDone) {
      logger.info('[SignInForm] Onboarding complete, redirecting to dashboard');
      
      // Get tenant ID from token or storage
      getTenantIdForRedirect().then((tenantId) => {
        if (tenantId) {
          router.push(`/${tenantId}/dashboard`);
        } else {
          // Fallback to regular dashboard path and let middleware handle it
          router.push('/dashboard');
        }
      });
    }
 