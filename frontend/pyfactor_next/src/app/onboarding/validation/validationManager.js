// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/validation/validationManager.js
import { logger } from '@/utils/logger';
import { VALIDATION_CONFIG } from './config';
import { generateRequestId } from '@/lib/authUtils';

class ValidationManager {
    constructor() {
      this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      // Initialize with comprehensive logging
      logger.debug('ValidationManager initialized', {
        timestamp: Date.now(),
        config: VALIDATION_CONFIG
      });
  
      // Core state management with enhanced tracking
      this.state = {
        // Queue management
        queue: [],                     
        priorityQueue: new Map(),      // New: Separate queue for priority operations
        
        // Timing and validation state
        lastValidation: Date.now(),    
        lastSuccessfulValidation: null, // New: Track successful validations
        isValidating: false,           
        currentOperation: null,        
        
        // Component lifecycle
        mounted: true,                 
        
        // Resource management
        pendingTimeouts: new Set(),    
        operationStats: new Map(),     
        
        // Error handling
        lastError: null,               
        errorCount: 0,                 // New: Track error frequency
        
        // Coordination
        validationLock: null,          
        formStateManager: null,        // Connection to form state
        
        // Performance monitoring
        performanceMetrics: {          // New: Track performance
          averageOperationTime: 0,
          totalOperations: 0,
          successRate: 1
        }
      };
  
      // Bind methods to maintain context
      this.coordinate = this.coordinate.bind(this);
      this.cleanup = this.cleanup.bind(this);
    }
  
    /**
     * Sets up connection with FormStateManager for state coordination
     */
    setFormStateManager(manager) {
      this.state.formStateManager = manager;
      logger.debug('FormStateManager connected', {
        timestamp: Date.now()
      });
    }
  
    /**
     * Enhanced initialization coordination with better error recovery
     */
    async coordinateInitialization(operation) {
      const initState = {
        id: generateRequestId(),
        startTime: Date.now(),
        status: 'pending',
        retryCount: 0,
        maxRetries: VALIDATION_CONFIG.maxValidationRetries
      };
  
      // Clear existing validation state with proper cleanup
      if (this.state.isValidating) {
        await this.clearExistingValidation();
      }
  
      try {
        this.state.isValidating = true;
        this.state.currentOperation = initState.id;
        
        logger.debug('Starting initialization', {
          operationId: initState.id,
          timestamp: Date.now()
        });
  
        // Execute with timeout protection
        const result = await Promise.race([
          operation(),
          this.createTimeoutPromise(initState.id)
        ]);
  
        // Update metrics on success
        this.updatePerformanceMetrics(initState.id, true);
        initState.status = 'completed';
        
        return result;
  
      } catch (error) {
        // Handle initialization failure with retry logic
        initState.status = 'failed';
        this.recordError(error, initState);
  
        if (initState.retryCount < initState.maxRetries) {
          return this.retryInitialization(operation, initState);
        }
        throw error;
  
      } finally {
        await this.cleanupOperation(initState);
      }
    }
  
    /**
     * Main coordination method with enhanced error handling and queue management
     */
    async coordinate(operation, key, minGap) {
      if (!this.state.mounted) return null;
  
      const operationState = {
        id: generateRequestId(),
        key,
        startTime: Date.now(),
        priority: key?.includes('priority') || false
      };
  
      this.trackOperation(operationState.id, 'started');
      
      // Handle queue timeout protection
      const timeoutId = this.setupQueueTimeout(operationState);
      
      // Enhanced queue management
      if (this.state.isValidating) {
        return this.handleQueueing(operation, operationState, minGap);
      }
  
      // Enforce validation gaps
      await this.enforceValidationGap(minGap);
  
      try {
        // Setup validation state
        this.state.isValidating = true;
        this.state.lastValidation = Date.now();
        this.state.currentOperation = operationState.id;
        
        // Execute operation with timeout protection
        const protectedOperation = this.createProtectedOperation(
          operation, 
          operationState
        );
        
        const result = await protectedOperation();
        
        // Update metrics and process queue
        this.updatePerformanceMetrics(operationState.id, true);
        await this.processNextInQueue(minGap);
        
        return result;
  
      } catch (error) {
        this.handleOperationError(error, operationState);
        throw error;
  
      } finally {
        await this.cleanupOperation(operationState);
      }
    }

