import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Grid,
  Autocomplete,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { axiosInstance } from '@/lib/axiosConfig';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

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
  const { addMessage } = useUserMessageContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editedPurchaseOrder, setEditedPurchaseOrder] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [customProduct, setCustomProduct] = useState('');
  const theme = useTheme();

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
      addMessage('error', 'Failed to fetch purchase orders');
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await axiosInstance.get('/api/vendors/');
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      addMessage('error', 'Failed to fetch vendors');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get('/api/products/');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      addMessage('error', 'Failed to fetch products');
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

  const handleDateChange = (date) => {
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
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...newPurchaseOrder.items];
    newItems[index][field] = value;

    if (field === 'product') {
      const selectedProduct = products.find((p) => p.id === value);
      if (selectedProduct) {
        newItems[index].description = selectedProduct.name;
        newItems[index].unit_price = parseFloat(selectedProduct.price) || 0;
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
      addMessage('success', 'Purchase order created successfully');
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
      addMessage(
        'error',
        'Failed to create purchase order: ' + (error.response?.data?.error || error.message)
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
      addMessage('success', 'Purchase order updated successfully');
    } catch (error) {
      console.error('Error updating purchase order:', error);
      addMessage('error', 'Failed to update purchase order');
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axiosInstance.delete(`/api/purchase-orders/${selectedPurchaseOrder.id}/`);
      addMessage('success', 'Purchase order deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedPurchaseOrder(null);
      fetchPurchaseOrders();
      setActiveTab(2);
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      addMessage('error', 'Failed to delete purchase order');
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
      setCustomProduct('');
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Purchase Order Management
          </Typography>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Create" />
            <Tab label="Details" />
            <Tab label="List" />
          </Tabs>

          {activeTab === 0 && (
            <Box mt={3}>
              <Typography variant="h6" gutterBottom>
                Create Purchase Order
              </Typography>
              <form onSubmit={handleCreatePurchaseOrder}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Vendor</InputLabel>
                  <Select
                    name="vendor"
                    value={newPurchaseOrder.vendor}
                    onChange={handleInputChange}
                  >
                    {vendors.map((vendor) => (
                      <MenuItem key={vendor.id} value={vendor.id}>
                        {vendor.vendor_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <DatePicker
                  label="Date"
                  value={newPurchaseOrder.date}
                  onChange={handleDateChange}
                  slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                />
                <Typography variant="h6" gutterBottom>
                  Items
                </Typography>
                {newPurchaseOrder.items.map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', mb: 2 }}>
                    <Autocomplete
                      sx={{ mr: 2, flexGrow: 1 }}
                      options={products}
                      getOptionLabel={(option) => option.name}
                      value={products.find((p) => p.id === item.product) || null}
                      onChange={(e, newValue) =>
                        handleItemChange(index, 'product', newValue ? newValue.id : null)
                      }
                      renderInput={(params) => <TextField {...params} label="Product" />}
                    />
                    <TextField
                      sx={{ mr: 2, flexGrow: 1 }}
                      label="Description"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    />
                    <TextField
                      sx={{ mr: 2, width: '100px' }}
                      type="number"
                      label="Quantity"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    />
                    <TextField
                      sx={{ mr: 2, width: '150px' }}
                      type="number"
                      label="Unit Price"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                    />
                    <TextField
                      sx={{ mr: 2, width: '150px' }}
                      type="number"
                      label="Total"
                      value={(item.quantity * item.unit_price).toFixed(2)}
                      InputProps={{ readOnly: true }}
                    />
                    <IconButton onClick={() => handleItemRemove(index)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                <Box sx={{ display: 'flex', mb: 2 }}>
                  <TextField
                    sx={{ mr: 2, flexGrow: 1 }}
                    label="Add Custom Product"
                    value={customProduct}
                    onChange={(e) => setCustomProduct(e.target.value)}
                  />
                  <Button variant="contained" onClick={handleAddCustomProduct}>
                    Add Custom Product
                  </Button>
                </Box>
                <Button startIcon={<AddIcon />} onClick={handleItemAdd}>
                  Add Item
                </Button>

                <TextField
                  label="Discount"
                  name="discount"
                  type="number"
                  value={newPurchaseOrder.discount}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                />

                <TextField
                  label="Total Amount"
                  value={newPurchaseOrder.totalAmount.toFixed(2)}
                  fullWidth
                  margin="normal"
                  disabled
                />

                <FormControl fullWidth margin="normal">
                  <InputLabel>Currency</InputLabel>
                  <Select
                    name="currency"
                    value={newPurchaseOrder.currency}
                    onChange={handleInputChange}
                  >
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                    <MenuItem value="GBP">GBP</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth margin="normal">
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={newPurchaseOrder.status}
                    onChange={handleInputChange}
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="received">Received</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>

                <Button type="submit" variant="contained" color="primary">
                  Create Purchase Order
                </Button>
              </form>
            </Box>
          )}

          {activeTab === 1 && (
            <Box mt={3}>
              <Typography variant="h6" gutterBottom>
                Purchase Order Details
              </Typography>
              {selectedPurchaseOrder ? (
                <Box>
                  <TextField
                    label="Order Number"
                    value={selectedPurchaseOrder.order_number}
                    fullWidth
                    margin="normal"
                    disabled
                  />
                  <TextField
                    label="Vendor"
                    value={selectedPurchaseOrder.vendor_name}
                    fullWidth
                    margin="normal"
                    disabled={!isEditing}
                  />
                  <TextField
                    label="Date"
                    type="date"
                    value={selectedPurchaseOrder.date}
                    fullWidth
                    margin="normal"
                    disabled={!isEditing}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Total Amount"
                    value={selectedPurchaseOrder.totalAmount}
                    fullWidth
                    margin="normal"
                    disabled
                  />
                  <TextField
                    label="Discount"
                    value={selectedPurchaseOrder.discount}
                    fullWidth
                    margin="normal"
                    disabled={!isEditing}
                  />
                  <TextField
                    label="Currency"
                    value={selectedPurchaseOrder.currency}
                    fullWidth
                    margin="normal"
                    disabled={!isEditing}
                  />
                  <TextField
                    label="Status"
                    value={selectedPurchaseOrder.status}
                    fullWidth
                    margin="normal"
                    disabled={!isEditing}
                  />

                  <Typography variant="h6" gutterBottom>
                    Items
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Unit Price</TableCell>
                          <TableCell>Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedPurchaseOrder.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {item.product ? item.product.name : 'Custom Product'}
                            </TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.unit_price}</TableCell>
                            <TableCell>{(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {isEditing ? (
                    <Box mt={2}>
                      <Button variant="contained" color="primary" onClick={handleSaveEdit}>
                        Save
                      </Button>
                      <Button variant="contained" color="secondary" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                    </Box>
                  ) : (
                    <Box mt={2}>
                      <Button variant="contained" color="primary" onClick={handleEdit}>
                        Edit
                      </Button>
                      <Button variant="contained" color="secondary" onClick={handleDelete}>
                        Delete
                      </Button>
                    </Box>
                  )}
                </Box>
              ) : (
                <Typography>Select a purchase order from the list to view details</Typography>
              )}
            </Box>
          )}

          {activeTab === 2 && (
            <Box mt={3}>
              <Typography variant="h6" gutterBottom>
                Purchase Order List
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order Number</TableCell>
                      <TableCell>Vendor</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Total Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {purchaseOrders.map((purchaseOrder) => (
                      <TableRow
                        key={purchaseOrder.id}
                        onClick={() => handlePurchaseOrderSelect(purchaseOrder)}
                      >
                        <TableCell>{purchaseOrder.order_number}</TableCell>
                        <TableCell>{purchaseOrder.vendor_name}</TableCell>
                        <TableCell>{new Date(purchaseOrder.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {purchaseOrder.totalAmount} {purchaseOrder.currency}
                        </TableCell>
                        <TableCell>{purchaseOrder.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          <Dialog
            open={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle id="alert-dialog-title">{'Confirm Delete'}</DialogTitle>
            <DialogContent>
              <DialogContentText id="alert-dialog-description">
                Are you sure you want to delete this purchase order?
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
                Cancel
              </Button>
              <Button onClick={handleConfirmDelete} color="secondary" autoFocus>
                Delete
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default PurchaseOrderManagement;
