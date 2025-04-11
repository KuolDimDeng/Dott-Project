/**
 * Utilities for formatting dates, currencies, and numbers
 */
import { format, parseISO } from 'date-fns';

/**
 * Format a date with the specified format
 * @param {Date|string} date - The date to format
 * @param {string} formatString - The format string (default: 'MM/dd/yyyy')
 * @returns {string} - The formatted date string
 */
export const dateFormat = (date, formatString = 'MM/dd/yyyy') => {
  if (!date) return '';
  
  try {
    // If date is a string, parse it first
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Date formatting error:', error);
    return String(date);
  }
};

/**
 * Format a date and time
 * @param {Date|string} date - The date to format
 * @param {string} formatString - The format string (default: 'MM/dd/yyyy hh:mm a')
 * @returns {string} - The formatted date and time string
 */
export const dateTimeFormat = (date, formatString = 'MM/dd/yyyy hh:mm a') => {
  return dateFormat(date, formatString);
};

/**
 * Format a number with the specified number of decimal places
 * @param {number} value - The number to format
 * @param {number} decimals - The number of decimal places (default: 2)
 * @returns {string} - The formatted number
 */
export const numberFormat = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  
  return Number(value).toFixed(decimals);
};

/**
 * Format a currency amount
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - The currency code (default: 'USD')
 * @param {string} locale - The locale (default: navigator's language)
 * @returns {string} - The formatted currency string
 */
export const currencyFormat = (amount, currencyCode = 'USD', locale = 'en-US') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'N/A';
  }
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    console.error('Currency formatting error:', error);
    // Fallback to a simple format
    return `${currencyCode} ${Number(amount).toFixed(2)}`;
  }
};

/**
 * Format a percentage
 * @param {number} value - The value to format as a percentage
 * @param {number} decimals - The number of decimal places (default: 2)
 * @returns {string} - The formatted percentage string
 */
export const percentFormat = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  
  return `${Number(value).toFixed(decimals)}%`;
};

/**
 * Format a phone number
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} - The formatted phone number
 */
export const phoneFormat = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX for US numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Return the original format if we can't parse it
  return phoneNumber;
};

/**
 * Format file size in bytes to human-readable format
 * @param {number} bytes - The file size in bytes
 * @returns {string} - The formatted file size
 */
export const fileSizeFormat = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}; 