    async validateField(name, value, formData) {
      try {
        const response = await fetch(`${this.baseUrl}/api/onboarding/validate-field/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            field: name,
            value,
            formData
          })
        });
  
        return await response.json();
      } catch (error) {
        logger.error('Field validation failed:', error);
        return { isValid: false, error: error.message };
      }
    }
  
    /**
     * Helper methods for operation management
     */
    async clearExistingValidation() {
      if (this.state.currentOperation) {
        logger.debug('Clearing existing validation', {
          currentOperation: this.state.currentOperation,
          timestamp: Date.now()
        });
        
        this.state.isValidating = false;
        this.state.currentOperation = null;
        await this.notifyStateChange('validation_cleared');
      }
    }
  
    createTimeoutPromise(operationId) {
      return new Promise((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Operation timeout: ${operationId}`));
        }, VALIDATION_CONFIG.throttleDelay);
        
        this.state.pendingTimeouts.add(timeoutId);
      });
    }
  
    async retryInitialization(operation, state) {
      state.retryCount++;
      const delay = Math.min(
        1000 * Math.pow(2, state.retryCount),
        VALIDATION_CONFIG.maxRetryDelay
      );
      
      logger.debug('Retrying initialization', {
        operationId: state.id,
        attempt: state.retryCount,
        delay
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.coordinateInitialization(operation);
    }
  
    async handleQueueing(operation, state, minGap) {
      const queuePromise = new Promise((resolve, reject) => {
        const queueItem = {
          id: state.id,
          operation,
          resolve,
          reject,
          timestamp: Date.now(),
          priority: state.priority
        };
  
        if (state.priority) {
          this.state.priorityQueue.set(state.key, queueItem);
        } else {
          this.state.queue.push(queueItem);
        }
      });
  
      this.trackOperation(state.id, 'queued');
      return queuePromise;
    }
  
    async notifyStateChange(type, data = {}) {
      if (this.state.formStateManager) {
        await this.state.formStateManager.handleValidationStateChange(type, data);
      }
    }
  
    /**
     * Enhanced cleanup with proper resource management
     */
    cleanup() {
      logger.debug('Starting cleanup', {
        pendingTimeouts: this.state.pendingTimeouts.size,
        queueLength: this.state.queue.length,
        isValidating: this.state.isValidating
      });
  
      this.state.mounted = false;
      
      // Clear queues
      this.clearQueues();
      
      // Reset state
      this.resetState();
      
      // Clear timeouts
      this.clearTimeouts();
      
      logger.debug('Cleanup completed', {
        finalStats: this.getStats()
      });
    }
  
    clearQueues() {
      const error = new Error('Cleanup in progress');
      
      [...this.state.queue, ...this.state.priorityQueue.values()]
        .forEach(item => {
          try {
            item.reject(error);
          } catch (e) {
            logger.error('Queue cleanup error:', e);
          }
        });
  
      this.state.queue = [];
      this.state.priorityQueue.clear();
    }
  
    resetState() {
      this.state.isValidating = false;
      this.state.currentOperation = null;
      this.state.validationLock = null;
    }
  
    clearTimeouts() {
      this.state.pendingTimeouts.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      this.state.pendingTimeouts.clear();
    }
  
    /**
     * Performance monitoring and statistics
     */
    getStats() {
      return {
        queueLength: this.state.queue.length + this.state.priorityQueue.size,
        isValidating: this.state.isValidating,
        lastValidation: this.state.lastValidation,
        pendingTimeouts: this.state.pendingTimeouts.size,
        operations: Array.from(this.state.operationStats.entries()),
        lastError: this.state.lastError,
        performanceMetrics: { ...this.state.performanceMetrics }
      };
    }
  }
  
  // Export the enhanced ValidationManager
  export { ValidationManager };