// /src/app/onboarding/components/Step2/Step2.types.ts

// Basic type definitions with descriptive comments
export type PlanType = 'Basic' | 'Professional';
export type BillingCycleType = 'monthly' | 'annual';

// Interface for validation options
export interface ValidationOptions {
    shouldValidate?: boolean;
    shouldDirty?: boolean;
    shouldTouch?: boolean;
}

// Form data structure with optional metadata
export interface Step2FormData {
    selectedPlan: PlanType;
    billingCycle: BillingCycleType;
    timestamp?: number;
    _debug_timestamp?: number; // For debugging purposes
}

// Component props with strict metadata requirements
export interface Step2Props {
    metadata: {
        title: string;
        description: string;
        nextStep?: string;
        prevStep?: string;
        isRequired?: boolean;
    };
}

// Price configuration with strict typing
export interface PricingConfig {
    monthly: string | number;
    annual: string | number;
}

// Enhanced plan tier definition
export interface PlanTier {
    title: PlanType;
    subheader?: string;
    price: Record<BillingCycleType, string>;
    description: string[];
    buttonText: string;
    buttonVariant: 'outlined' | 'contained';
    featured?: boolean;
    disabled?: boolean;
}

// Form error structure
export type Step2FormErrors = {
    [K in keyof Step2FormData]?: string;
}

// Form state interface
export interface FormState {
    isDirty: boolean;
    isValid: boolean;
    errors: Step2FormErrors;
    isSubmitting: boolean;
    isSubmitted?: boolean;
    submitCount?: number;
}

// Enhanced form methods interface
export interface Step2FormMethods {
    setValue: <T extends keyof Step2FormData>(
        name: T,
        value: Step2FormData[T],
        options?: ValidationOptions
    ) => void;
    
    getValues: <T extends keyof Step2FormData>(
        name?: T
    ) => T extends keyof Step2FormData ? Step2FormData[T] : Step2FormData;
    
    watch: <T extends keyof Step2FormData>(
        name?: T | T[]
    ) => T extends keyof Step2FormData ? Step2FormData[T] : Partial<Step2FormData>;
    
    formState: FormState;
    
    reset: (values?: Partial<Step2FormData>, options?: {
        keepErrors?: boolean;
        keepDirty?: boolean;
        keepValues?: boolean;
        keepDefaultValues?: boolean;
        keepIsSubmitted?: boolean;
        keepTouched?: boolean;
        keepIsValid?: boolean;
        keepSubmitCount?: boolean;
    }) => void;
    
    trigger: (name?: keyof Step2FormData) => Promise<boolean>;
}

// Loading state interface
export interface LoadingState {
    isLoading: boolean;
    message?: string;
    progress?: number;
}

// Submission response type
export interface SubmissionResponse {
    success: boolean;
    message?: string;
    data?: Partial<Step2FormData>;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
}

// Error state interface
export interface ErrorState {
    message: string;
    code?: string;
    details?: unknown;
    timestamp?: number;
}

// Initialization state interface
export interface InitializationState {
    isInitializing: boolean;
    isInitialized: boolean;
    error: ErrorState | null;
    reset: () => Promise<void>;
}