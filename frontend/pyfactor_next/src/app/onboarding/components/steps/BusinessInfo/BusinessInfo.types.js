// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/BusinessInfo/BusinessInfo.types.js
export const businessInfoPropTypes = {
    metadata: {
      title: 'string',
      description: 'string',
      nextStep: 'string?',
      prevStep: 'string?'
    }
  };


  
  export const businessInfoDefaultValues = {
    businessName: '',
    industry: '',
    country: '',
    legalStructure: '',
    dateFounded: new Date().toISOString().split('T')[0],
    firstName: '',
    lastName: ''
  };
  
  export const businessInfoValidation = {
    businessName: {
      required: 'Business name is required',
      maxLength: {
        value: 100,
        message: 'Business name cannot exceed 100 characters'
      }
    },
    industry: {
      required: 'Industry is required'
    },
    country: {
      required: 'Country is required'
    },
    legalStructure: {
      required: 'Legal structure is required'
    },
    dateFounded: {
      required: 'Date founded is required',
      pattern: {
        value: /^\d{4}-\d{2}-\d{2}$/,
        message: 'Invalid date format'
      }
    },
    firstName: {
      required: 'First name is required',
      maxLength: {
        value: 50,
        message: 'First name cannot exceed 50 characters'
      }
    },
    lastName: {
      required: 'Last name is required',
      maxLength: {
        value: 50,
        message: 'Last name cannot exceed 50 characters'
      }
    }
  };