////Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/step4/setup/page.js
'use client';

import React from 'react';
import Step4 from '@/app/onboarding/components/Step4/Step4';
import { STEP_METADATA, STEP_NAMES } from '@/app/onboarding/components/registry';

export default function Step4Page() {
  // Get metadata from registry 
  const metadata = STEP_METADATA[STEP_NAMES.STEP4];

  return <Step4 metadata={metadata} />;
}