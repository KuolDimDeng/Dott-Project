import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import InventoryItemList from './InventoryItemList';
import CategoryList from './CategoryList';
import SupplierList from './SupplierList';
import LocationList from './LocationList';
import TransactionList from './TransactionList';

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
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function InventoryManagement() {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
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