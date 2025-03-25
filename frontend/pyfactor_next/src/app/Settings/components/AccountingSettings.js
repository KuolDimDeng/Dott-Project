import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';

const AccountingSettings = ({ selectedTab }) => {
  const renderContent = () => {
    switch (selectedTab) {
      case 0:
        return <DatesAndCurrency />;
      case 1:
        return <SalesTax />;
      default:
        return null;
    }
  };

  return <Box>{renderContent()}</Box>;
};

const DatesAndCurrency = () => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Dates and Currency
    </Typography>
    <FormControl fullWidth margin="normal">
      <InputLabel>Date Format</InputLabel>
      <Select defaultValue="mm/dd/yyyy">
        <MenuItem value="mm/dd/yyyy">MM/DD/YYYY</MenuItem>
        <MenuItem value="dd/mm/yyyy">DD/MM/YYYY</MenuItem>
        <MenuItem value="yyyy/mm/dd">YYYY/MM/DD</MenuItem>
      </Select>
    </FormControl>
    <FormControl fullWidth margin="normal">
      <InputLabel>Currency</InputLabel>
      <Select defaultValue="usd">
        <MenuItem value="usd">USD ($)</MenuItem>
        <MenuItem value="eur">EUR (€)</MenuItem>
        <MenuItem value="gbp">GBP (£)</MenuItem>
      </Select>
    </FormControl>
  </Box>
);

const SalesTax = () => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Sales Tax
    </Typography>
    <TextField
      fullWidth
      margin="normal"
      label="Default Sales Tax Rate (%)"
      type="number"
      defaultValue="0"
    />
  </Box>
);

export default AccountingSettings;
