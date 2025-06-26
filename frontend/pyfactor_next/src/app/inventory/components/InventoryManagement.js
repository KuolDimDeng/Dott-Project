import React, { useState } from 'react';
import InventoryItemList from './InventoryItemList';
import SupplierList from './SupplierList';

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
      {value === index && <div className="p-6">{children}</div>}
    </div>
  );
}

// Placeholder components for other tabs
const CategoryList = () => <p className="text-gray-700">Category List (To be implemented)</p>;
const LocationList = () => <p className="text-gray-700">Location List (To be implemented)</p>;
const TransactionList = () => <p className="text-gray-700">Transaction List (To be implemented)</p>;

function InventoryManagement() {
  const [value, setValue] = useState(0);

  const handleChange = (newValue) => {
    setValue(newValue);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-black mb-4 flex items-center">
        <svg className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        Inventory Management
      </h1>
      <p className="text-gray-600 mb-6">Track products, manage stock levels, and monitor inventory movements across all locations.</p>
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px" aria-label="inventory management tabs">
          {['Inventory Items', 'Categories', 'Suppliers', 'Locations', 'Transactions'].map((tab, index) => (
            <button
              key={index}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                value === index
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              onClick={() => handleChange(index)}
              id={`inventory-tab-${index}`}
              aria-controls={`inventory-tabpanel-${index}`}
              aria-selected={value === index}
              role="tab"
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
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
    </div>
  );
}

export default InventoryManagement;