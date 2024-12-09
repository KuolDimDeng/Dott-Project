// /src/app/onboarding/components/Step4/index.js
export { default } from './Step4';
export { useStep4Form } from './useStep4Form';
export {
  theme,
  ProgressIndicator,
  LoadingState,
  ErrorState,
  SignInPrompt
} from './Step4.styles';
// Import OnboardingErrorBoundary from the correct location
export { OnboardingErrorBoundary } from '@/components/ErrorBoundary/OnboardingErrorBoundary';
export * from './Step4.constants';
export * from './Step4.types';