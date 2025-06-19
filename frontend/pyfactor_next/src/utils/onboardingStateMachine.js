/**
 * Onboarding State Machine
 * 
 * Manages the onboarding flow with clear states and transitions
 */

import { logger } from '@/utils/logger';
import { sessionManagerEnhanced as sessionManager } from '@/utils/sessionManager-v2-enhanced';

// Define all possible states
const ONBOARDING_STATES = {
  NOT_STARTED: 'not_started',
  BUSINESS_INFO: 'business_info',
  SUBSCRIPTION_SELECTION: 'subscription_selection',
  PAYMENT_PENDING: 'payment_pending',
  PAYMENT_PROCESSING: 'payment_processing',
  COMPLETED: 'completed',
  ERROR: 'error'
};

// Define valid transitions
const STATE_TRANSITIONS = {
  [ONBOARDING_STATES.NOT_STARTED]: [ONBOARDING_STATES.BUSINESS_INFO],
  [ONBOARDING_STATES.BUSINESS_INFO]: [ONBOARDING_STATES.SUBSCRIPTION_SELECTION],
  [ONBOARDING_STATES.SUBSCRIPTION_SELECTION]: [
    ONBOARDING_STATES.PAYMENT_PENDING, // For paid plans
    ONBOARDING_STATES.COMPLETED // For free plan
  ],
  [ONBOARDING_STATES.PAYMENT_PENDING]: [
    ONBOARDING_STATES.PAYMENT_PROCESSING,
    ONBOARDING_STATES.SUBSCRIPTION_SELECTION // Allow going back
  ],
  [ONBOARDING_STATES.PAYMENT_PROCESSING]: [
    ONBOARDING_STATES.COMPLETED,
    ONBOARDING_STATES.PAYMENT_PENDING // Payment failed
  ],
  [ONBOARDING_STATES.COMPLETED]: [], // Terminal state
  [ONBOARDING_STATES.ERROR]: [ONBOARDING_STATES.BUSINESS_INFO] // Allow retry
};

class OnboardingStateMachine {
  constructor() {
    this.currentState = null;
    this.stateData = {};
  }

  /**
   * Initialize from session
   */
  async initialize() {
    try {
      const session = await sessionManager.getSession();
      const progress = await sessionManager.getOnboardingProgress();
      
      // Determine current state from session data
      if (!session?.authenticated) {
        this.currentState = null;
        return;
      }

      if (progress?.onboardingCompleted || session.user?.onboardingCompleted) {
        this.currentState = ONBOARDING_STATES.COMPLETED;
      } else if (progress?.paymentPending) {
        this.currentState = ONBOARDING_STATES.PAYMENT_PENDING;
      } else if (progress?.selectedPlan) {
        this.currentState = ONBOARDING_STATES.SUBSCRIPTION_SELECTION;
      } else if (progress?.businessName) {
        this.currentState = ONBOARDING_STATES.BUSINESS_INFO;
      } else {
        this.currentState = ONBOARDING_STATES.NOT_STARTED;
      }

      this.stateData = progress;
      
      logger.info('[OnboardingStateMachine] Initialized', {
        currentState: this.currentState,
        stateData: this.stateData
      });

    } catch (error) {
      logger.error('[OnboardingStateMachine] Initialization error', error);
      this.currentState = ONBOARDING_STATES.ERROR;
    }
  }

  /**
   * Get current state
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * Check if transition is valid
   */
  canTransitionTo(nextState) {
    const validTransitions = STATE_TRANSITIONS[this.currentState] || [];
    return validTransitions.includes(nextState);
  }

  /**
   * Transition to next state
   */
  async transitionTo(nextState, data = {}) {
    if (!this.canTransitionTo(nextState)) {
      throw new Error(`Invalid transition from ${this.currentState} to ${nextState}`);
    }

    logger.info('[OnboardingStateMachine] Transitioning', {
      from: this.currentState,
      to: nextState,
      data
    });

    const previousState = this.currentState;
    this.currentState = nextState;
    this.stateData = { ...this.stateData, ...data };

    // Save state to backend
    try {
      await this.saveProgress();
    } catch (error) {
      logger.error('[OnboardingStateMachine] Failed to save progress', error);
      // Rollback on failure
      this.currentState = previousState;
      throw error;
    }

    return this.currentState;
  }

  /**
   * Save progress to backend
   */
  async saveProgress() {
    const progressData = {
      currentStep: this.currentState,
      ...this.stateData,
      lastUpdated: new Date().toISOString()
    };

    await sessionManager.updateSession({
      onboardingProgress: progressData,
      currentStep: this.currentState
    });

    logger.info('[OnboardingStateMachine] Progress saved', progressData);
  }

