import React, { useState, useEffect, useRef } from 'react';
import { unifiedInventoryService } from '@/services/unifiedInventoryService';
import { logger } from '@/utils/logger';
import {
  PhotoCamera,
  DeleteIcon,
  InfoOutlinedIcon,
  InventoryIcon2 as InventoryIcon,
  LocalOfferIcon,
  StorageIcon,
  DetailsIcon,
  CloseIcon
} from '@/app/components/icons';

/**
 * Enhanced Product Form Component with Tailwind CSS
 * Provides a comprehensive form for creating and editing products
 * with validation, image upload support, and multi-section organization
 */
const ProductForm = ({ open, onClose, product = null, isEdit = false }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  
  // Form field values
  const [formData, setFormData] = useState({
    name: '',
    product_code: '',
    description: '',
    price: '',
    cost_price: '',
    tax_rate: '',
    stock_quantity: '',
    reorder_level: '',
    category_id: '',
    supplier_id: '',
    location_id: '',
    is_active: true,
    weight: '',
    weight_unit: 'kg',
    dimensions: '',
    barcode: '',
    sku: '',
    image_file: null
  });
  
  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({});
  
  // Initialize form data when editing a product
  useEffect(() => {
    if (isEdit && product) {
      const initialData = {
        ...product,
        price: product.price || '',
        cost_price: product.cost_price || '',
        tax_rate: product.tax_rate || '',
        stock_quantity: product.stock_quantity || '',
        reorder_level: product.reorder_level || '',
        image_file: null
      };
      
      setFormData(initialData);
      
      // Set image preview if product has an image
      if (product.image_url) {
        setImagePreview(product.image_url);
      }
    }
    
    // Load reference data
    fetchReferenceData();
  }, [isEdit, product]);
  
  // Fetch categories, suppliers, and locations
  const fetchReferenceData = async () => {
    try {
      const categoriesData = await unifiedInventoryService.getCategories();
      setCategories(categoriesData || []);
      
      // These would be implemented in the actual service
      // const suppliersData = await unifiedInventoryService.getSuppliers();
      // setSuppliers(suppliersData || []);
      
      // const locationsData = await unifiedInventoryService.getLocations();
      // setLocations(locationsData || []);
      
      // Mock data for now
      setSuppliers([
        { id: 1, name: 'Supplier A' },
        { id: 2, name: 'Supplier B' },
        { id: 3, name: 'Supplier C' },
      ]);
      
      setLocations([
        { id: 1, name: 'Warehouse A' },
        { id: 2, name: 'Warehouse B' },
        { id: 3, name: 'Showroom' },
        { id: 4, name: 'Online Store' },
      ]);
    } catch (error) {
      logger.error('Error fetching reference data:', error);
      setError('Failed to load reference data');
    }
  };
  
  // Handle input changes
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    
    // Handle switch/checkbox inputs
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }
    
    // For numeric fields, ensure they're valid numbers
    if (['price', 'cost_price', 'tax_rate', 'stock_quantity', 'reorder_level', 'weight'].includes(name)) {
      // Allow empty value or valid number
      if (value === '' || (!isNaN(parseFloat(value)) && value >= 0)) {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
      return;
    }
    
    // Handle other inputs
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for this field if exists
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Handle image upload
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setValidationErrors(prev => ({
        ...prev,
        image_file: 'Please upload a valid image file (JPEG, PNG, GIF, WEBP)'
      }));
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setValidationErrors(prev => ({
        ...prev,
        image_file: 'Image file size should be less than 5MB'
      }));
      return;
    }
    
    // Update form data and preview
    setFormData(prev => ({
      ...prev,
      image_file: file
    }));
    
    // Generate preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
    
    // Clear validation error
    setValidationErrors(prev => ({
      ...prev,
      image_file: null
    }));
  };
  
  // Remove image
  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image_file: null
    }));
    setImagePreview(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handle tab change
  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
  };
  
  // Validate form
  const validateForm = () => {
    const errors = {};
    
    // Required fields
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Product name is required';
    } else if (formData.name.length > 100) {
      errors.name = 'Product name should be less than 100 characters';
    }
    
    if (formData.price !== '' && (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0)) {
      errors.price = 'Price must be a positive number';
    }
    
    if (formData.cost_price !== '' && (isNaN(parseFloat(formData.cost_price)) || parseFloat(formData.cost_price) < 0)) {
      errors.cost_price = 'Cost price must be a positive number';
    }
    
    if (formData.tax_rate !== '' && (isNaN(parseFloat(formData.tax_rate)) || parseFloat(formData.tax_rate) < 0 || parseFloat(formData.tax_rate) > 100)) {
      errors.tax_rate = 'Tax rate must be between 0 and 100';
    }
    
    if (formData.stock_quantity !== '' && (isNaN(parseInt(formData.stock_quantity)) || parseInt(formData.stock_quantity) < 0)) {
      errors.stock_quantity = 'Stock quantity must be a non-negative integer';
    }
    
    if (formData.reorder_level !== '' && (isNaN(parseInt(formData.reorder_level)) || parseInt(formData.reorder_level) < 0)) {
      errors.reorder_level = 'Reorder level must be a non-negative integer';
    }
    
    if (formData.description && formData.description.length > 1000) {
      errors.description = 'Description should be less than 1000 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    // Validate form first
    if (!validateForm()) {
      // Find the tab containing the first error
      const errorFields = Object.keys(validationErrors);
      if (errorFields.length > 0) {
        const firstErrorField = errorFields[0];
        
        // Basic tab mapping - customize based on your form fields
        const basicInfoFields = ['name', 'product_code', 'description', 'category_id', 'image_file'];
        const pricingFields = ['price', 'cost_price', 'tax_rate'];
        const inventoryFields = ['stock_quantity', 'reorder_level', 'supplier_id', 'location_id'];
        
        if (basicInfoFields.includes(firstErrorField)) {
          setActiveTab(0);
        } else if (pricingFields.includes(firstErrorField)) {
          setActiveTab(1);
        } else if (inventoryFields.includes(firstErrorField)) {
          setActiveTab(2);
        } else {
          setActiveTab(3);
        }
      }
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Debug logs to track product creation
      console.log('DEBUG: ProductForm - Product submission initiated', {
        isEdit,
        productData: { ...formData, image_file: formData.image_file ? "File attached" : null }
      });
      
      // Create or update product
      if (isEdit) {
        console.log(`DEBUG: ProductForm - Updating product ${product.id}`);
        await unifiedInventoryService.updateProduct(product.id, formData);
        console.log(`DEBUG: ProductForm - Product ${product.id} updated successfully`);
      } else {
        console.log('DEBUG: ProductForm - Creating new product');
        const result = await unifiedInventoryService.createProduct(formData);
        console.log('DEBUG: ProductForm - Product created successfully', result);
      }
      
      // Close dialog and refresh list
      console.log('DEBUG: ProductForm - Closing dialog with refresh=true');
      onClose(true);
    } catch (error) {
      console.error('DEBUG: ProductForm - Error saving product:', error);
      logger.error('Error saving product:', error);
      setError('Failed to save product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  
  const tabItems = [
    { label: 'Basic Info', icon: <DetailsIcon /> },
    { label: 'Pricing', icon: <LocalOfferIcon /> },
    { label: 'Inventory', icon: <InventoryIcon /> },
    { label: 'Additional Details', icon: <StorageIcon /> }
  ];
  
  return (
    <div className="absolute inset-0 z-50 overflow-y-auto" aria-labelledby="product-form-dialog" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={!loading ? () => onClose() : undefined}></div>
        
        {/* Dialog position */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        {/* Dialog panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          {/* Dialog header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
            <div className="flex items-center">
              <InventoryIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {isEdit ? 'Edit Product' : 'Add New Product'}
              </h3>
            </div>
          </div>
          
          {/* Dialog content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded-md">
                {error}
              </div>
            )}
            
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
              <div className="flex -mb-px overflow-x-auto">
                {tabItems.map((item, index) => (
                  <button
                    key={index}
                    className={`flex items-center py-2 px-4 text-sm font-medium border-b-2 ${
                      activeTab === index
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                    onClick={() => handleTabChange(index)}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Basic Info Tab */}
            {activeTab === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    className={`mt-1 block w-full rounded-md ${
                      validationErrors.name 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                    } shadow-sm dark:bg-gray-700 dark:text-white sm:text-sm`}
                    value={formData.name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {validationErrors.name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.name}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="product_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Product Code
                  </label>
                  <input
                    type="text"
                    name="product_code"
                    id="product_code"
                    className={`mt-1 block w-full rounded-md ${
                      validationErrors.product_code 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                    } shadow-sm dark:bg-gray-700 dark:text-white sm:text-sm`}
                    value={formData.product_code}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {validationErrors.product_code ? (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.product_code}</p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Leave blank to auto-generate</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <select
                    name="category_id"
                    id="category_id"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    value={formData.category_id}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">None</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows="4"
                    className={`mt-1 block w-full rounded-md ${
                      validationErrors.description 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                    } shadow-sm dark:bg-gray-700 dark:text-white sm:text-sm`}
                    value={formData.description}
                    onChange={handleChange}
                    disabled={loading}
                  ></textarea>
                  {validationErrors.description && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.description}</p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Product Image
                  </label>
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    {imagePreview ? (
                      <div className="relative w-36 h-36">
                        <img
                          src={imagePreview}
                          alt="Product"
                          className="w-full h-full object-contain border border-gray-300 dark:border-gray-600 rounded-md"
                        />
                        <button
                          className="absolute top-0 right-0 bg-white dark:bg-gray-800 rounded-full p-1 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={handleRemoveImage}
                          disabled={loading}
                          type="button"
                        >
                          <DeleteIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="sr-only">Remove image</span>
                        </button>
                      </div>
                    ) : (
                      <div className="w-36 h-36 border border-dashed border-gray-300 dark:border-gray-600 rounded-md flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-700">
                        <PhotoCamera className="w-8 h-8 text-gray-400" />
                        <span className="mt-2 text-xs text-gray-500 dark:text-gray-400">No image</span>
                      </div>
                    )}
                    
                    <div className="flex flex-col">
                      <input
                        accept="image/*"
                        className="hidden"
                        id="image-upload"
                        ref={fileInputRef}
                        type="file"
                        onChange={handleImageChange}
                        disabled={loading}
                      />
                      <label htmlFor="image-upload">
                        <button
                          type="button"
                          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={loading}
                        >
                          <PhotoCamera className="w-4 h-4 mr-2" />
                          {imagePreview ? 'Change Image' : 'Upload Image'}
                        </button>
                      </label>
                      
                      {validationErrors.image_file && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.image_file}</p>
                      )}
                      
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Max size: 5MB. Formats: JPEG, PNG, GIF, WEBP
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Pricing Tab */}
            {activeTab === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Selling Price
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                    </div>
                    <input
                      type="text"
                      name="price"
                      id="price"
                      className={`block w-full pl-7 rounded-md ${
                        validationErrors.price 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                      } shadow-sm dark:bg-gray-700 dark:text-white sm:text-sm`}
                      value={formData.price}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                  {validationErrors.price && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.price}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="cost_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cost Price
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                    </div>
                    <input
                      type="text"
                      name="cost_price"
                      id="cost_price"
                      className={`block w-full pl-7 rounded-md ${
                        validationErrors.cost_price 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                      } shadow-sm dark:bg-gray-700 dark:text-white sm:text-sm`}
                      value={formData.cost_price}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                  {validationErrors.cost_price && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.cost_price}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="tax_rate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tax Rate
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="text"
                      name="tax_rate"
                      id="tax_rate"
                      className={`block w-full pr-10 rounded-md ${
                        validationErrors.tax_rate 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                      } shadow-sm dark:bg-gray-700 dark:text-white sm:text-sm`}
                      value={formData.tax_rate}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">%</span>
                    </div>
                  </div>
                  {validationErrors.tax_rate && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.tax_rate}</p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center text-blue-700 dark:text-blue-300 text-sm font-medium mb-2">
                      <InfoOutlinedIcon className="w-4 h-4 mr-1.5" />
                      Pricing Information
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      The selling price is what customers pay. Cost price is what you pay to acquire the item. 
                      The system will calculate profit margins based on these values.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Inventory Tab */}
            {activeTab === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    name="stock_quantity"
                    id="stock_quantity"
                    className={`mt-1 block w-full rounded-md ${
                      validationErrors.stock_quantity 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                    } shadow-sm dark:bg-gray-700 dark:text-white sm:text-sm`}
                    value={formData.stock_quantity}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {validationErrors.stock_quantity && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.stock_quantity}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="reorder_level" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    name="reorder_level"
                    id="reorder_level"
                    className={`mt-1 block w-full rounded-md ${
                      validationErrors.reorder_level 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                    } shadow-sm dark:bg-gray-700 dark:text-white sm:text-sm`}
                    value={formData.reorder_level}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {validationErrors.reorder_level ? (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.reorder_level}</p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Get alerted when stock falls below this level</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="supplier_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Supplier
                  </label>
                  <select
                    name="supplier_id"
                    id="supplier_id"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    value={formData.supplier_id}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">None</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="location_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Location
                  </label>
                  <select
                    name="location_id"
                    id="location_id"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    value={formData.location_id}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">None</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <div className="flex items-center">
                    <input
                      id="is_active"
                      name="is_active"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      checked={formData.is_active}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Product is active
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Inactive products won't appear in sales catalogs
                  </p>
                </div>
              </div>
            )}
            
            {/* Additional Details Tab */}
            {activeTab === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sku" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    SKU
                  </label>
                  <input
                    type="text"
                    name="sku"
                    id="sku"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    value={formData.sku}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Barcode
                  </label>
                  <input
                    type="text"
                    name="barcode"
                    id="barcode"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    value={formData.barcode}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Weight
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      name="weight"
                      id="weight"
                      className="flex-1 min-w-0 block w-full rounded-none rounded-l-md border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      value={formData.weight}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    <select
                      name="weight_unit"
                      value={formData.weight_unit}
                      onChange={handleChange}
                      disabled={loading}
                      className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-300 sm:text-sm"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="lb">lb</option>
                      <option value="oz">oz</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="dimensions" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Dimensions (L x W x H)
                  </label>
                  <input
                    type="text"
                    name="dimensions"
                    id="dimensions"
                    placeholder="e.g., 10 x 5 x 3 cm"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    value={formData.dimensions}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <hr className="my-4 border-gray-200 dark:border-gray-700" />
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Fields
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Additional custom fields can be added based on your specific needs.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Dialog footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
              onClick={() => onClose()}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                isEdit ? 'Update Product' : 'Create Product'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;