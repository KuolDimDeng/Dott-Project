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
  ERROR: 'error'
};

export const STEP_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ERROR: 'error',
  SKIPPED: 'skipped'
};

export class OnboardingStateManager extends FormStateManager {
  constructor(formId) {
    super(formId);

    // Extend core state with onboarding-specific state
    this.state = {
      ...this.state,
      onboarding: {
        currentStep: '',
        steps: new Map(),
        progress: {
          completedSteps: new Set(),
          lastActiveStep: '',
          stepValidation: new Map(),
          overallProgress: 0
        },
        tier: {
            current: null,
            history: [],
            validationStatus: null
        },
        stepsByTier: new Map(),
        tierSpecificData: new Map(),
        stepData: new Map(),
        initialized: false,
        initializing: false,
        initError: null
      }
    };

    // Track step-specific metrics
    this.stepMetrics = new Map();

    logger.debug('OnboardingStateManager initialized', {
      formId,
      timestamp: Date.now()
    });
  }

    // Add tier-specific step management
    async setCurrentStep(step, options = {}) {
        const operationId = generateRequestId();
        const currentTier = this.state.tier.selected;
    
        try {
          // Get tier-specific step configuration
          const stepConfig = this.state.onboarding.stepsByTier.get(currentTier)?.get(step);
          
          if (!stepConfig && currentTier) {
            logger.warn('Step not configured for tier:', {
              step,
              tier: currentTier,
              operationId
            });
          }
    
          const previousStep = this.state.onboarding.currentStep;
    
          // Update step state with tier context
          this.setState({
            onboarding: {
              ...this.state.onboarding,
              currentStep: step,
              steps: this.state.onboarding.steps.set(step, {
                status: options.status || STEP_STATUS.IN_PROGRESS,
                timestamp: Date.now(),
                visitCount: (this.state.onboarding.steps.get(step)?.visitCount || 0) + 1,
                tier: currentTier
              })
            }
          }, 'step_change');
    
          // Track tier-specific metrics
          this.updateStepMetrics(step, {
            transitionFrom: previousStep,
            transitionTime: Date.now(),
            tier: currentTier
          });
    
          return {
            success: true,
            operationId,
            step,
            tier: currentTier
          };
        } catch (error) {
          logger.error('Step change failed:', {
            formId: this.formId,
            operationId,
            step,
            tier: currentTier,
            error: error.message
          });
          throw error;
        }
      }

  // Step Management
  async setCurrentStep(step, options = {}) {
    const operationId = generateRequestId();

    try {
      const previousStep = this.state.onboarding.currentStep;

      // Update step state
      this.setState({
        onboarding: {
          ...this.state.onboarding,
          currentStep: step,
          steps: this.state.onboarding.steps.set(step, {
            status: options.status || STEP_STATUS.IN_PROGRESS,
            timestamp: Date.now(),
            visitCount: (this.state.onboarding.steps.get(step)?.visitCount || 0) + 1
          })
        }
      }, 'step_change');

      // Track step metrics
      this.updateStepMetrics(step, {
        transitionFrom: previousStep,
        transitionTime: Date.now()
      });

      this.notifySubscribers({
        type: ONBOARDING_EVENTS.STEP_CHANGE,
        operationId,
        previousStep,
        currentStep: step,
        options
      });

      return {
        success: true,
        operationId,
        step
      };

    } catch (error) {
      logger.error('Step change failed:', {
        formId: this.formId,
        operationId,
        step,
        error: error.message
      });

      throw error;
    }
  }

  async completeStep(step, data = {}) {
    const operationId = generateRequestId();
    const currentTier = this.state.tier.selected;

    try {
      // Validate step completion against tier requirements
      if (currentTier === 'professional' && step === 'payment' && !data.paymentMethod) {
        throw new Error('Payment required for professional tier');
      }

      // Update step completion state
      this.state.onboarding.progress.completedSteps.add(step);
      this.state.onboarding.steps.set(step, {
        ...this.state.onboarding.steps.get(step),
        status: STEP_STATUS.COMPLETED,
        completedAt: Date.now()
      });

      // Save step data
      this.state.onboarding.stepData.set(step, {
        data,
        timestamp: Date.now(),
        validationStatus: 'complete'
      });

      // Update overall progress
      this.updateProgress();

      this.notifySubscribers({
        type: ONBOARDING_EVENTS.STEP_COMPLETE,
        operationId,
        step,
        data
      });

      return {
        success: true,
        operationId,
        step,
        progress: this.getProgress()
      };

     } catch (error) {
      logger.error('Step completion failed:', {
        formId: this.formId,
        operationId,
        step,
        tier: currentTier,
        error: error.message
      });
      throw error;
    }
  }

  // Progress Management
  updateProgress() {
    const totalSteps = this.state.onboarding.steps.size;
    const completedSteps = this.state.onboarding.progress.completedSteps.size;
    const overallProgress = totalSteps ? (completedSteps / totalSteps) * 100 : 0;

    this.setState({
      onboarding: {
        ...this.state.onboarding,
        progress: {
          ...this.state.onboarding.progress,
          overallProgress
        }
      }
    }, 'progress_update');

    return overallProgress;
  }

  getProgress() {
    return {
      currentStep: this.state.onboarding.currentStep,
      completedSteps: Array.from(this.state.onboarding.progress.completedSteps),
      lastActiveStep: this.state.onboarding.progress.lastActiveStep,
      stepValidation: Object.fromEntries(this.state.onboarding.progress.stepValidation),
      overallProgress: this.state.onboarding.progress.overallProgress
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
        validationStatus: 'valid'
      });

      this.notifySubscribers({
        type: ONBOARDING_EVENTS.DATA_SAVE,
        operationId,
        step,
        dataSize: JSON.stringify(data).length
      });

      return {
        success: true,
        operationId,
        step
      };

    } catch (error) {
      logger.error('Step data save failed:', {
        formId: this.formId,
        operationId,
        step,
        error: error.message
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
        errors: validationResult.errors || null
      });

      this.notifySubscribers({
        type: ONBOARDING_EVENTS.STEP_VALIDATION,
        operationId,
        step,
        result: validationResult
      });

      return validationResult;

    } catch (error) {
      logger.error('Step validation failed:', {
        formId: this.formId,
        operationId,
        step,
        error: error.message
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
        transitions: []
      });
    }

    const metrics = this.stepMetrics.get(step);
    metrics.visits++;
    
    if (data.transitionFrom) {
      metrics.transitions.push({
        from: data.transitionFrom,
        timestamp: data.transitionTime,
        duration: data.transitionTime - 
          (this.stepMetrics.get(data.transitionFrom)?.lastVisit || data.transitionTime)
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
          completedSteps: Array.from(this.state.onboarding.progress.completedSteps),
          stepValidation: Object.fromEntries(this.state.onboarding.progress.stepValidation)
        }
      }
    };
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