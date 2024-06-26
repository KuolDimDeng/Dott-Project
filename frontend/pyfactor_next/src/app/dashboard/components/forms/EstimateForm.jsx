import React, { useState } from 'react';
import { Box, TextField, Button, Typography, IconButton } from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';

const EstimateForm = ({ userData }) => {
  const [logoImage, setLogoImage] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [estimateNumber, setEstimateNumber] = useState('');
  const [customerRef, setCustomerRef] = useState('');
  const [date, setDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [footer, setFooter] = useState('');

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    // Perform validation and state update for logo image
    // ...
  };

  const handleAddressEdit = () => {
    // Handle editing the business address and contact details
    // ...
  };

  const handleCustomerAdd = () => {
    // Handle adding a customer
    // ...
  };

  const handleItemAdd = () => {
    setItems([...items, { name: '', quantity: 0, price: 0 }]);
  };

  const handleItemDelete = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const handleSave = () => {
    // Handle saving the estimate
    // ...
  };

  const handlePreview = () => {
    // Handle previewing the estimate
    // ...
  };

  EstimateForm.defaultProps = {
    userData: {
      business_name: '',
      street: '',
      city: '',
      state: '',
      postcode: '',
      country: '',
    },
  };

  return (
    <Box>
      <Typography variant="h4">New Estimate</Typography>
      <Button variant="contained" onClick={handlePreview}>
        Preview
      </Button>
      <Button variant="contained" onClick={handleSave}>
        Save and Continue
      </Button>

      <Box>
        <Typography variant="h6">
          Business Address and Contact Details, Title, Summary, and Logo
        </Typography>
        <Box>
          <input type="file" accept=".jpg,.png,.gif" onChange={handleLogoUpload} />
          <Typography variant="body2">
            Maximum 5MB in size. JPG, PNG, or GIF formats.
          </Typography>
          <Typography variant="body2">Recommended size: 300 x 200 pixels.</Typography>
        </Box>
        <Typography variant="subtitle1">{userData.business_name}</Typography>
        <Typography variant="subtitle2">
          {userData.street}, {userData.city}, {userData.state}, {userData.postcode}, {userData.country}
        </Typography>
        <Button variant="contained" onClick={handleAddressEdit}>
          Edit your business address and contact details
        </Button>
      </Box>

      <Box>
        <Button variant="contained" onClick={handleCustomerAdd} startIcon={<Add />}>
          Add Customer
        </Button>
        <TextField label="Estimate Number" value={estimateNumber} onChange={(e) => setEstimateNumber(e.target.value)} />
        <TextField label="Customer Ref" value={customerRef} onChange={(e) => setCustomerRef(e.target.value)} />
        <TextField type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
        <TextField label="Valid Until" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
      </Box>

      <Box>
        <Typography variant="h6">Items</Typography>
        <Box>
          {items.map((item, index) => (
            <Box key={index}>
              <TextField
                label="Item"
                value={item.name}
                onChange={(e) => {
                  const updatedItems = [...items];
                  updatedItems[index].name = e.target.value;
                  setItems(updatedItems);
                }}
              />
              <TextField
                label="Quantity"
                type="number"
                value={item.quantity}
                onChange={(e) => {
                  const updatedItems = [...items];
                  updatedItems[index].quantity = parseInt(e.target.value, 10);
                  setItems(updatedItems);
                }}
              />
              <TextField
                label="Price"
                type="number"
                value={item.price}
                onChange={(e) => {
                  const updatedItems = [...items];
                  updatedItems[index].price = parseFloat(e.target.value);
                  setItems(updatedItems);
                }}
              />
              <TextField label="Amount" value={item.quantity * item.price} disabled />
              <IconButton onClick={() => handleItemDelete(index)}>
                <Delete />
              </IconButton>
            </Box>
          ))}
        </Box>
        <Button variant="contained" onClick={handleItemAdd} startIcon={<Add />}>
          Add Item
        </Button>
      </Box>

      <Box>
        <Typography variant="h6">Notes / Terms</Typography>
        <TextField multiline rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Box>

      <Box>
        <Typography variant="h6">Footer</Typography>
        <TextField multiline rows={4} value={footer} onChange={(e) => setFooter(e.target.value)} />
      </Box>

      <Button variant="contained" onClick={handlePreview}>
        Preview
      </Button>
      <Button variant="contained" onClick={handleSave}>
        Save and Continue
      </Button>
    </Box>
  );
};

export default EstimateForm;