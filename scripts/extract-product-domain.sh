#!/bin/bash

# 📦 Extract Product Domain from Massive ProductManagement.js
# This breaks down the 3,176 line file into manageable pieces

echo "📦 EXTRACTING PRODUCT DOMAIN"
echo "============================"

BASE_DIR="/Users/kuoldeng/projectx/frontend/pyfactor_next/src"
PRODUCT_DOMAIN="$BASE_DIR/domains/products"

echo "📋 STEP 1: Create Product Service (API Layer)"
echo "============================================="

cat > "$PRODUCT_DOMAIN/services/productService.js" << 'EOF'
'use client';

import { apiService } from '@/shared/services/apiService';

// Product Service - Extracted from massive apiClient.js
export const productService = {
  // Get all products with optional filtering
  async getAll(params = {}) {
    return apiService.get('/inventory/products', params);
  },

  // Get single product by ID
  async getById(id) {
    return apiService.get(`/inventory/products/${id}`);
  },

  // Create new product
  async create(productData) {
    return apiService.post('/inventory/products', productData);
  },

  // Update existing product
  async update(id, productData) {
    return apiService.put(`/inventory/products/${id}`, productData);
  },

  // Delete product
  async delete(id) {
    return apiService.delete(`/inventory/products/${id}`);
  },

  // Bulk operations
  async bulkUpdate(products) {
    return apiService.post('/inventory/products/bulk-update', { products });
  },

  async bulkDelete(productIds) {
    return apiService.post('/inventory/products/bulk-delete', { ids: productIds });
  },

  // Search products
  async search(query, filters = {}) {
    return apiService.get('/inventory/products/search', { 
      q: query, 
      ...filters 
    });
  },

  // Get product categories
  async getCategories() {
    return apiService.get('/inventory/products/categories');
  },

  // Generate barcode
  async generateBarcode(productId) {
    return apiService.post(`/inventory/products/${productId}/barcode`);
  }
};
EOF

echo "✅ Product service created"

echo ""
echo "📋 STEP 2: Create Product Hooks (State Management)"
echo "================================================="

cat > "$PRODUCT_DOMAIN/hooks/useProducts.js" << 'EOF'
'use client';

import { useState, useEffect, useCallback } from 'react';
import { productService } from '../services/productService';
import { toast } from 'react-hot-toast';

export const useProducts = (initialFilters = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0
  });

  // Fetch products
  const fetchProducts = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await productService.getAll({
        ...filters,
        ...params,
        page: pagination.page,
        page_size: pagination.pageSize
      });
      
      setProducts(response.results || response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.count || response.total || 0
      }));
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load products: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.pageSize]);

  // Create product
  const createProduct = useCallback(async (productData) => {
    try {
      const newProduct = await productService.create(productData);
      setProducts(prev => [newProduct, ...prev]);
      toast.success('Product created successfully');
      return newProduct;
    } catch (err) {
      toast.error(`Failed to create product: ${err.message}`);
      throw err;
    }
  }, []);

  // Update product
  const updateProduct = useCallback(async (id, productData) => {
    try {
      const updatedProduct = await productService.update(id, productData);
      setProducts(prev => 
        prev.map(product => 
          product.id === id ? updatedProduct : product
        )
      );
      toast.success('Product updated successfully');
      return updatedProduct;
    } catch (err) {
      toast.error(`Failed to update product: ${err.message}`);
      throw err;
    }
  }, []);

  // Delete product
  const deleteProduct = useCallback(async (id) => {
    try {
      await productService.delete(id);
      setProducts(prev => prev.filter(product => product.id !== id));
      toast.success('Product deleted successfully');
    } catch (err) {
      toast.error(`Failed to delete product: ${err.message}`);
      throw err;
    }
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  // Load initial data
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    filters,
    pagination,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    updateFilters,
    setPagination
  };
};
EOF

echo "✅ Product hooks created"

echo ""
echo "📋 STEP 3: Create Product Form Hook"
echo "=================================="

cat > "$PRODUCT_DOMAIN/hooks/useProductForm.js" << 'EOF'
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
EOF

echo "✅ Product form hook created"

echo ""
echo "📋 STEP 4: Create Product Types"
echo "=============================="

cat > "$PRODUCT_DOMAIN/types/product.types.js" << 'EOF'
// Product TypeScript-style type definitions (for documentation)

export const ProductTypes = {
  Product: {
    id: 'number',
    name: 'string',
    description: 'string',
    sku: 'string',
    price: 'number',
    cost: 'number',
    category: 'string',
    stock_quantity: 'number',
    min_stock_level: 'number',
    barcode: 'string',
    is_active: 'boolean',
    is_service: 'boolean',
    tax_rate: 'number',
    unit_of_measure: 'string',
    created_at: 'string',
    updated_at: 'string'
  },

  ProductFilter: {
    search: 'string',
    category: 'string',
    is_active: 'boolean',
    is_service: 'boolean',
    min_price: 'number',
    max_price: 'number',
    low_stock: 'boolean'
  },

  ProductFormData: {
    name: 'string',
    description: 'string',
    sku: 'string',
    price: 'string',
    cost: 'string',
    category: 'string',
    stock_quantity: 'string',
    min_stock_level: 'string',
    barcode: 'string',
    is_active: 'boolean',
    is_service: 'boolean',
    tax_rate: 'string',
    unit_of_measure: 'string'
  }
};

export const UNIT_OF_MEASURE_OPTIONS = [
  'each',
  'hour',
  'kilogram',
  'gram',
  'liter',
  'milliliter',
  'meter',
  'centimeter',
  'square_meter',
  'cubic_meter'
];

export const PRODUCT_CATEGORIES = [
  'Electronics',
  'Clothing',
  'Food & Beverage',
  'Services',
  'Software',
  'Hardware',
  'Office Supplies',
  'Other'
];
EOF

echo "✅ Product types created"

echo ""
echo "📋 STEP 5: Update Domain Index Files"
echo "==================================="

cat > "$PRODUCT_DOMAIN/hooks/index.js" << 'EOF'
// Product hooks
export { useProducts } from './useProducts';
export { useProductForm } from './useProductForm';
EOF

cat > "$PRODUCT_DOMAIN/services/index.js" << 'EOF'
// Product services
export { productService } from './productService';
EOF

cat > "$PRODUCT_DOMAIN/index.js" << 'EOF'
// Product domain exports
export * from './hooks';
export * from './services';
export * from './types';
// Components will be exported when created
// export * from './components';
EOF

echo "✅ Domain index files updated"

echo ""
echo "✅ PRODUCT DOMAIN EXTRACTION COMPLETE"
echo "===================================="
echo ""
echo "📁 Created files:"
echo "   - domains/products/services/productService.js (API layer)"
echo "   - domains/products/hooks/useProducts.js (state management)"
echo "   - domains/products/hooks/useProductForm.js (form logic)"
echo "   - domains/products/types/product.types.js (type definitions)"
echo ""
echo "🎯 NEXT STEPS:"
echo "1. Create ProductManagement component using these hooks"
echo "2. Break down the massive 3,176 line file into smaller components"
echo "3. Test the new structure works"
echo ""
echo "📋 USAGE EXAMPLE:"
echo "   import { useProducts, useProductForm } from '@/domains/products';"
echo "   import { productService } from '@/domains/products';"
echo ""
echo "💡 This structure reduces the ProductManagement.js file from 3,176 lines"
echo "   to manageable components of ~200-300 lines each!"