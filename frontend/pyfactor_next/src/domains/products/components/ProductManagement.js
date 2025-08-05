'use client';

import React, { Suspense } from 'react';
import { Typography, Button } from '@/shared/components/ui';
import { useProducts, useProductForm } from '../hooks';
import StandardSpinner from '@/components/ui/StandardSpinner';

// Import other components that will be created
const ProductTable = React.lazy(() => import('./ProductTable'));
const ProductForm = React.lazy(() => import('./ProductForm'));
const ProductFilters = React.lazy(() => import('./ProductFilters'));

/**
 * ProductManagement - Main container component
 * Reduced from 3,176 lines to ~200 lines using domain architecture
 */
const ProductManagement = ({ 
  isOpen = false, 
  onClose = () => {}, 
  mode = 'list' 
}) => {
  const { 
    products, 
    loading, 
    error, 
    createProduct, 
    updateProduct, 
    deleteProduct,
    filters,
    updateFilters 
  } = useProducts();

  const {
    formData,
    errors: formErrors,
    updateField,
    validateForm,
    resetForm,
    isValid
  } = useProductForm();

  const [selectedProduct, setSelectedProduct] = React.useState(null);
  const [showForm, setShowForm] = React.useState(false);
  const [formMode, setFormMode] = React.useState('create'); // 'create' or 'edit'

  // Handle product creation
  const handleCreateProduct = async (productData) => {
    try {
      await createProduct(productData);
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create product:', error);
    }
  };

  // Handle product update
  const handleUpdateProduct = async (id, productData) => {
    try {
      await updateProduct(id, productData);
      setShowForm(false);
      setSelectedProduct(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  // Handle product deletion
  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
      } catch (error) {
        console.error('Failed to delete product:', error);
      }
    }
  };

  // Handle edit product
  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setFormMode('edit');
    setShowForm(true);
  };

  // Handle new product
  const handleNewProduct = () => {
    setSelectedProduct(null);
    setFormMode('create');
    setShowForm(true);
    resetForm();
  };

  if (error) {
    return (
      <div className="p-6">
        <Typography variant="h4" color="error" gutterBottom>
          Error Loading Products
        </Typography>
        <Typography variant="body1" color="textSecondary">
          {error}
        </Typography>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <Typography variant="h4" gutterBottom>
            Product Management
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage your product inventory and pricing
          </Typography>
        </div>
        <Button 
          variant="primary" 
          onClick={handleNewProduct}
          disabled={loading}
        >
          Add Product
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {showForm ? (
          <Suspense fallback={<StandardSpinner />}>
            <ProductForm
              product={selectedProduct}
              mode={formMode}
              onSave={formMode === 'create' ? handleCreateProduct : handleUpdateProduct}
              onCancel={() => {
                setShowForm(false);
                setSelectedProduct(null);
                resetForm();
              }}
              formData={formData}
              errors={formErrors}
              updateField={updateField}
              validateForm={validateForm}
              isValid={isValid}
            />
          </Suspense>
        ) : (
          <>
            {/* Filters */}
            <Suspense fallback={<div className="h-16 bg-gray-100 rounded mb-4 animate-pulse" />}>
              <ProductFilters
                filters={filters}
                onFiltersChange={updateFilters}
                className="mb-6"
              />
            </Suspense>

            {/* Products Table */}
            <Suspense fallback={<StandardSpinner />}>
              <ProductTable
                products={products}
                loading={loading}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
                onView={(product) => {
                  // Handle product view logic
                  console.log('View product:', product);
                }}
              />
            </Suspense>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductManagement;
