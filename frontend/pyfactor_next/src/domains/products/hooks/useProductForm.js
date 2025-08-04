'use client';

import { useState, useCallback } from 'react';

const initialProductState = {
  name: '',
  description: '',
  sku: '',
  price: '',
  cost: '',
  category: '',
  stock_quantity: '',
  min_stock_level: '',
  barcode: '',
  is_active: true,
  is_service: false,
  tax_rate: '',
  unit_of_measure: 'each'
};

export const useProductForm = (initialProduct = null) => {
  const [formData, setFormData] = useState(
    initialProduct || initialProductState
  );
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Update form field
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.price || parseFloat(formData.price) < 0) {
      newErrors.price = 'Valid price is required';
    }

    if (formData.cost && parseFloat(formData.cost) < 0) {
      newErrors.cost = 'Cost must be positive';
    }

    if (formData.stock_quantity && parseInt(formData.stock_quantity) < 0) {
      newErrors.stock_quantity = 'Stock quantity must be positive';
    }

    if (formData.min_stock_level && parseInt(formData.min_stock_level) < 0) {
      newErrors.min_stock_level = 'Minimum stock level must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(initialProduct || initialProductState);
    setErrors({});
    setIsDirty(false);
  }, [initialProduct]);

  // Check if form is valid
  const isValid = Object.keys(errors).length === 0 && formData.name?.trim();

  return {
    formData,
    errors,
    isDirty,
    isValid,
    updateField,
    validateForm,
    resetForm,
    setFormData,
    setErrors
  };
};
