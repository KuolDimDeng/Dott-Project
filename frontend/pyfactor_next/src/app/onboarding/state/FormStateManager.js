// src/app/onboarding/state/FormStateManager.js

import { logger } from '@/utils/logger';
import { generateRequestId } from '@/lib/authUtils';

export const FORM_EVENTS = {
  FIELD_CHANGE: 'field_change',
  VALIDATION_START: 'validation_start',
  VALIDATION_COMPLETE: 'validation_complete',
  VALIDATION_ERROR: 'validation_error',
  SAVE_START: 'save_start',
  SAVE_COMPLETE: 'save_complete',
  SAVE_ERROR: 'save_error',
  FORM_RESET: 'form_reset',
  STATE_UPDATE: 'state_update'
};

export class FormStateManager {
  constructor(formId) {
    this.formId = formId;
    this.subscribers = new Set();
    this.operationQueue = [];
    this.timeouts = new Set();

    // Core state
    this.state = {
      // Form state
      isDirty: false,
      isValid: false,
      isSubmitting: false,
      fields: new Map(),
      
      // Validation state
      isValidating: false,
      lastValidation: null,
      validationErrors: new Map(),
      
      // Save state
      isSaving: false,
      lastSaved: null,
      saveErrors: new Map(),

      // Operation tracking
      currentOperation: null,
      pendingOperations: new Map(),
      operationHistory: [],

      // Component lifecycle
      isMounted: true,
      initializationComplete: false.valueOf,
        // Add tier state
      tier: {
        selected: null,
        validationStatus: null,
        lastUpdated: null
      },
      
      // Add billing state
      billing: {
        cycle: null,
        lastUpdated: null
      }

    };

    // Performance monitoring
    this.metrics = {
      operationCount: 0,
      averageOperationTime: 0,
      errorCount: 0,
      lastOperationTime: null
    };

    logger.debug('FormStateManager initialized', {
      formId,
      timestamp: Date.now()
    });
  }

  // State Management
  getState() {
    return {
      ...this.state,
      fields: Object.fromEntries(this.state.fields),
      validationErrors: Object.fromEntries(this.state.validationErrors),
      saveErrors: Object.fromEntries(this.state.saveErrors),
      pendingOperations: Object.fromEntries(this.state.pendingOperations)
    };
  }

  setState(updates, source) {
    const operationId = generateRequestId();
    const previousState = { ...this.state };

    try {
      this.state = {
        ...this.state,
        ...updates
      };

      this.notifySubscribers({
        type: FORM_EVENTS.STATE_UPDATE,
        operationId,
        source,
        updates,
        previousState: previousState,
        currentState: this.getState()
      });

    } catch (error) {
      logger.error('State update failed:', {
        formId: this.formId,
        operationId,
        error: error.message,
        updates
      });

      // Rollback on error
      this.state = previousState;
      throw error;
    }
  }

  // Field Management
  async handleFieldChange(fieldName, value, options = {}) {
    const operationId = generateRequestId();
    
    logger.debug('Field change detected', {
      formId: this.formId,
      fieldName,
      operationId,
      options
    });

    try {
      // Update field state
      this.state.fields.set(fieldName, {
        value,
        timestamp: Date.now(),
        isDirty: true,
        isTouched: true,
        ...options
      });

      this.setState({ isDirty: true }, 'field_change');

      // Notify subscribers
      this.notifySubscribers({
        type: FORM_EVENTS.FIELD_CHANGE,
        operationId,
        fieldName,
        value,
        options
      });

      // Return change metadata
      return {
        operationId,
        timestamp: Date.now(),
        fieldName,
        status: 'success'
      };

    } catch (error) {
      logger.error('Field change failed:', {
        formId: this.formId,
        fieldName,
        operationId,
        error: error.message
      });

      throw error;
    }
  }

  // Validation Management
  async startValidation(options = {}) {
    const operationId = generateRequestId();
    
    if (this.state.isValidating) {
      logger.debug('Validation already in progress', {
        formId: this.formId,
        operationId
      });
      return null;
    }

    try {
      this.setState({
        isValidating: true,
        lastValidation: Date.now()
      }, 'validation_start');

      this.notifySubscribers({
        type: FORM_EVENTS.VALIDATION_START,
        operationId,
        options
      });

      return operationId;

    } catch (error) {
      logger.error('Failed to start validation:', {
        formId: this.formId,
        operationId,
        error: error.message
      });
      throw error;
    }
  }

