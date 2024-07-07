import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  Paper,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
  Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PreviewIcon from '@mui/icons-material/Preview';
import SaveIcon from '@mui/icons-material/Save';

const EstimateForm = ({ onSave, onPreview, initialData }) => {
  const [estimate, setEstimate] = useState(initialData || {
    title: 'Estimate',
    summary: '',
    logo: null,
    customerRef: '',
    date: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    items: [],
    discount: 0,
    currency: 'USD',
    footer: '',
    attachments: []
  });

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Fetch customers and products from API
    // Update setCustomers and setProducts with the fetched data
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setEstimate({ ...estimate, [name]: value });
  };

  const handleDateChange = (date, name) => {
    setEstimate({ ...estimate, [name]: date });
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    setEstimate({ ...estimate, logo: file });
  };

  const handleItemAdd = () => {
    setEstimate({
      ...estimate,
      items: [...estimate.items, { product: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...estimate.items];
    newItems[index][field] = value;
    setEstimate({ ...estimate, items: newItems });
  };

  const handleItemRemove = (index) => {
    const newItems = estimate.items.filter((_, i) => i !== index);
    setEstimate({ ...estimate, items: newItems });
  };

  const handleAttachmentUpload = (event) => {
    const files = Array.from(event.target.files);
    setEstimate({ ...estimate, attachments: [...estimate.attachments, ...files] });
  };

  const handleAttachmentRemove = (index) => {
    const newAttachments = estimate.attachments.filter((_, i) => i !== index);
    setEstimate({ ...estimate, attachments: newAttachments });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper elevation={3} sx={{ p: 3, my: 2 }}>
        <Typography variant="h4" gutterBottom>
          Create New Estimate
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Estimate Title"
              name="title"
              value={estimate.title}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="logo-upload"
              type="file"
              onChange={handleLogoUpload}
            />
            <label htmlFor="logo-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUploadIcon />}
              >
                Upload Logo
              </Button>
            </label>
            {estimate.logo && <Typography>{estimate.logo.name}</Typography>}
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Summary"
              name="summary"
              value={estimate.summary}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Customer</InputLabel>
              <Select
                name="customerRef"
                value={estimate.customerRef}
                onChange={handleInputChange}
              >
                {customers.map((customer) => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="Date"
              value={estimate.date}
              onChange={(date) => handleDateChange(date, 'date')}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="Valid Until"
              value={estimate.validUntil}
              onChange={(date) => handleDateChange(date, 'validUntil')}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Items
            </Typography>
            {estimate.items.map((item, index) => (
              <Box key={index} sx={{ display: 'flex', mb: 2 }}>
                <FormControl sx={{ mr: 2, flexGrow: 1 }}>
                  <InputLabel>Product/Service</InputLabel>
                  <Select
                    value={item.product}
                    onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                  >
                    {products.map((product) => (
                      <MenuItem key={product.id} value={product.id}>
                        {product.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                />
                <IconButton onClick={() => handleItemRemove(index)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button startIcon={<AddIcon />} onClick={handleItemAdd}>
              Add Item
            </Button>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Discount"
              name="discount"
              value={estimate.discount}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select
                name="currency"
                value={estimate.currency}
                onChange={handleInputChange}
              >
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Footer"
              name="footer"
              value={estimate.footer}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12}>
            <input
              accept="*/*"
              style={{ display: 'none' }}
              id="attachment-upload"
              multiple
              type="file"
              onChange={handleAttachmentUpload}
            />
            <label htmlFor="attachment-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUploadIcon />}
              >
                Attach Documents
              </Button>
            </label>
            {estimate.attachments.map((file, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Typography>{file.name}</Typography>
                <IconButton onClick={() => handleAttachmentRemove(index)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              startIcon={<PreviewIcon />}
              onClick={() => onPreview(estimate)}
              sx={{ mr: 2 }}
            >
              Preview
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => onSave(estimate)}
            >
              Save and Continue
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </LocalizationProvider>
  );
};

export default EstimateForm;