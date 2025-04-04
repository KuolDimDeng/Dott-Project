// src/app/onboarding/store/sharedStore.js

export const LoadingStep = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

export const ONBOARDING_STEPS = {
  INITIAL: 'step1',
  PLAN: 'step2',
  PAYMENT: 'step3',
  SETUP: 'step4',
  COMPLETE: 'complete',
};
