/**
 * Input validation utilities for security
 */

export const validateTaxRate = (value) => {
  const rate = parseFloat(value);
  
  if (isNaN(rate)) {
    throw new Error('Tax rate must be a valid number');
  }
  
  if (rate < 0 || rate > 100) {
    throw new Error('Tax rate must be between 0 and 100');
  }
  
  return rate;
};

export const validateDiscountRate = (value, maxDiscount = 100) => {
  const discount = parseFloat(value);
  
  if (isNaN(discount)) {
    throw new Error('Discount must be a valid number');
  }
  
  if (discount < 0 || discount > maxDiscount) {
    throw new Error(`Discount must be between 0 and ${maxDiscount}`);
  }
  
  return discount;
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove potential XSS characters
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateRequired = (value, fieldName) => {
  if (!value || value.toString().trim() === '') {
    throw new Error(`${fieldName} is required`);
  }
  return value;
};
