export interface Step1FormData {
    businessName: string;
    industry: string;
    country: string;
    legalStructure: string;
    dateFounded: string;
    firstName: string;
    lastName: string;
    email?: string; // Optional since it comes from session
  }
  
  export interface Step1Props {
    metadata: {
      title: string;
      description: string;
      nextStep?: string;
      prevStep?: string;
      isRequired?: boolean;
    };
  }
  
  export type Step1FormErrors = Partial<Record<keyof Step1FormData, string>>;
  
  export interface Step1FormMethods {
    setValue: (name: keyof Step1FormData, value: string) => void;
    getValues: () => Step1FormData;
    formState: {
      isDirty: boolean;
      errors: Step1FormErrors;
    };
  }