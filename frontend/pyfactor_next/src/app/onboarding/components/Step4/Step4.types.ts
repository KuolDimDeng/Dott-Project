// /src/app/onboarding/components/Step4/Step4.types.ts
export interface Step4Props {
  metadata: {
    title: string;
    description: string;
    nextStep?: string;
    prevStep?: string;
    apiEndpoint: string; // Add this
  };
  onBack: () => void;
  initialized?: boolean;
  formData?: any; // Add this
  session: any; // Add this
}

// Add this interface
export interface SetupResponse {
  status: string;
  taskId: string;
  task_status?: TaskStatus;
  task_info?: {
    status: string;
    database_name?: string;
    message?: string;
  };
}

// Add task status type
export interface TaskStatus {
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  database_name?: string;
  message?: string;
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
