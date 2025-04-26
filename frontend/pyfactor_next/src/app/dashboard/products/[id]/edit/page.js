'use client';

import withPageAccess from '../../components/withPageAccess';
import { PAGE_ACCESS } from '@/utils/pageAccess';
import React, { useState, useEffect } from 'react';
import ProductForm from '../../components/ProductForm';
import { useParams } from 'next/navigation';

function EditProductPage() {
  const params = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch product');
        }
        const data = await response.json();
        setProduct(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">
          Edit Product: {product?.name}
        </h1>
      </div>
      <ProductForm mode="edit" product={product} />
    </div>
  );
}

// Wrap the component with page access control
export default withPageAccess(EditProductPage, PAGE_ACCESS.PRODUCTS);