  async completeValidation(operationId, result) {
    try {
      this.setState({
        isValidating: false,
        isValid: result.isValid,
        validationErrors: new Map(Object.entries(result.errors || {}))
      }, 'validation_complete');

      this.notifySubscribers({
        type: FORM_EVENTS.VALIDATION_COMPLETE,
        operationId,
        result
      });

    } catch (error) {
      logger.error('Validation completion failed:', {
        formId: this.formId,
        operationId,
        error: error.message
      });
      throw error;
    }
  }

  // Save Management
  async startSave(options = {}) {
    const operationId = generateRequestId();

    if (this.state.isSaving) {
      logger.debug('Save already in progress', {
        formId: this.formId,
        operationId
      });
      return null;
    }

    try {
      this.setState({
        isSaving: true,
        lastSaveAttempt: Date.now()
      }, 'save_start');

      this.notifySubscribers({
        type: FORM_EVENTS.SAVE_START,
        operationId,
        options
      });

      return operationId;

    } catch (error) {
      logger.error('Failed to start save:', {
        formId: this.formId,
        operationId,
        error: error.message
      });
      throw error;
    }
  }

  async completeSave(operationId, result) {
    try {
      this.setState({
        isSaving: false,
        lastSaved: Date.now(),
        isDirty: false
      }, 'save_complete');

      this.notifySubscribers({
        type: FORM_EVENTS.SAVE_COMPLETE,
        operationId,
        result
      });

    } catch (error) {
      logger.error('Save completion failed:', {
        formId: this.formId,
        operationId,
        error: error.message
      });
      throw error;
    }
  }

  async setTier(tier, options = {}) {
    const operationId = generateRequestId();
    
    try {
      const previousTier = this.state.tier.selected;
      
      this.setState({
        tier: {
          selected: tier,
          validationStatus: 'pending',
          lastUpdated: Date.now()
        }
      }, 'tier_change');
  
      this.notifySubscribers({
        type: FORM_EVENTS.TIER_CHANGE,
        operationId,
        previousTier,
        currentTier: tier,
        options
      });
  
      return {
        success: true,
        operationId,
        tier
      };
    } catch (error) {
      logger.error('Tier change failed:', {
        formId: this.formId,
        operationId,
        tier,
        error: error.message
      });
      throw error;
    }
  }

  // Subscription Management
  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Subscriber must be a function');
    }

    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(event) {
    const stateSnapshot = this.getState();
    
    this.subscribers.forEach(subscriber => {
      try {
        subscriber(stateSnapshot, event);
      } catch (error) {
        logger.error('Subscriber notification failed:', {
          formId: this.formId,
          event: event.type,
          error: error.message
        });
      }
    });
  }

  // Reset and Cleanup
  reset() {
    const operationId = generateRequestId();

    try {
      // Reset all state to initial values
      this.state.fields.clear();
      this.state.validationErrors.clear();
      this.state.saveErrors.clear();
      this.state.pendingOperations.clear();

      this.setState({
        isDirty: false,
        isValid: false,
        isSubmitting: false,
        isValidating: false,
        isSaving: false,
        lastValidation: null,
        lastSaved: null,
        currentOperation: null
      }, 'form_reset');

      this.notifySubscribers({
        type: FORM_EVENTS.FORM_RESET,
        operationId
      });

    } catch (error) {
      logger.error('Form reset failed:', {
        formId: this.formId,
        operationId,
        error: error.message
      });
      throw error;
    }
  }

  cleanup() {
    logger.debug('Starting form cleanup', {
      formId: this.formId,
      timeouts: this.timeouts.size,
      pendingOperations: this.state.pendingOperations.size
    });

    try {
      // Clear all timeouts
      this.timeouts.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      this.timeouts.clear();

      // Clear subscribers
      this.subscribers.clear();

      // Reset state
      this.state.isMounted = false;
      this.state.currentOperation = null;

      // Clear operation queue
      this.operationQueue = [];

      logger.debug('Form cleanup completed', {
        formId: this.formId
      });

    } catch (error) {
      logger.error('Form cleanup failed:', {
        formId: this.formId,
        error: error.message
      });
    }
  }

  // Metrics and Debugging
  getMetrics() {
    return {
      ...this.metrics,
      currentState: this.getState(),
      subscriberCount: this.subscribers.size,
      queueLength: this.operationQueue.length,
      timeoutCount: this.timeouts.size
    };
  }
}