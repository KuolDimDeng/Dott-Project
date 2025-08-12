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
