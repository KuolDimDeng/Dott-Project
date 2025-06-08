import axios from 'axios';
import { API_URL } from './config';
import { handleApiError } from './errorHandler';

// Fetch payroll settings for the current business
export const fetchPayrollSettings = async () => {
  try {
    const response = await axios.get(`${API_URL}/payroll/settings/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching payroll settings:', error);
    throw handleApiError(error);
  }
};

// Save payroll settings based on setting type
export const savePayrollSettings = async (settings, settingType) => {
  try {
    let endpoint = '';
    let data = {};
    
    switch (settingType) {
      case 'tax':
        endpoint = '/payroll/settings/tax/';
        data = { tax_id: settings.taxId, country: settings.country };
        break;
      case 'admin':
        endpoint = '/payroll/settings/admin/';
        data = { admin_id: settings.adminId };
        break;
      case 'authorized':
        endpoint = '/payroll/settings/authorized/';
        data = { user_ids: settings.authorizedUsers };
        break;
      case 'schedule':
        endpoint = '/payroll/settings/schedule/';
        data = { 
          frequency: settings.frequency,
          pay_day: settings.payDay,
          auto_run: settings.autoRun,
          calculate_taxes: settings.calculateTaxes
        };
        break;
      default:
        throw new Error('Invalid setting type');
    }
    
    const response = await axios.post(`${API_URL}${endpoint}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error saving ${settingType} settings:`, error);
    throw handleApiError(error);
  }
};

// Fetch scheduled payrolls
export const fetchScheduledPayrolls = async () => {
  try {
    const response = await axios.get(`${API_URL}/payroll/scheduled/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching scheduled payrolls:', error);
    throw handleApiError(error);
  }
};

// Create a new payroll run
export const createPayrollRun = async (payrollData) => {
  try {
    const response = await axios.post(`${API_URL}/payroll/run/`, payrollData);
    return response.data;
  } catch (error) {
    console.error('Error creating payroll run:', error);
    throw handleApiError(error);
  }
};

// Update payroll run status
export const updatePayrollRunStatus = async (runId, status) => {
  try {
    const response = await axios.patch(`${API_URL}/payroll/run/${runId}/`, {
      status
    });
    return response.data;
  } catch (error) {
    console.error('Error updating payroll run status:', error);
    throw handleApiError(error);
  }
};

// Create Stripe payment intent for processing payroll
export const createStripePaymentIntent = async (runId, accountId) => {
  try {
    const response = await axios.post(`${API_URL}/payroll/stripe/payment-intent/`, {
      run_id: runId,
      account_id: accountId
    });
    return response.data;
  } catch (error) {
    console.error('Error creating Stripe payment intent:', error);
    throw handleApiError(error);
  }
};

// Confirm Stripe payment
export const confirmStripePayment = async (paymentIntentId, runId) => {
  try {
    const response = await axios.post(`${API_URL}/payroll/stripe/confirm-payment/`, {
      payment_intent_id: paymentIntentId,
      run_id: runId
    });
    return response.data;
  } catch (error) {
    console.error('Error confirming Stripe payment:', error);
    throw handleApiError(error);
  }
};

// Fetch connected bank accounts from Stripe
export const fetchConnectedAccounts = async () => {
  try {
    const response = await axios.get(`${API_URL}/payroll/stripe/accounts/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching connected accounts:', error);
    throw handleApiError(error);
  }
};

// Add a new connected account
export const createConnectedAccount = async () => {
  try {
    const response = await axios.post(`${API_URL}/payroll/stripe/connect/`);
    return response.data;
  } catch (error) {
    console.error('Error creating connected account:', error);
    throw handleApiError(error);
  }
};

// Get payroll run by ID
export const getPayrollRunById = async (runId) => {
  try {
    const response = await axios.get(`${API_URL}/payroll/run/${runId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching payroll run:', error);
    throw handleApiError(error);
  }
};

// Get employee payroll data
export const getEmployeePayrollData = async () => {
  try {
    const response = await axios.get(`${API_URL}/employees/payroll-eligible/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching employee payroll data:', error);
    throw handleApiError(error);
  }
};

// Get business country information
export const getBusinessCountry = async () => {
  try {
    const response = await axios.get(`${API_URL}/business/country/`);
    return response.data.country;
  } catch (error) {
    console.error('Error fetching business country:', error);
    throw handleApiError(error);
  }
}; 