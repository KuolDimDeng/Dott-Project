// src/hooks/useFormStatePersistence.js
import { useEffect, useCallback, useRef, useState } from 'react';
import { persistenceService } from '@/services/persistenceService';
import { logger } from '@/utils/logger';
import { useCleanup } from './useCleanup';
import { generateRequestId } from '@/lib/authUtils';

const DRAFT_VERSION = '1.0';

// First, let's enhance our FormStateManager to work with the existing ValidationCoordinator
class FormStateManager {
  constructor(formId, coordinator) {
    // Store references to external dependencies
    this.formId = formId;
    this.coordinator = coordinator;
    
    // Initialize core state
    this.state = {
      isDirty: false,
      isValid: false,
      isValidating: false,
      isSaving: false,
      
      // Track changes at a granular level
      pendingChanges: new Map(),
      lastValidated: null,
      lastSaved: null,
      
      // Timing controls
      validationCooldown: 2000,
      persistenceCooldown: 1000,
      selected_plan: null,
      tierValidated: false
    };

    // Create debounce timers
    this.validationTimer = null;
    this.persistenceTimer = null;
    
    // Track subscribers
    this.subscribers = new Set();
    
    logger.debug('FormStateManager initialized', {
      formId,
      timestamp: Date.now()
    });
  }

   // Add tier-specific change handling
   async handleTierChange(tier, options = {}) {
    const changeId = generateRequestId();
    
    logger.debug('Tier change detected', {
      formId: this.formId,
      tier,
      changeId,
      timestamp: Date.now()
    });

    // Validate tier
    if (!['free', 'professional'].includes(tier)) {
      logger.error('Invalid tier selected', { tier, changeId });
      throw new Error('Invalid subscription tier');
    }

    // Update state
    this.state.selected_plan = tier;
    this.state.tierValidated = false;
    this.state.isDirty = true;

    // Add to pending changes
    this.state.pendingChanges.set('tier', {
      value: tier,
      changeId,
      timestamp: Date.now(),
      validated: false,
      persisted: false
    });

    this.notifySubscribers();

    // Process validation
    return this.coordinator.coordinate(
      async () => this.processValidation({ ...options, includeTier: true }),
      {
        type: 'tier-change',
        tier,
        changeId,
        ...options
      }
    );
  }

  // Handle form field changes
  async handleFieldChange(fieldName, value, options = {}) {
    const changeId = generateRequestId();
    
    logger.debug('Field change detected', {
      formId: this.formId,
      fieldName,
      changeId,
      timestamp: Date.now()
    });

    // Record the change
    this.state.pendingChanges.set(fieldName, {
      value,
      changeId,
      timestamp: Date.now(),
      validated: false,
      persisted: false
    });

    // Update form state
    this.state.isDirty = true;
    this.notifySubscribers();

    // Schedule validation through coordinator
    return this.coordinator.coordinate(
      async () => this.processValidation(options),
      {
        type: 'field-change',
        fieldName,
        changeId,
        ...options
      }
    );
  }

  // Process validation with proper coordination
  async processValidation(options = {}) {
    if (this.state.isValidating) {
      logger.debug('Validation already in progress', {
        formId: this.formId,
        timestamp: Date.now()
      });
      return;
    }

    try {
      this.state.isValidating = true;
      this.notifySubscribers();

      // Group changes that need validation
      const pendingValidations = Array.from(this.state.pendingChanges.entries())
        .filter(([_, change]) => !change.validated);

      if (pendingValidations.length === 0) return;

      // Perform validation through coordinator
      const validationResult = await this.coordinator.coordinate(
        async () => this.validateChanges(pendingValidations),
        { type: 'validation', ...options }
      );

      // Update change tracking
      if (validationResult.isValid) {
        pendingValidations.forEach(([fieldName]) => {
          const change = this.state.pendingChanges.get(fieldName);
          if (change) {
            change.validated = true;
          }
        });

        // Schedule persistence if validation succeeded
        await this.schedulePersistence(pendingValidations);
      }

      this.state.isValid = validationResult.isValid;
      this.state.lastValidated = Date.now();
      
    } finally {
      this.state.isValidating = false;
      this.notifySubscribers();
    }
  }

