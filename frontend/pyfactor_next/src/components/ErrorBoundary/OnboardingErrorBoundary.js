// app/components/ErrorBoundary/OnboardingErrorBoundary.js
import React from 'react';
import { ErrorStep } from '@/components/ErrorStep/ErrorStep';
import { persistenceService } from '@/services/persistenceService';
import { logger } from '@/utils/logger';

export class OnboardingErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      recoveryAttempts: 0,
      isRetrying: false, // Match ErrorStep's prop name
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorType: error.name || 'UnknownError',
    };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('Onboarding error:', {
      error,
      errorInfo,
      component: this.props.componentName,
      step: this.props.stepNumber, // Match ErrorStep's prop name
    });

    // Save error state
    persistenceService.saveData('onboarding_error', {
      timestamp: Date.now(),
      error: error.message,
      componentName: this.props.componentName,
      stepNumber: this.props.stepNumber,
      type: error.name,
      recoveryAttempts: this.state.recoveryAttempts,
    });
  }

  handleRetry = async () => {
    try {
      this.setState((prev) => ({
        recoveryAttempts: prev.recoveryAttempts + 1,
        isRetrying: true, // Match ErrorStep's prop name
      }));

      // Clear error state
      await persistenceService.clearData('onboarding_error');

      // Attempt to recover last good state
      const savedData = await persistenceService.loadData('onboarding_data');
      if (savedData) {
        await persistenceService.saveData('onboarding_backup', savedData);
      }

      // Add delay to prevent rapid retries
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Reset error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false,
      });

      // Call custom retry handler if provided
      await this.props.onRetry?.();

      logger.info('Error recovery successful', {
        component: this.props.componentName,
        attempts: this.state.recoveryAttempts,
      });
    } catch (error) {
      logger.error('Error recovery failed:', {
        error,
        component: this.props.componentName,
        attempts: this.state.recoveryAttempts,
      });

      this.setState({ isRetrying: false });

      // If max attempts reached, force refresh
      if (this.state.recoveryAttempts >= 3) {
        window.location.reload();
      }
    }
  };

  render() {
    if (this.state.hasError) {
      // If no fallback provided, use ErrorStep
      if (!this.props.fallback) {
        return (
          <ErrorStep
            error={this.state.error}
            stepNumber={this.props.stepNumber}
            onRetry={this.handleRetry}
            isRetrying={this.state.isRetrying}
            message={
              this.state.recoveryAttempts >= 3
                ? 'Maximum retry attempts reached. Please refresh the page.'
                : this.props.errorMessage || `Error in Step ${this.props.stepNumber}`
            }
          />
        );
      }

      // Use provided fallback if available
      return this.props.fallback({
        error: this.state.error,
        resetError: this.handleRetry,
        attempts: this.state.recoveryAttempts,
        isRetrying: this.state.isRetrying,
      });
    }

    return this.props.children;
  }
}

// Add PropTypes
if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');

  OnboardingErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
    fallback: PropTypes.func,
    componentName: PropTypes.string,
    stepNumber: PropTypes.number.isRequired, // Match ErrorStep's prop requirement
    onRetry: PropTypes.func,
    errorMessage: PropTypes.string,
  };
}

// HOC for easy wrapping
export const withOnboardingErrorBoundary = (WrappedComponent, options = {}) => {
  return function WithErrorBoundary(props) {
    return (
      <OnboardingErrorBoundary
        componentName={options.componentName}
        stepNumber={options.stepNumber}
        errorMessage={options.errorMessage}
        fallback={options.fallback}
        onRetry={options.onRetry}
      >
        <WrappedComponent {...props} />
      </OnboardingErrorBoundary>
    );
  };
};

// Usage example
export const createOnboardingStep = (Component, stepNumber) => {
  return withOnboardingErrorBoundary(Component, {
    componentName: Component.displayName || Component.name,
    stepNumber,
    errorMessage: `We encountered an error in step ${stepNumber}. Please try again.`,
  });
};
