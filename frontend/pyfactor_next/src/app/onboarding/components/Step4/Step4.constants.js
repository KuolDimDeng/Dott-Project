// /src/app/onboarding/components/Step4/Step4.constants.js
export const PROGRESS_STEPS = [
  { progress: 0, step: 'Initializing', description: 'Setting up your workspace' },
  { progress: 25, step: 'Creating Database', description: 'Creating your secure database' },
  { progress: 50, step: 'Configuring Settings', description: 'Configuring your account settings' },
  { progress: 75, step: 'Loading Templates', description: 'Loading your document templates' },
  { progress: 100, step: 'Completing Setup', description: 'Finalizing your setup' },
];

export const SLIDESHOW_IMAGES = [
  '/static/images/Work-Life-Balance-1--Streamline-Brooklyn.png',
  '/static/images/Payment-With-Card-2--Streamline-Brooklyn.png',
  '/static/images/Business-Growth--Streamline-Brooklyn.png',
];

export const WS_CONFIG = {
  CONNECTION_TIMEOUT: 5000,
  POLL_INTERVAL: 2000,
  MAX_POLL_INTERVAL: 10000,
  MAX_POLL_RETRIES: 5,
  SLIDESHOW_INTERVAL: 3000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};
