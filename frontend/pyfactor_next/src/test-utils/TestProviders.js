import React from 'react';
import { UserProfileProvider } from '@/contexts/UserProfileContext';
import { NotificationProvider } from '@/context/NotificationContext';

/**
 * Wrapper component for tests that need context providers
 * Usage: <TestProviders>{componentUnderTest}</TestProviders>
 */
export function TestProviders({ children }) {
  return (
    <NotificationProvider>
      <UserProfileProvider>
        {children}
      </UserProfileProvider>
    </NotificationProvider>
  );
}

/**
 * Higher-order component version of TestProviders
 * Usage: const WrappedComponent = withTestProviders(ComponentUnderTest);
 */
export function withTestProviders(Component) {
  return function WrappedComponent(props) {
    return (
      <TestProviders>
        <Component {...props} />
      </TestProviders>
    );
  };
}

export default TestProviders; 