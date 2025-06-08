// /src/app/onboarding/validation/validationManager.js
import { logger } from '@/utils/logger';
import { VALIDATION_CONFIG } from './config';
import { generateRequestId } from '@/lib/authUtils';
import { ONBOARDING_STEPS, validateStepData } from '@/config/steps';
import { onboardingApi, makeRequest } from '@/services/api/onboarding';

class ValidationManager {
    constructor() {
      this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      logger.debug('ValidationManager initialized', {
        timestamp: Date.now(),
        config: VALIDATION_CONFIG
      });
  
      this.state = {
        queue: [],                     
        priorityQueue: new Map(),      
        last_validation: Date.now(),    
        last_successful_validation: null,
        is_validating: false,           
        current_operation: null,        
        mounted: true,                 
        pending_timeouts: new Set(),    
        operation_stats: new Map(),     
        last_error: null,               
        error_count: 0,                 
        validation_lock: null,          
        form_state_manager: null,        
        performance_metrics: {          
          average_operation_time: 0,
          total_operations: 0,
          success_rate: 1
        }
      };
  
      this.coordinate = this.coordinate.bind(this);
      this.cleanup = this.cleanup.bind(this);
      this.stepConfig = ONBOARDING_STEPS;
    }
  
    setFormStateManager(manager) {
      this.state.form_state_manager = manager;
      logger.debug('FormStateManager connected');
    }

    async validateStepTransition(from, to, form_data) {
      const request_id = generateRequestId();

      try {
        // Use centralized API for validation
        const validation = await makeRequest(
          onboardingApi.updateStep(form_data.access_token, from, {
            current_step: from,
            next_step: to,
            form_data,
            request_id
          })
        );

        return {
          isValid: validation.status === 'success',
          reason: validation.reason || 'VALID',
          next_step: validation.next_step
        };

      } catch (error) {
        logger.error('Step transition validation failed:', {
          request_id,
          error: error.message,
          from,
          to
        });

        return {
          isValid: false,
          reason: 'ERROR',
          error: error.message
        };
      }
    }
  
    async coordinateInitialization(operation) {
      const init_state = {
        id: generateRequestId(),
        start_time: Date.now(),
        status: 'pending',
        retry_count: 0,
        max_retries: VALIDATION_CONFIG.maxValidationRetries
      };
  
      if (this.state.is_validating) {
        await this.clearExistingValidation();
      }
  
      try {
        this.state.is_validating = true;
        this.state.current_operation = init_state.id;
        
        logger.debug('Starting initialization', {
          operation_id: init_state.id
        });
  
        const result = await Promise.race([
          operation(),
          this.createTimeoutPromise(init_state.id)
        ]);
  
        this.updatePerformanceMetrics(init_state.id, true);
        init_state.status = 'completed';
        
        return result;
  
      } catch (error) {
        init_state.status = 'failed';
        this.recordError(error, init_state);
  
        if (init_state.retry_count < init_state.max_retries) {
          return this.retryInitialization(operation, init_state);
        }
        throw error;
  
      } finally {
        await this.cleanupOperation(init_state);
      }
    }

    async validateField(field_name, value, form_data) {
      try {
        const validation = await makeRequest(
          onboardingApi.validateField(
            form_data.access_token,
            {
              field: field_name,
              value,
              form_data
            }
          )
        );

        return validation;
      } catch (error) {
        logger.error('Field validation failed:', error);
        return { isValid: false, error: error.message };
      }
    }
  
    async clearExistingValidation() {
      if (this.state.current_operation) {
        logger.debug('Clearing existing validation', {
          current_operation: this.state.current_operation
        });
        
        this.state.is_validating = false;
        this.state.current_operation = null;
        await this.notifyStateChange('validation_cleared');
      }
    }
  
    cleanup() {
      logger.debug('Starting cleanup', {
        pending_timeouts: this.state.pending_timeouts.size,
        queue_length: this.state.queue.length,
        is_validating: this.state.is_validating
      });
  
      this.state.mounted = false;
      this.clearQueues();
      this.resetState();
      this.clearTimeouts();
      
      logger.debug('Cleanup completed', {
        final_stats: this.getStats()
      });
    }
  
    getStats() {
      return {
        queue_length: this.state.queue.length + this.state.priorityQueue.size,
        is_validating: this.state.is_validating,
        last_validation: this.state.last_validation,
        pending_timeouts: this.state.pending_timeouts.size,
        operations: Array.from(this.state.operation_stats.entries()),
        last_error: this.state.last_error,
        performance_metrics: { ...this.state.performance_metrics }
      };
    }
}

export { ValidationManager };