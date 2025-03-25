import React, { useState } from 'react';
import { Tabs, Tab, Box, useTheme } from '@mui/material';
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
  const theme = useTheme();

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
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
