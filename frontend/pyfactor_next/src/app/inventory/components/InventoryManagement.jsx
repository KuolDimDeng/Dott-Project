import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, useTheme } from '@mui/material';
import InventoryItemList from './InventoryItemList';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Placeholder components for other tabs
const CategoryList = () => <Typography>Category List (To be implemented)</Typography>;
const SupplierList = () => <Typography>Supplier List (To be implemented)</Typography>;
const LocationList = () => <Typography>Location List (To be implemented)</Typography>;
const TransactionList = () => <Typography>Transaction List (To be implemented)</Typography>;

function InventoryManagement() {
  const [value, setValue] = useState(0);
  const theme = useTheme();

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Typography variant="h4" gutterBottom>
        Inventory Management
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="inventory management tabs">
          <Tab label="Inventory Items" />
          <Tab label="Categories" />
          <Tab label="Suppliers" />
          <Tab label="Locations" />
          <Tab label="Transactions" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <InventoryItemList />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <CategoryList />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <SupplierList />
      </TabPanel>
      <TabPanel value={value} index={3}>
        <LocationList />
      </TabPanel>
      <TabPanel value={value} index={4}>
        <TransactionList />
      </TabPanel>
    </Box>
  );
}

export default InventoryManagement;
