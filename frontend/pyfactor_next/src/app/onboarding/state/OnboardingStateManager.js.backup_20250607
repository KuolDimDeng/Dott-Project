// src/app/onboarding/state/OnboardingStateManager.js
import { logger } from '@/utils/logger';
import { generateRequestId } from '@/lib/authUtils';
import { FormStateManager, FORM_EVENTS } from './FormStateManager';

// Constants for onboarding events and states
export const ONBOARDING_EVENTS = {
  STEP_CHANGE: 'step_change',
  STEP_COMPLETE: 'step_complete',
  STEP_VALIDATION: 'step_validation',
  PROGRESS_UPDATE: 'progress_update',
  DATA_SAVE: 'data_save',
  DATA_LOAD: 'data_load',
  INITIALIZATION: 'initialization',
  ERROR: 'error',
};

export const STEP_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ERROR: 'error',
  SKIPPED: 'skipped',
};

// Onboarding states used consistently across the application - lowercase values
export const ONBOARDING_STATES = {
  NOT_STARTED: 'not_started',
  BUSINESS_INFO: 'business_info',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  SETUP: 'setup',        // When setup is in progress
  COMPLETE: 'complete'   // When onboarding is fully complete
};

export class OnboardingStateManager extends FormStateManager {
  constructor(formId) {
    super(formId);

    // Initialize onboarding-specific state
    this.state = {
      ...this.state,
      onboarding: {
        current_step: ONBOARDING_STATES.NOT_STARTED,
        pathname: '',
        selected_plan: null,
        onboarding: ONBOARDING_STATES.NOT_STARTED,
        steps: new Map(),
        stepData: new Map(),
        progress: {
          completedSteps: new Set(),
          lastActiveStep: '',
          stepValidation: new Map(),
          overallProgress: 0,
        },
      },
    };

    // Track step-specific metrics
    this.stepMetrics = new Map();

    logger.debug('OnboardingStateManager initialized', {
      formId,
      timestamp: Date.now(),
    });
  }

  // Validate state transitions
  validateStateTransition(currentState, newState) {
    const validTransitions = {
      [ONBOARDING_STATES.NOT_STARTED]: [ONBOARDING_STATES.BUSINESS_INFO],
      [ONBOARDING_STATES.BUSINESS_INFO]: [ONBOARDING_STATES.SUBSCRIPTION],
      [ONBOARDING_STATES.SUBSCRIPTION]: [
        ONBOARDING_STATES.PAYMENT,
        ONBOARDING_STATES.SETUP,
        ONBOARDING_STATES.COMPLETE
      ],
      [ONBOARDING_STATES.PAYMENT]: [ONBOARDING_STATES.SETUP, ONBOARDING_STATES.COMPLETE],
      [ONBOARDING_STATES.SETUP]: [ONBOARDING_STATES.COMPLETE],
      [ONBOARDING_STATES.COMPLETE]: [],
    };

    if (!validTransitions[currentState]?.includes(newState)) {
      throw new Error(
        `Invalid state transition from ${currentState} to ${newState}`
      );
    }

    return true;
  }

  // Consolidated setcurrent_step method with state validation
  async setcurrent_step(step, options = {}) {
    const operationId = generateRequestId();
    const currentTier = this.state.tier?.selected;

    try {
      // First update Cognito attributes to match new step
      await this.updateOnboardingState({ onboarding: step });

      // Validate state transition
      const currentState = this.state.onboarding.current_step;
      this.validateStateTransition(currentState, step);

      // Get tier-specific step configuration
      const stepConfig =
        currentTier &&
        this.state.onboarding.stepsByTier?.get(currentTier)?.get(step);

      if (!stepConfig && currentTier) {
        logger.warn('Step not configured for tier:', {
          step,
          tier: currentTier,
          operationId,
        });
      }

      // Update step state with tier context
      this.setState(
        {
          onboarding: {
            ...this.state.onboarding,
            current_step: step,
            steps: new Map(this.state.onboarding.steps).set(step, {
              status: options.status || STEP_STATUS.IN_PROGRESS,
              timestamp: Date.now(),
              visitCount:
                (this.state.onboarding.steps.get(step)?.visitCount || 0) + 1,
              tier: currentTier,
            }),
          },
        },
        'step_change'
      );

      // Track tier-specific metrics
      this.updateStepMetrics(step, {
        transitionFrom: currentState,
        transitionTime: Date.now(),
        tier: currentTier,
      });

      this.notifySubscribers({
        type: ONBOARDING_EVENTS.STEP_CHANGE,
        operationId,
        previousStep: currentState,
        current_step: step,
        options,
      });

      return {
        success: true,
        operationId,
        step,
        tier: currentTier,
      };
    } catch (error) {
      logger.error('Step change failed:', {
        formId: this.formId,
        operationId,
        step,
        tier: currentTier,
        error: error.message,
      });
      throw error;
    }
  }

