'use client';

import React from 'react';
import { Typography, Button } from '@/shared/components/ui';
import { useProducts } from '../hooks/useProducts';

// Simple test component to validate the new architecture
const ProductTest = () => {
  const { products, loading, error } = useProducts();

  return (
    <div className="p-4">
      <Typography variant="h5" gutterBottom>
        Product Architecture Test
      </Typography>
      
      {loading && <Typography variant="body2">Loading products...</Typography>}
      {error && <Typography variant="body2" color="error">Error: {error}</Typography>}
      
      <Typography variant="body2" color="textSecondary">
        Products loaded: {products.length}
      </Typography>
      
      <Button variant="primary" size="small" className="mt-2">
        Test Button
      </Button>
    </div>
  );
};

export default ProductTest;
