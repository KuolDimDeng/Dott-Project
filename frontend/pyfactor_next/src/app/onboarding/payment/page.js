// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/payment/page.js
'use client';

import { Payment } from '../components/steps';
import { OnboardingLayout } from '../components/layout';
import { STEP_METADATA } from '../components/registry';

const PaymentPage = () => {
  return (
    <OnboardingLayout>
      <Payment metadata={STEP_METADATA.PAYMENT} />
    </OnboardingLayout>
  );
};

export default PaymentPage;