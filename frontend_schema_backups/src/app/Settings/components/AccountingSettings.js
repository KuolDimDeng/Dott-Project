import React from 'react';
import { Button, TextField, Select } from '@/components/ui/TailwindComponents';

const AccountingSettings = ({ selectedTab }) => {
  const currencies = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'JPY', label: 'JPY - Japanese Yen' },
    { value: 'KES', label: 'KES - Kenyan Shilling' },
    { value: 'NGN', label: 'NGN - Nigerian Naira' },
    { value: 'ZAR', label: 'ZAR - South African Rand' },
  ];

  const dateFormats = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK, EU)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
  ];

  const symbolPositionOptions = [
    { value: 'before', label: 'Before amount ($100.00)' },
    { value: 'after', label: 'After amount (100.00$)' },
  ];

  const renderContent = () => {
    switch (selectedTab) {
      case 0:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Dates and Currency</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-medium mb-4">Currency Settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Select
                    label="Default Currency"
                    defaultValue="USD"
                    options={currencies}
                    fullWidth
                  />
                </div>
                <div>
                  <Select
                    label="Currency Symbol Position"
                    defaultValue="before"
                    options={symbolPositionOptions}
                    fullWidth
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Date Format</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Select
                    label="Date Format"
                    defaultValue="MM/DD/YYYY"
                    options={dateFormats}
                    fullWidth
                  />
                </div>
                <div>
                  <TextField
                    label="Fiscal Year Start"
                    type="month"
                    defaultValue="2023-01"
                    fullWidth
                  />
                </div>
                <div className="sm:col-span-2 mt-4">
                  <Button variant="primary">
                    Save Settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Sales Tax</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Tax Settings</h3>
              <div className="space-y-6">
                <div className="mb-6">
                  <h4 className="text-base font-medium mb-3">Default Tax</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      fullWidth
                      label="Tax Name"
                      defaultValue="Sales Tax"
                    />
                    <TextField
                      fullWidth
                      label="Rate (%)"
                      defaultValue="7.5"
                      type="number"
                      endAdornment={<span>%</span>}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>
                  <h4 className="text-base font-medium mb-3">Additional Tax Rates</h4>
                  <div className="mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      <div className="sm:col-span-5">
                        <TextField
                          fullWidth
                          label="Tax Name"
                          defaultValue="State Tax"
                        />
                      </div>
                      <div className="sm:col-span-5">
                        <TextField
                          fullWidth
                          label="Rate (%)"
                          defaultValue="4"
                          type="number"
                          endAdornment={<span>%</span>}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Button variant="outlined" className="mt-2 text-red-600 border-red-600 hover:bg-red-50">
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 mb-6">
                    <Button variant="outlined">
                      Add Tax Rate
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Button variant="primary">
                    Save Tax Settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return <div className="w-full">{renderContent()}</div>;
};

export default AccountingSettings;