  async completeStep(step, data = {}) {
    const operationId = generateRequestId();
    const currentTier = this.state.tier?.selected;

    try {
      // Validate step completion against tier requirements
      if (
        (currentTier === 'professional' || currentTier === 'enterprise') &&
        step === ONBOARDING_STATES.PAYMENT &&
        !data.paymentMethod
      ) {
        throw new Error(`Payment required for ${currentTier} tier`);
      }

      // Update step completion state
      const newCompletedSteps = new Set(
        this.state.onboarding.progress.completedSteps
      );
      newCompletedSteps.add(step);

      const newSteps = new Map(this.state.onboarding.steps);
      newSteps.set(step, {
        ...newSteps.get(step),
        status: STEP_STATUS.COMPLETED,
        completedAt: Date.now(),
      });

      // Save step data
      const newStepData = new Map(this.state.onboarding.stepData);
      newStepData.set(step, {
        data,
        timestamp: Date.now(),
        validationStatus: 'complete',
      });

      this.setState(
        {
          onboarding: {
            ...this.state.onboarding,
            steps: newSteps,
            stepData: newStepData,
            progress: {
              ...this.state.onboarding.progress,
              completedSteps: newCompletedSteps,
            },
          },
        },
        'step_complete'
      );

      // Update overall progress
      this.updateProgress();

      this.notifySubscribers({
        type: ONBOARDING_EVENTS.STEP_COMPLETE,
        operationId,
        step,
        data,
      });

      return {
        success: true,
        operationId,
        step,
        progress: this.getProgress(),
      };
    } catch (error) {
      logger.error('Step completion failed:', {
        formId: this.formId,
        operationId,
        step,
        tier: currentTier,
        error: error.message,
      });
      throw error;
    }
  }

  // Progress Management
  updateProgress() {
    const totalSteps = this.state.onboarding.steps.size;
    const completedSteps = this.state.onboarding.progress.completedSteps.size;
    const overallProgress = totalSteps
      ? (completedSteps / totalSteps) * 100
      : 0;

    this.setState(
      {
        onboarding: {
          ...this.state.onboarding,
          progress: {
            ...this.state.onboarding.progress,
            overallProgress,
          },
        },
      },
      'progress_update'
    );

    return overallProgress;
  }

  getProgress() {
    return {
      current_step: this.state.onboarding.current_step,
      completedSteps: Array.from(this.state.onboarding.progress.completedSteps),
      lastActiveStep: this.state.onboarding.progress.lastActiveStep,
      stepValidation: Object.fromEntries(
        this.state.onboarding.progress.stepValidation
      ),
      overallProgress: this.state.onboarding.progress.overallProgress,
    };
  }

  // Step Data Management
  async saveStepData(step, data, options = {}) {
    const operationId = generateRequestId();

    try {
      // Validate data if validation function provided
      if (options.validate) {
        const validationResult = await options.validate(data);
        if (!validationResult.isValid) {
          throw new Error(validationResult.error || 'Validation failed');
        }
      }

      // Save step data
      this.state.onboarding.stepData.set(step, {
        data,
        timestamp: Date.now(),
        validationStatus: 'valid',
      });

      this.notifySubscribers({
        type: ONBOARDING_EVENTS.DATA_SAVE,
        operationId,
        step,
        dataSize: JSON.stringify(data).length,
      });

      return {
        success: true,
        operationId,
        step,
      };
    } catch (error) {
      logger.error('Step data save failed:', {
        formId: this.formId,
        operationId,
        step,
        error: error.message,
      });

      throw error;
    }
  }

  getStepData(step) {
    return this.state.onboarding.stepData.get(step)?.data || null;
  }

  // Step Validation
  async validateStep(step, data, validator) {
    const operationId = generateRequestId();

    try {
      const validationResult = await validator(data);

      this.state.onboarding.progress.stepValidation.set(step, {
        isValid: validationResult.isValid,
        timestamp: Date.now(),
        errors: validationResult.errors || null,
      });

      this.notifySubscribers({
        type: ONBOARDING_EVENTS.STEP_VALIDATION,
        operationId,
        step,
        result: validationResult,
      });

      return validationResult;
    } catch (error) {
      logger.error('Step validation failed:', {
        formId: this.formId,
        operationId,
        step,
        error: error.message,
      });

      throw error;
    }
  }

  // Metrics and Analytics
  updateStepMetrics(step, data) {
    if (!this.stepMetrics.has(step)) {
      this.stepMetrics.set(step, {
        visits: 0,
        totalTime: 0,
        errors: 0,
        transitions: [],
      });
    }

    const metrics = this.stepMetrics.get(step);
    metrics.visits++;

    if (data.transitionFrom) {
      metrics.transitions.push({
        from: data.transitionFrom,
        timestamp: data.transitionTime,
        duration:
          data.transitionTime -
          (this.stepMetrics.get(data.transitionFrom)?.lastVisit ||
            data.transitionTime),
      });
    }

    metrics.lastVisit = Date.now();
    this.stepMetrics.set(step, metrics);
  }

  getStepMetrics(step) {
    return this.stepMetrics.get(step) || null;
  }

