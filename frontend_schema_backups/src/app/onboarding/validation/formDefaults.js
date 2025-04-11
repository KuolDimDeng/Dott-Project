// src/app/onboarding/validation/formDefaults.js
export const defaultFormValues = {
    businessName: '',
    industry: '',
    country: '',
    legalStructure: '',
    dateFounded: new Date().toISOString().split('T')[0],
    firstName: '',
    lastName: ''
  };
  
  export const formFieldTypes = {
    businessName: 'text',
    industry: 'select',
    country: 'select',
    legalStructure: 'select',
    dateFounded: 'date',
    firstName: 'text',
    lastName: 'text'
  };