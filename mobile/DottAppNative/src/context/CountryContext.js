import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCountryConfig, getPaymentMethods, getVehicleTypes, formatCurrency } from '../config/countryConfigurations';

const CountryContext = createContext();

export const useCountry = () => {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
};

export const CountryProvider = ({ children }) => {
  const [currentCountry, setCurrentCountry] = useState('SS'); // Default to South Sudan
  const [loading, setLoading] = useState(true);

  // Load saved country preference on app start
  useEffect(() => {
    loadCountryPreference();
  }, []);

  const loadCountryPreference = async () => {
    try {
      const savedCountry = await AsyncStorage.getItem('selectedCountry');
      if (savedCountry) {
        setCurrentCountry(savedCountry);
      }
    } catch (error) {
      console.log('Error loading country preference:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeCountry = async (countryCode) => {
    try {
      await AsyncStorage.setItem('selectedCountry', countryCode);
      setCurrentCountry(countryCode);
      
      console.log(`Country changed to: ${countryCode}`);
    } catch (error) {
      console.error('Error saving country preference:', error);
    }
  };

  // Get current country configuration
  const getConfig = () => {
    return getCountryConfig(currentCountry);
  };

  // Get payment methods for current country
  const getPayments = () => {
    return getPaymentMethods(currentCountry);
  };

  // Get delivery vehicles for current country
  const getVehicles = () => {
    return getVehicleTypes(currentCountry);
  };

  // Format currency for current country
  const formatPrice = (amount) => {
    return formatCurrency(amount, currentCountry);
  };

  // Get primary payment method (first in the list)
  const getPrimaryPayment = () => {
    const payments = getPayments();
    return payments[0] || null;
  };

  // Check if a specific payment method is available
  const isPaymentAvailable = (paymentId) => {
    const payments = getPayments();
    return payments.some(payment => payment.id === paymentId);
  };

  // Get payment method by ID
  const getPaymentById = (paymentId) => {
    const payments = getPayments();
    return payments.find(payment => payment.id === paymentId) || null;
  };

  // Check if a specific vehicle type is available
  const isVehicleAvailable = (vehicleId) => {
    const vehicles = getVehicles();
    return vehicles.some(vehicle => vehicle.id === vehicleId);
  };

  // Get vehicle type by ID
  const getVehicleById = (vehicleId) => {
    const vehicles = getVehicles();
    return vehicles.find(vehicle => vehicle.id === vehicleId) || null;
  };

  const value = {
    // State
    currentCountry,
    loading,
    
    // Configuration getters
    config: getConfig(),
    payments: getPayments(),
    vehicles: getVehicles(),
    
    // Actions
    changeCountry,
    formatPrice,
    
    // Utility functions
    getPrimaryPayment,
    isPaymentAvailable,
    getPaymentById,
    isVehicleAvailable,
    getVehicleById,
  };

  return (
    <CountryContext.Provider value={value}>
      {children}
    </CountryContext.Provider>
  );
};

export default CountryContext;