  // Enhanced State Management
  getState() {
    return {
      ...super.getState(),
      onboarding: {
        ...this.state.onboarding,
        steps: Object.fromEntries(this.state.onboarding.steps),
        stepData: Object.fromEntries(this.state.onboarding.stepData),
        progress: {
          ...this.state.onboarding.progress,
          completedSteps: Array.from(
            this.state.onboarding.progress.completedSteps
          ),
          stepValidation: Object.fromEntries(
            this.state.onboarding.progress.stepValidation
          ),
        },
      },
    };
  }

  async updateOnboardingState(updates) {
    const operationId = generateRequestId();
          const { updateUserAttributes } = await import('@/config/amplifyUnified');

    try {
      const previousState = { ...this.state.onboarding };

      // Validate state transition if onboarding status is being updated
      if (
        updates.onboarding &&
        updates.onboarding !== previousState.onboarding
      ) {
        this.validateStateTransition(
          previousState.onboarding,
          updates.onboarding
        );
      }

      this.setState(
        {
          onboarding: {
            ...this.state.onboarding,
            ...updates,
            lastUpdated: Date.now(),
          },
        },
        'onboarding_update'
      );

      // Update Cognito attributes with standardized state - ensure lowercase
      const cognitoAttributes = {
        'custom:onboarding': (this.state.onboarding.onboarding || ONBOARDING_STATES.NOT_STARTED).toLowerCase(),
        'custom:subplan': this.state.onboarding.selected_plan || 'free',
        'custom:acctstatus': 'pending',
        'custom:updated_at': new Date().toISOString()
      };

      if (updates.onboarding === ONBOARDING_STATES.COMPLETE) {
        cognitoAttributes['custom:setupdone'] = 'true';
        cognitoAttributes['custom:acctstatus'] = 'active';
        
        // For free plan, ensure all proper attributes are set
        if (this.state.onboarding.selected_plan === 'free') {
          cognitoAttributes['custom:subscriptioninterval'] = 'monthly';
          cognitoAttributes['custom:payverified'] = 'false';
          
          // For timestamp consistency
          const timestamp = new Date().toISOString();
          cognitoAttributes['custom:updated_at'] = timestamp;
          cognitoAttributes['custom:setupcompletedtime'] = timestamp;
          cognitoAttributes['custom:onboardingCompletedAt'] = timestamp;
          
          // For cases where tenant ID might be set elsewhere 
          const tenantId = this.state.onboarding.tenant_id || 
            (typeof window !== 'undefined' && window.__APP_CACHE?.auth?.tenantId) || 
            (typeof window !== 'undefined' && window.__APP_CACHE?.tenantId);
          if (tenantId) {
            cognitoAttributes['custom:tenant_ID'] = tenantId;
            cognitoAttributes['custom:businessid'] = tenantId;
          }
        }
      }

      logger.debug('Updating Cognito attributes:', {
        onboardingState: this.state.onboarding.onboarding,
        plan: this.state.onboarding.selected_plan,
        operationId
      });

      await updateUserAttributes({
        userAttributes: cognitoAttributes
      });

      this.notifySubscribers({
        type: ONBOARDING_EVENTS.STATE_UPDATE,
        operationId,
        previousState,
        currentState: this.state.onboarding,
        updates,
      });

      logger.debug('Onboarding state updated:', {
        operationId,
        updates,
        onboarding: this.state.onboarding.onboarding,
        selected_plan: this.state.onboarding.selected_plan,
        pathname: this.state.onboarding.pathname,
      });
    } catch (error) {
      logger.error('Failed to update onboarding state:', {
        operationId,
        error: error.message,
        updates,
      });
      throw error;
    }
  }

  async setselected_plan(plan) {
    const operationId = generateRequestId();

    try {
      // For free plans, set onboarding state to COMPLETE
      // For paid plans, stay in SUBSCRIPTION state
      const onboardingState = (plan === 'free' || plan === 'basic') 
        ? ONBOARDING_STATES.COMPLETE 
        : ONBOARDING_STATES.SUBSCRIPTION;
      
      await this.updateOnboardingState({
        selected_plan: plan,
        onboarding: onboardingState
      });
      
      logger.info('[OnboardingStateManager] Plan selected:', {
        plan,
        onboardingState,
        operationId
      });

      return {
        success: true,
        selected_plan: plan,
        operationId,
      };
    } catch (error) {
      logger.error('Failed to set selected plan:', {
        operationId,
        error: error.message,
        plan,
      });
      throw error;
    }
  }

  async setPathname(pathname) {
    return this.updateOnboardingState({ pathname });
  }

  async setonboarding(status) {
    return this.updateOnboardingState({ onboarding: status });
  }

  // Extended Cleanup
  cleanup() {
    super.cleanup();
    this.stepMetrics.clear();
    this.state.onboarding.steps.clear();
    this.state.onboarding.stepData.clear();
    this.state.onboarding.progress.completedSteps.clear();
    this.state.onboarding.progress.stepValidation.clear();
  }
}
