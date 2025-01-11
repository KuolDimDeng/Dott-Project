// src/app/onboarding/layout.js
'use client';

import React from 'react';
import { OnboardingProvider } from '@/app/onboarding/contexts/OnboardingContext';
import PropTypes from 'prop-types';
import { logger } from '@/utils/logger';

function OnboardingLayout({ children }) {
  logger.debug('Initializing OnboardingLayout');

  return (
    <OnboardingProvider>
      <main className="min-h-screen bg-gray-50">
        {children}
      </main>
    </OnboardingProvider>
  );
}

OnboardingLayout.propTypes = {
  children: PropTypes.node.isRequired
};

export default OnboardingLayout;