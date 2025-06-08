/**
 * HTTPS Configuration Utility
 * 
 * This file configures Axios and other HTTP clients to work with HTTPS using self-signed certificates.
 * It also provides utilities to reset circuit breakers and handle HTTPS-related errors.
 */

import axios from 'axios';
import https from 'https';
import { logger } from './logger';
import { resetCircuitBreakers } from './axiosConfig';

/**
 * Configure global axios defaults to accept self-signed certificates
 * This should be called once at application startup
 */
export function configureHttpsDefaults() {
  // Only run on client side
  if (typeof window === 'undefined') return;

  // Create https agent that accepts self-signed certificates
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false // Accept self-signed certificates
  });

  // Set axios defaults
  axios.defaults.httpsAgent = httpsAgent;
  
  // Log configuration
  logger.info('[HTTPS] Configured axios to accept self-signed certificates');
  
  // Reset any circuit breakers that might have been triggered
  resetCircuitBreakers();
  
  // Add window object to track HTTPS enablement
  window.__HTTPS_ENABLED = true;
  
  return true;
}

/**
 * Reset all circuit breakers and configure HTTPS
 * This is useful when switching between HTTP and HTTPS
 */
export function resetHttpsConfiguration() {
  // Reset all circuit breakers
  resetCircuitBreakers();
  
  // Configure HTTPS defaults
  configureHttpsDefaults();
  
  logger.info('[HTTPS] Reset configuration and circuit breakers');
  
  return true;
}

/**
 * Create a configured axios instance that accepts self-signed certificates
 */
export function createHttpsAxiosInstance(config = {}) {
  // Create https agent that accepts self-signed certificates
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false // Accept self-signed certificates
  });
  
  // Create and return the instance
  return axios.create({
    ...config,
    httpsAgent
  });
}

export default {
  configureHttpsDefaults,
  resetHttpsConfiguration,
  createHttpsAxiosInstance
}; 