  // Handle persistence scheduling
  async schedulePersistence(validatedChanges) {
    if (this.persistenceTimer) {
      clearTimeout(this.persistenceTimer);
    }

    return new Promise((resolve) => {
      this.persistenceTimer = setTimeout(
        async () => {
          try {
            await this.processPersistence(validatedChanges);
            resolve();
          } catch (error) {
            logger.error('Persistence failed', {
              formId: this.formId,
              error: error.message
            });
            resolve();
          }
        },
        this.state.persistenceCooldown
      );
    });
  }

  // Process actual persistence
  async processPersistence(changes) {
    if (this.state.isSaving) return;

    try {
      this.state.isSaving = true;
      this.notifySubscribers();

      await this.coordinator.coordinate(
        async () => {
          const dataToSave = changes.reduce((acc, [fieldName, change]) => {
            acc[fieldName] = change.value;
            return acc;
          }, {});

          // Include tier in saved data
          if (this.state.selected_plan) {
            dataToSave.tier = this.state.selected_plan;
          }

          await persistenceService.saveData(
            `${this.formId}_draft`,
            {
              version: DRAFT_VERSION,
              timestamp: Date.now(),
              data: dataToSave,
              metadata: {
                changeIds: changes.map(([_, change]) => change.changeId),
                tier: this.state.selected_plan
              }
            }
          );

          // Update change tracking
          changes.forEach(([fieldName]) => {
            const change = this.state.pendingChanges.get(fieldName);
            if (change) {
              change.persisted = true;
            }
          });
        },
        { type: 'persistence' }
      );
    } finally {
      this.state.isSaving = false;
      this.notifySubscribers();
    }
  }


  // Utility methods
  cleanupProcessedChanges() {
    for (const [fieldName, change] of this.state.pendingChanges.entries()) {
      if (change.validated && change.persisted) {
        this.state.pendingChanges.delete(fieldName);
      }
    }

    this.state.isDirty = this.state.pendingChanges.size > 0;
    this.notifySubscribers();
  }

  // Subscription management
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    const stateSnapshot = {
      isDirty: this.state.isDirty,
      isValid: this.state.isValid,
      isValidating: this.state.isValidating,
      isSaving: this.state.isSaving,
      lastValidated: this.state.lastValidated,
      lastSaved: this.state.lastSaved
    };

    this.subscribers.forEach(callback => callback(stateSnapshot));
  }

  // Cleanup resources
  cleanup() {
    if (this.validationTimer) {
      clearTimeout(this.validationTimer);
    }
    if (this.persistenceTimer) {
      clearTimeout(this.persistenceTimer);
    }
    this.subscribers.clear();
  }
}

// Now enhance the useFormStatePersistence hook to use FormStateManager
export const useFormStatePersistence = (formId, options = {}) => {
  // Existing setup code remains the same...
  const [tierState, setTierState] = useState(null);


  // Initialize FormStateManager
  const stateManager = useRef(null);
  if (!stateManager.current) {
    stateManager.current = new FormStateManager(formId, coordinator.current);
  }

  // Add React state for component updates
  const [formState, setFormState] = useState(() => ({
    isDirty: false,
    isValid: true,
    isProcessing: false
  }));

  // Subscribe to state manager updates
  // Subscribe to state manager updates with tier
  useEffect(() => {
    const unsubscribe = stateManager.current.subscribe((newState) => {
      setFormState(prev => ({
        ...prev,
        isDirty: newState.isDirty,
        isValid: newState.isValid,
        isProcessing: newState.isValidating || newState.isSaving,
        selected_plan: newState.selected_plan
      }));

      if (newState.selected_plan !== tierState) {
        setTierState(newState.selected_plan);
      }
    });

    return unsubscribe;
  }, [tierState]);

  // Enhanced cleanup
  useEffect(() => {
    addCleanupFn(() => {
      stateManager.current?.cleanup();
      stateManager.current = null;
      coordinator.current?.cleanup();
      coordinator.current = null;
      form.current = null;
    });
  }, [addCleanupFn]);

  // Return enhanced API
  return {
    form,
    formState,
    lastSaved: lastSaved.current,
    saveDraft,
    loadLatestDraft,
    isSaving: saveInProgress.current,
    handleTierChange: useCallback(
      (tier, options) => 
        stateManager.current?.handleTierChange(tier, options),
      []
    ),
    selected_plan: tierState,
    coordinate: useCallback(
      (operation, metadata) => 
        coordinator.current?.coordinate(operation, metadata),
      []
    )
  };
};