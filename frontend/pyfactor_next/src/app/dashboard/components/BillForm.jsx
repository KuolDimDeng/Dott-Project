import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Autocomplete,
} from '@mui/material';
import currencyList from './currencies'; // Import the currency list

const BillForm = () => {
  const [vendor, setVendor] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [billDate, setBillDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [posoNumber, setPosoNumber] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ category: '', description: '', quantity: 1, price: 0, tax: 0, amount: 0 }]);

  const handleVendorChange = (event, newValue) => {
    setVendor(newValue);
  };

  const handleCurrencyChange = (event) => {
    setCurrency(event.target.value);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].price;
    setItems(updatedItems);
  };

  const handleAddItem = () => {
    setItems([...items, { category: '', description: '', quantity: 1, price: 0, tax: 0, amount: 0 }]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log({
      vendor,
      currency,
      billDate,
      dueDate,
      posoNumber,
      billNumber,
      notes,
      items,
    });
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Add bill
      </Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={vendors}
              getOptionLabel={(option) => option.name}
              value={vendor}
              onChange={handleVendorChange}
              renderInput={(params) => (
                <TextField {...params} label="Vendor" required />
              )}
            />
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select value={currency} onChange={handleCurrencyChange}>
                {currencyList.map((currency) => (
                  <MenuItem key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Bill Date"
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="P.O./S.O."
              value={posoNumber}
              onChange={(e) => setPosoNumber(e.target.value)}
            />
            <TextField
              label="Bill #"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              required
            />
            <TextField
              label="Notes"
              multiline
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Items
            </Typography>
            {items.map((item, index) => (
              <Grid container spacing={2} key={index}>
                <Grid item xs={3}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={item.category}
                      onChange={(e) =>
                        handleItemChange(index, 'category', e.target.value)
                      }
                    >
                      <MenuItem value="">Choose</MenuItem>
                      <MenuItem value="Accounting Fees">Accounting Fees</MenuItem>
                      <MenuItem value="Advertising & Promotion">
                        Advertising & Promotion
                      </MenuItem>
                      {/* Add more expense categories */}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Description"
                    value={item.description}
                    onChange={(e) =>
                      handleItemChange(index, 'description', e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={1}>
                  <TextField
                    label="Qty"
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(index, 'quantity', e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={2}>
                  <TextField
                    label="Price"
                    type="number"
                    value={item.price}
                    onChange={(e) =>
                      handleItemChange(index, 'price', e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={2}>
                  <TextField
                    label="Tax"
                    type="number"
                    value={item.tax}
                    onChange={(e) =>
                      handleItemChange(index, 'tax', e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    label="Amount"
                    value={item.amount}
                    disabled
                  />
                </Grid>
              </Grid>
            ))}
            <Button
              variant="contained"
              color="primary"
              onClick={handleAddItem}
              sx={{ mt: 2 }}
            >
              Add a line
            </Button>
            <Box display="flex" justifyContent="flex-end" mt={2}>
              <Typography variant="body1" sx={{ mr: 2 }}>
                Subtotal: $
                {items.reduce((total, item) => total + item.amount, 0).toFixed(2)}
              </Typography>
              <Typography variant="body1" sx={{ mr: 2 }}>
                Total ({currency}): $
                {items.reduce((total, item) => total + item.amount, 0).toFixed(2)}
              </Typography>
              <Typography variant="body1" sx={{ mr: 2 }}>
                Total Paid ({currency}): $0.00
              </Typography>
              <Typography variant="body1">
                Amount Due ({currency}): $
                {items.reduce((total, item) => total + item.amount, 0).toFixed(2)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
        <Box display="flex" justifyContent="flex-end" mt={3}>
          <Button variant="outlined" color="inherit" sx={{ mr: 2 }}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" type="submit">
            Save
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default BillForm;