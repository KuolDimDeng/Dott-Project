// InvoiceTemplateBuilder.jsx
import React, { useState } from 'react';
import { Box, Typography, Button, Input, MenuItem, Select, Grid } from '@mui/material';
import InvoicePreview from './InvoicePreview';

const InvoiceTemplateBuilder = ({ handleClose, userData }) => {
  const [logo, setLogo] = useState(null);
  const [accentColor, setAccentColor] = useState('#000000');
  const [template, setTemplate] = useState('Contemporary');
  const [invoiceItems, setInvoiceItems] = useState([]);

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    setLogo(URL.createObjectURL(file));
  };

  const handleAccentColorChange = (event) => {
    setAccentColor(event.target.value);
  };

  const handleTemplateChange = (event) => {
    setTemplate(event.target.value);
  };

  const handleAddInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const handleInvoiceItemChange = (index, field, value) => {
    const updatedItems = [...invoiceItems];
    updatedItems[index][field] = value;
    setInvoiceItems(updatedItems);
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={8}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Let's create the perfect template
          </Typography>
          <Typography variant="body1">First impressions make all the difference.</Typography>

          <Box mt={4}>
            <Typography variant="h6">1. Add a logo</Typography>
            <Input type="file" onChange={handleLogoUpload} />
            {logo && <img src={logo} alt="Logo Preview" style={{ maxWidth: '200px' }} />}
          </Box>

          <Box mt={4}>
            <Typography variant="h6">2. Choose an accent color</Typography>
            <Input
              type="text"
              value={accentColor}
              onChange={handleAccentColorChange}
              placeholder="Hex"
            />
          </Box>

          <Box mt={4}>
            <Typography variant="h6">3. Choose a template</Typography>
            <Select value={template} onChange={handleTemplateChange}>
              <MenuItem value="Contemporary">Contemporary</MenuItem>
              <MenuItem value="Modern">Modern</MenuItem>
              <MenuItem value="Classic">Classic</MenuItem>
            </Select>
          </Box>

          <Box mt={4}>
            <Typography variant="h6">4. Add Invoice Items</Typography>
            <Button variant="contained" color="primary" onClick={handleAddInvoiceItem}>
              Add Item
            </Button>
            {invoiceItems.map((item, index) => (
              <Box key={index} mt={2} display="flex" gap={2}>
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => handleInvoiceItemChange(index, 'description', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Quantity"
                  value={item.quantity}
                  onChange={(e) => handleInvoiceItemChange(index, 'quantity', parseInt(e.target.value))}
                />
                <Input
                  type="number"
                  placeholder="Unit Price"
                  value={item.unitPrice}
                  onChange={(e) => handleInvoiceItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                />
                <Typography variant="body1">Total: {item.quantity * item.unitPrice}</Typography>
              </Box>
            ))}
          </Box>

          <Box mt={4}>
            <Button variant="contained" color="primary" onClick={handleClose}>
              Close Builder
            </Button>
          </Box>
        </Box>
      </Grid>
      <Grid item xs={4}>
        <InvoicePreview
          logo={logo}
          accentColor={accentColor}
          template={template}
          userData={userData}
          invoiceItems={invoiceItems}
        />
      </Grid>
    </Grid>
  );
};

export default InvoiceTemplateBuilder;