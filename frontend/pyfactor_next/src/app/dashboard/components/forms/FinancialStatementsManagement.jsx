import React, { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import ProfitAndLoss from './ProfitAndLoss';
import BalanceSheet from './BalanceSheet';
import CashFlow from './CashFlow';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`financial-tabpanel-${index}`}
      aria-labelledby={`financial-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function FinancialStatementsManagement() {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="financial statements tabs">
          <Tab label="Profit and Loss" />
          <Tab label="Balance Sheet" />
          <Tab label="Cash Flow" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <ProfitAndLoss />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <BalanceSheet />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <CashFlow />
      </TabPanel>
    </Box>
  );
}