  /**
   * Handle business info submission
   */
  async submitBusinessInfo(businessData) {
    logger.debug('[OnboardingStateMachine] submitBusinessInfo called', {
      currentState: this.currentState,
      businessData
    });
    
    if (this.currentState !== ONBOARDING_STATES.NOT_STARTED && 
        this.currentState !== ONBOARDING_STATES.BUSINESS_INFO) {
      throw new Error('Invalid state for business info submission');
    }

    // Validate business data
    if (!businessData.businessName || !businessData.businessType) {
      throw new Error('Business name and type are required');
    }

    // If we're at NOT_STARTED, first transition to BUSINESS_INFO
    if (this.currentState === ONBOARDING_STATES.NOT_STARTED) {
      await this.transitionTo(ONBOARDING_STATES.BUSINESS_INFO, {
        startedAt: new Date().toISOString()
      });
    }

    // Now transition to SUBSCRIPTION_SELECTION
    await this.transitionTo(ONBOARDING_STATES.SUBSCRIPTION_SELECTION, {
      businessName: businessData.businessName,
      businessType: businessData.businessType,
      country: businessData.country,
      legalStructure: businessData.legalStructure,
      dateFounded: businessData.dateFounded,
      completedSteps: ['business_info']
    });
  }

  /**
   * Handle subscription selection
   */
  async selectSubscription(plan, billingCycle = 'monthly') {
    if (this.currentState !== ONBOARDING_STATES.SUBSCRIPTION_SELECTION) {
      throw new Error('Invalid state for subscription selection');
    }

    const nextState = plan === 'free' 
      ? ONBOARDING_STATES.COMPLETED 
      : ONBOARDING_STATES.PAYMENT_PENDING;

    await this.transitionTo(nextState, {
      selectedPlan: plan,
      billingCycle: billingCycle,
      paymentPending: plan !== 'free',
      completedSteps: [...(this.stateData.completedSteps || []), 'subscription']
    });
  }

  /**
   * Handle payment initiation
   */
  async initiatePayment() {
    if (this.currentState !== ONBOARDING_STATES.PAYMENT_PENDING) {
      throw new Error('Invalid state for payment initiation');
    }

    await this.transitionTo(ONBOARDING_STATES.PAYMENT_PROCESSING, {
      paymentStartedAt: new Date().toISOString()
    });
  }

  /**
   * Handle payment completion
   */
  async completePayment(paymentData) {
    if (this.currentState !== ONBOARDING_STATES.PAYMENT_PROCESSING) {
      throw new Error('Invalid state for payment completion');
    }

    await this.transitionTo(ONBOARDING_STATES.COMPLETED, {
      paymentCompleted: true,
      paymentId: paymentData.paymentId,
      subscriptionId: paymentData.subscriptionId,
      completedSteps: [...(this.stateData.completedSteps || []), 'payment'],
      onboardingCompletedAt: new Date().toISOString()
    });
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(error) {
    if (this.currentState !== ONBOARDING_STATES.PAYMENT_PROCESSING) {
      return;
    }

    await this.transitionTo(ONBOARDING_STATES.PAYMENT_PENDING, {
      lastPaymentError: error.message,
      paymentFailedAt: new Date().toISOString()
    });
  }

  /**
   * Get next action for current state
   */
  getNextAction() {
    switch (this.currentState) {
      case ONBOARDING_STATES.NOT_STARTED:
        return { action: 'start', url: '/onboarding' };
      
      case ONBOARDING_STATES.BUSINESS_INFO:
        return { action: 'complete_business_info', url: '/onboarding' };
      
      case ONBOARDING_STATES.SUBSCRIPTION_SELECTION:
        return { action: 'select_plan', url: '/onboarding' };
      
      case ONBOARDING_STATES.PAYMENT_PENDING:
        return { action: 'complete_payment', url: '/onboarding/payment' };
      
      case ONBOARDING_STATES.PAYMENT_PROCESSING:
        return { action: 'wait', message: 'Processing payment...' };
      
      case ONBOARDING_STATES.COMPLETED:
        return { action: 'access_dashboard', url: `/${this.stateData.tenantId}/dashboard` };
      
      case ONBOARDING_STATES.ERROR:
        return { action: 'retry', url: '/onboarding' };
      
      default:
        return { action: 'unknown', url: '/onboarding' };
    }
  }

  /**
   * Check if onboarding is complete
   */
  isComplete() {
    return this.currentState === ONBOARDING_STATES.COMPLETED;
  }

  /**
   * Reset state machine
   */
  reset() {
    this.currentState = ONBOARDING_STATES.NOT_STARTED;
    this.stateData = {};
  }
}

// Export singleton instance
export const onboardingStateMachine = new OnboardingStateMachine();

// Also export class and constants for testing
export { OnboardingStateMachine, ONBOARDING_STATES };