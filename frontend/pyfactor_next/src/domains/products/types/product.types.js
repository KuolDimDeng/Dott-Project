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
