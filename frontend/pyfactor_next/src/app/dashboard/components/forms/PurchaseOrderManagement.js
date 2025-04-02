import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';
import { format } from 'date-fns';

// SVG icons as React components
const AddIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const PurchaseOrderManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
  const [newPurchaseOrder, setNewPurchaseOrder] = useState({
    vendor: '',
    date: new Date(),
    items: [],
    discount: 0,
    currency: 'USD',
    totalAmount: 0,
    status: 'draft',
  });
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedPurchaseOrder, setEditedPurchaseOrder] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [customProduct, setCustomProduct] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);

  useEffect(() => {
    fetchPurchaseOrders();
    fetchVendors();
    fetchProducts();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      const response = await axiosInstance.get('/api/purchase-orders/');
      setPurchaseOrders(response.data);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast.error('Failed to fetch purchase orders');
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await axiosInstance.get('/api/vendors/');
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to fetch vendors');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get('/api/products/');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewPurchaseOrder((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (e) => {
    const date = new Date(e.target.value);
    setNewPurchaseOrder((prev) => ({
      ...prev,
      date: date,
    }));
  };

  const handleItemAdd = () => {
    setNewPurchaseOrder((prev) => ({
      ...prev,
      items: [...prev.items, { product: '', quantity: 1, unit_price: 0 }],
    }));
    setSelectedProducts([...selectedProducts, null]);
  };

  const handleItemRemove = (index) => {
    const newItems = [...newPurchaseOrder.items];
    newItems.splice(index, 1);
    
    const newSelectedProducts = [...selectedProducts];
    newSelectedProducts.splice(index, 1);
    
    setSelectedProducts(newSelectedProducts);
    setNewPurchaseOrder((prev) => ({
      ...prev,
      items: newItems,
      totalAmount: calculateTotalAmount(newItems, prev.discount),
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...newPurchaseOrder.items];
    newItems[index][field] = value;

    if (field === 'product') {
      const selectedProduct = products.find((p) => p.id === value);
      if (selectedProduct) {
        newItems[index].description = selectedProduct.name;
        newItems[index].unit_price = parseFloat(selectedProduct.price) || 0;
        
        const newSelectedProducts = [...selectedProducts];
        newSelectedProducts[index] = selectedProduct;
        setSelectedProducts(newSelectedProducts);
      }
    }

    if (field === 'quantity' || field === 'unit_price') {
      newItems[index][field] = parseFloat(value) || 0;
    }

    newItems[index].total = newItems[index].quantity * newItems[index].unit_price;

    setNewPurchaseOrder((prev) => ({
      ...prev,
      items: newItems,
      totalAmount: calculateTotalAmount(newItems, prev.discount),
    }));
  };

  const calculateTotalAmount = (items, discount) => {
    const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    return total - discount;
  };

  const handleCreatePurchaseOrder = async (e) => {
    e.preventDefault();
    try {
      console.log('Sending purchase order data:', newPurchaseOrder); // Log the data being sent
      const response = await axiosInstance.post('/api/purchase-orders/create/', newPurchaseOrder);
      toast.success('Purchase order created successfully');
      fetchPurchaseOrders();
      setActiveTab(2);
    } catch (error) {
      console.error('Error creating purchase order:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error data:', error.response.data);
        console.error('Error status:', error.response.status);
        console.error('Error headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
      }
      toast.error('Failed to create purchase order: ' + (error.response?.data?.error || error.message)
      );
    }
  };

  const handlePurchaseOrderSelect = (purchaseOrder) => {
    setSelectedPurchaseOrder(purchaseOrder);
    setActiveTab(1);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedPurchaseOrder({ ...selectedPurchaseOrder });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedPurchaseOrder(null);
  };

  const handleSaveEdit = async () => {
    try {
      const response = await axiosInstance.put(
        `/api/purchase-orders/${selectedPurchaseOrder.id}/`,
        editedPurchaseOrder
      );
      setSelectedPurchaseOrder(response.data);
      setIsEditing(false);
      fetchPurchaseOrders();
      toast.success('Purchase order updated successfully');
    } catch (error) {
      console.error('Error updating purchase order:', error);
      toast.error('Failed to update purchase order');
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axiosInstance.delete(`/api/purchase-orders/${selectedPurchaseOrder.id}/`);
      toast.success('Purchase order deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedPurchaseOrder(null);
      fetchPurchaseOrders();
      setActiveTab(2);
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      toast.error('Failed to delete purchase order');
    }
  };

  const handleAddCustomProduct = () => {
    if (customProduct.trim() !== '') {
      setNewPurchaseOrder((prev) => ({
        ...prev,
        items: [
          ...prev.items,
          { product: null, description: customProduct, quantity: 1, unit_price: 0, total: 0 },
        ],
      }));
      setSelectedProducts([...selectedProducts, null]);
      setCustomProduct('');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">
          Purchase Order Management
        </h1>
        
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex -mb-px">
            <button
              onClick={(e) => handleTabChange(e, 0)}
              className={`py-3 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 0
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Create
            </button>
            <button
              onClick={(e) => handleTabChange(e, 1)}
              className={`py-3 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 1
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Details
            </button>
            <button
              onClick={(e) => handleTabChange(e, 2)}
              className={`py-3 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 2
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              List
            </button>
          </nav>
        </div>

        {activeTab === 0 && (
          <div className="mt-3">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Create Purchase Order
            </h2>
            <form onSubmit={handleCreatePurchaseOrder}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <select
                  name="vendor"
                  value={newPurchaseOrder.vendor}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select a vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newPurchaseOrder.date instanceof Date ? newPurchaseOrder.date.toISOString().split('T')[0] : ''}
                  onChange={handleDateChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <h3 className="text-lg font-medium text-gray-700 mb-2">Items</h3>
              
              {newPurchaseOrder.items.map((item, index) => (
                <div key={index} className="flex flex-wrap items-center mb-4 gap-2">
                  <div className="w-full md:w-1/4 lg:w-1/5">
                    <select
                      value={item.product || ''}
                      onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select a product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="w-full md:w-1/4 lg:w-1/5">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description || ''}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="w-full md:w-1/6 lg:w-1/8">
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="w-full md:w-1/6 lg:w-1/8">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Unit Price"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="w-full md:w-1/6 lg:w-1/8">
                    <input
                      type="text"
                      placeholder="Total"
                      value={(item.quantity * item.unit_price).toFixed(2)}
                      readOnly
                      className="block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleItemRemove(index)}
                    className="p-2 text-red-600 hover:text-red-800 focus:outline-none"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              ))}
              
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex-grow">
                  <input
                    type="text"
                    placeholder="Add Custom Product"
                    value={customProduct}
                    onChange={(e) => setCustomProduct(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomProduct}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Add Custom Product
                </button>
              </div>
              
              <button
                type="button"
                onClick={handleItemAdd}
                className="flex items-center mb-4 text-blue-600 hover:text-blue-800"
              >
                <AddIcon />
                <span className="ml-1">Add Item</span>
              </button>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                <input
                  type="number"
                  name="discount"
                  value={newPurchaseOrder.discount}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                <input
                  type="text"
                  value={newPurchaseOrder.totalAmount.toFixed(2)}
                  readOnly
                  className="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  name="currency"
                  value={newPurchaseOrder.currency}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={newPurchaseOrder.status}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="received">Received</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create Purchase Order
              </button>
            </form>
          </div>
        )}

        {activeTab === 1 && (
          <div className="mt-3">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Purchase Order Details
            </h2>
            {selectedPurchaseOrder ? (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
                  <input
                    type="text"
                    value={selectedPurchaseOrder.order_number}
                    readOnly
                    className="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                  <input
                    type="text"
                    value={selectedPurchaseOrder.vendor_name}
                    readOnly={!isEditing}
                    className={`mt-1 block w-full rounded-md ${!isEditing ? 'bg-gray-100' : ''} border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedPurchaseOrder.date}
                    readOnly={!isEditing}
                    className={`mt-1 block w-full rounded-md ${!isEditing ? 'bg-gray-100' : ''} border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                  <input
                    type="text"
                    value={selectedPurchaseOrder.totalAmount}
                    readOnly
                    className="mt-1 block w-full rounded-md bg-gray-100 border-gray-300 shadow-sm"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                  <input
                    type="text"
                    value={selectedPurchaseOrder.discount}
                    readOnly={!isEditing}
                    className={`mt-1 block w-full rounded-md ${!isEditing ? 'bg-gray-100' : ''} border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <input
                    type="text"
                    value={selectedPurchaseOrder.currency}
                    readOnly={!isEditing}
                    className={`mt-1 block w-full rounded-md ${!isEditing ? 'bg-gray-100' : ''} border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <input
                    type="text"
                    value={selectedPurchaseOrder.status}
                    readOnly={!isEditing}
                    className={`mt-1 block w-full rounded-md ${!isEditing ? 'bg-gray-100' : ''} border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                  />
                </div>

                <h3 className="text-lg font-medium text-gray-700 mb-2">Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedPurchaseOrder.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.product ? item.product.name : 'Custom Product'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit_price}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(item.quantity * item.unit_price).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 space-x-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleEdit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-600">Select a purchase order from the list to view details</p>
            )}
          </div>
        )}

        {activeTab === 2 && (
          <div className="mt-3">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Purchase Order List
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Number</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchaseOrders.map((purchaseOrder) => (
                    <tr
                      key={purchaseOrder.id}
                      onClick={() => handlePurchaseOrderSelect(purchaseOrder)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{purchaseOrder.order_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{purchaseOrder.vendor_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(purchaseOrder.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {purchaseOrder.totalAmount} {purchaseOrder.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{purchaseOrder.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {deleteDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
              <div className="px-6 pt-6 pb-2">
                <h2 className="text-xl font-semibold text-gray-800">
                  Confirm Delete
                </h2>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-700">
                  Are you sure you want to delete this purchase order?
                </p>
              </div>
              <div className="px-6 pb-6 pt-2 flex justify-end space-x-3">
                <button 
                  onClick={() => setDeleteDialogOpen(false)} 
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDelete} 
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderManagement;