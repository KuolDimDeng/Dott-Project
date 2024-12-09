// /src/app/onboarding/components/Step4/Step4.types.ts
export interface Step4Props {
    metadata: {
      title: string;
      description: string;
      nextStep?: string;
      prevStep?: string;
    };
    onBack: () => void;
    initialized?: boolean;
  }
  
  export interface ProgressStep {
    progress: number;
    step: string;
    description: string;
  }
  
  export interface WebSocketMessage {
    type: 'connection_established' | 'progress';
    progress?: number;
    step?: string;
    status?: string;
    database_name?: string;
  }
  
  export interface SetupState {
    progress: number;
    currentStep: string;
    isComplete: boolean;
    error: string | null;
  }