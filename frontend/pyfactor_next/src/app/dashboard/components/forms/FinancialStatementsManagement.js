import React, { useState } from 'react';
import ProfitAndLoss from './ProfitAndLoss';
import BalanceSheet from './BalanceSheet';
import CashFlow from './CashFlow';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      className={value !== index ? 'hidden' : ''}
      id={`financial-tabpanel-${index}`}
      aria-labelledby={`financial-tab-${index}`}
      {...other}
    >
      {value === index && <div className="p-6">{children}</div>}
    </div>
  );
}

export default function FinancialStatementsManagement() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabClick = (tabIndex) => {
    setActiveTab(tabIndex);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px" aria-label="financial statements tabs">
          <button 
            onClick={() => handleTabClick(0)}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 0
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            id="financial-tab-0"
            aria-controls="financial-tabpanel-0"
            aria-selected={activeTab === 0}
          >
            Profit and Loss
          </button>
          <button 
            onClick={() => handleTabClick(1)}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 1
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            id="financial-tab-1"
            aria-controls="financial-tabpanel-1"
            aria-selected={activeTab === 1}
          >
            Balance Sheet
          </button>
          <button 
            onClick={() => handleTabClick(2)}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 2
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            id="financial-tab-2"
            aria-controls="financial-tabpanel-2"
            aria-selected={activeTab === 2}
          >
            Cash Flow
          </button>
        </nav>
      </div>
      <TabPanel value={activeTab} index={0}>
        <ProfitAndLoss />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <BalanceSheet />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <CashFlow />
      </TabPanel>
    </div>
  );
}
