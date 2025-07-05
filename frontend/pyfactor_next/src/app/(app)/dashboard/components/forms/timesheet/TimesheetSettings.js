'use client';


import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { format } from 'date-fns';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

const TimesheetSettings = ({ userData }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    approvalFrequency: 'WEEKLY',
    inputFrequency: 'DAILY',
    allowOvertime: true,
    overtimeRate: '1.5',
    requireManagerApproval: true
  });
  
  // PTO settings
  const [ptoSettings, setPTOSettings] = useState({
    defaultPTODays: 10,
    defaultSickDays: 5,
    tiers: [
      { id: '1', name: 'Junior', ptoDays: 5, sickDays: 3 },
      { id: '2', name: 'Mid-Level', ptoDays: 10, sickDays: 5 },
      { id: '3', name: 'Senior', ptoDays: 15, sickDays: 7 },
      { id: '4', name: 'Manager', ptoDays: 20, sickDays: 10 }
    ]
  });
  
  // Holidays
  const [holidays, setHolidays] = useState([
    { id: '1', name: 'New Year\'s Day', date: '2023-01-01', paid: true, recurring: true },
    { id: '2', name: 'Memorial Day', date: '2023-05-29', paid: true, recurring: true },
    { id: '3', name: 'Independence Day', date: '2023-07-04', paid: true, recurring: true },
    { id: '4', name: 'Labor Day', date: '2023-09-04', paid: true, recurring: true },
    { id: '5', name: 'Thanksgiving Day', date: '2023-11-23', paid: true, recurring: true },
    { id: '6', name: 'Day after Thanksgiving', date: '2023-11-24', paid: true, recurring: true },
    { id: '7', name: 'Christmas Eve', date: '2023-12-24', paid: true, recurring: true },
    { id: '8', name: 'Christmas Day', date: '2023-12-25', paid: true, recurring: true }
  ]);
  
  // New holiday form
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    paid: true,
    recurring: true
  });
  
  // New tier form
  const [newTier, setNewTier] = useState({
    name: '',
    ptoDays: 10,
    sickDays: 5
  });
  
  useEffect(() => {
    // Simulate fetching settings from API
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);
  
  // Handle general settings changes
  const handleGeneralSettingChange = (field, value) => {
    setGeneralSettings({
      ...generalSettings,
      [field]: value
    });
  };
  
  // Handle PTO settings changes
  const handlePTOSettingChange = (field, value) => {
    setPTOSettings({
      ...ptoSettings,
      [field]: value
    });
  };
  
  // Handle tier changes
  const handleTierChange = (tierId, field, value) => {
    setPTOSettings({
      ...ptoSettings,
      tiers: ptoSettings.tiers.map(tier => 
        tier.id === tierId ? { ...tier, [field]: value } : tier
      )
    });
  };
  
  // Add new tier
  const handleAddTier = (e) => {
    e.preventDefault();
    
    if (!newTier.name.trim()) {
      alert('Please enter a tier name');
      return;
    }
    
    setPTOSettings({
      ...ptoSettings,
      tiers: [
        ...ptoSettings.tiers,
        {
          id: Date.now().toString(), // Generate a unique ID
          ...newTier
        }
      ]
    });
    
    // Reset form
    setNewTier({
      name: '',
      ptoDays: 10,
      sickDays: 5
    });
  };
  
  // Remove tier
  const handleRemoveTier = (tierId) => {
    setPTOSettings({
      ...ptoSettings,
      tiers: ptoSettings.tiers.filter(tier => tier.id !== tierId)
    });
  };
  
  // Add new holiday
  const handleAddHoliday = (e) => {
    e.preventDefault();
    
    if (!newHoliday.name.trim()) {
      alert('Please enter a holiday name');
      return;
    }
    
    setHolidays([
      ...holidays,
      {
        id: Date.now().toString(), // Generate a unique ID
        ...newHoliday
      }
    ]);
    
    // Reset form
    setNewHoliday({
      name: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      paid: true,
      recurring: true
    });
  };
  
  // Remove holiday
  const handleRemoveHoliday = (holidayId) => {
    setHolidays(holidays.filter(holiday => holiday.id !== holidayId));
  };
  
  // Save all settings
  const handleSaveSettings = () => {
    setSaving(true);
    
    // In a real app, you would save these settings to your API
    console.log('Saving settings:', {
      generalSettings,
      ptoSettings,
      holidays
    });
    
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      alert('Settings saved successfully');
    }, 1000);
  };

  return (
    <div>
      {loading ? (
        <CenteredSpinner size="medium" /> : (
        <>
          <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
            <Tab.List className="flex border-b border-gray-200">
              <Tab 
                className={({ selected }) => `
                  py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
                  ${selected 
                    ? 'text-blue-600 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                General Settings
              </Tab>
              <Tab 
                className={({ selected }) => `
                  py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
                  ${selected 
                    ? 'text-blue-600 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                PTO & Sick Leave
              </Tab>
              <Tab 
                className={({ selected }) => `
                  py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
                  ${selected 
                    ? 'text-blue-600 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                Company Holidays
              </Tab>
            </Tab.List>
            
            <Tab.Panels className="mt-4">
              {/* General Settings Tab */}
              <Tab.Panel>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Timesheet Settings</h3>
                    
                    <div className="space-y-5">
                      <div>
                        <label htmlFor="approval-frequency" className="block text-sm font-medium text-gray-700 mb-1">
                          Timesheet Approval Frequency
                        </label>
                        <select
                          id="approval-frequency"
                          value={generalSettings.approvalFrequency}
                          onChange={(e) => handleGeneralSettingChange('approvalFrequency', e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        >
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="BIWEEKLY">Bi-Weekly</option>
                          <option value="MONTHLY">Monthly</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="input-frequency" className="block text-sm font-medium text-gray-700 mb-1">
                          Timesheet Input Frequency
                        </label>
                        <select
                          id="input-frequency"
                          value={generalSettings.inputFrequency}
                          onChange={(e) => handleGeneralSettingChange('inputFrequency', e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        >
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                        </select>
                        <p className="mt-1 text-sm text-gray-500">
                          How often employees will input their hours.
                        </p>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="allow-overtime"
                          type="checkbox"
                          checked={generalSettings.allowOvertime}
                          onChange={(e) => handleGeneralSettingChange('allowOvertime', e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="allow-overtime" className="ml-2 block text-sm text-gray-700">
                          Allow overtime hours
                        </label>
                      </div>
                      
                      {generalSettings.allowOvertime && (
                        <div>
                          <label htmlFor="overtime-rate" className="block text-sm font-medium text-gray-700 mb-1">
                            Overtime Rate
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm w-full sm:w-1/3">
                            <input
                              type="number"
                              id="overtime-rate"
                              min="1.0"
                              step="0.1"
                              value={generalSettings.overtimeRate}
                              onChange={(e) => handleGeneralSettingChange('overtimeRate', e.target.value)}
                              className="block w-full border border-gray-300 rounded-md shadow-sm p-2 pr-8"
                              placeholder="1.5"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">x</span>
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            Multiplier for overtime hours (e.g., 1.5 for time-and-a-half)
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <input
                          id="require-manager-approval"
                          type="checkbox"
                          checked={generalSettings.requireManagerApproval}
                          onChange={(e) => handleGeneralSettingChange('requireManagerApproval', e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="require-manager-approval" className="ml-2 block text-sm text-gray-700">
                          Require manager approval for timesheets
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </Tab.Panel>
              
              {/* PTO & Sick Leave Tab */}
              <Tab.Panel>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">PTO & Sick Leave Settings</h3>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="default-pto-days" className="block text-sm font-medium text-gray-700 mb-1">
                            Default PTO Days per Year
                          </label>
                          <input
                            type="number"
                            id="default-pto-days"
                            min="0"
                            value={ptoSettings.defaultPTODays}
                            onChange={(e) => handlePTOSettingChange('defaultPTODays', parseInt(e.target.value))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                          />
                          <p className="mt-1 text-sm text-gray-500">
                            Default PTO days for employees without a specific tier.
                          </p>
                        </div>
                        
                        <div>
                          <label htmlFor="default-sick-days" className="block text-sm font-medium text-gray-700 mb-1">
                            Default Sick Leave Days per Year
                          </label>
                          <input
                            type="number"
                            id="default-sick-days"
                            min="0"
                            value={ptoSettings.defaultSickDays}
                            onChange={(e) => handlePTOSettingChange('defaultSickDays', parseInt(e.target.value))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                          />
                          <p className="mt-1 text-sm text-gray-500">
                            Default sick leave days for employees without a specific tier.
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-2">PTO Tiers</h4>
                        <p className="text-sm text-gray-500 mb-3">
                          Create different PTO and sick leave tiers for different types of employees.
                        </p>
                        
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PTO Days</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sick Days</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {ptoSettings.tiers.map((tier) => (
                                <tr key={tier.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    <input
                                      type="text"
                                      value={tier.name}
                                      onChange={(e) => handleTierChange(tier.id, 'name', e.target.value)}
                                      className="border border-gray-300 rounded-md p-2 w-full"
                                      placeholder="Tier Name"
                                    />
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <input
                                      type="number"
                                      min="0"
                                      value={tier.ptoDays}
                                      onChange={(e) => handleTierChange(tier.id, 'ptoDays', parseInt(e.target.value))}
                                      className="border border-gray-300 rounded-md p-2 w-20"
                                    />
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <input
                                      type="number"
                                      min="0"
                                      value={tier.sickDays}
                                      onChange={(e) => handleTierChange(tier.id, 'sickDays', parseInt(e.target.value))}
                                      className="border border-gray-300 rounded-md p-2 w-20"
                                    />
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <button
                                      onClick={() => handleRemoveTier(tier.id)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="mt-4 bg-gray-50 p-4 rounded-md">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Add New Tier</h5>
                          <form onSubmit={handleAddTier} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label htmlFor="new-tier-name" className="block text-xs font-medium text-gray-700 mb-1">
                                Tier Name
                              </label>
                              <input
                                type="text"
                                id="new-tier-name"
                                value={newTier.name}
                                onChange={(e) => setNewTier({...newTier, name: e.target.value})}
                                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                placeholder="e.g., Executive"
                              />
                            </div>
                            
                            <div>
                              <label htmlFor="new-tier-pto-days" className="block text-xs font-medium text-gray-700 mb-1">
                                PTO Days
                              </label>
                              <input
                                type="number"
                                id="new-tier-pto-days"
                                min="0"
                                value={newTier.ptoDays}
                                onChange={(e) => setNewTier({...newTier, ptoDays: parseInt(e.target.value)})}
                                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                              />
                            </div>
                            
                            <div>
                              <label htmlFor="new-tier-sick-days" className="block text-xs font-medium text-gray-700 mb-1">
                                Sick Days
                              </label>
                              <input
                                type="number"
                                id="new-tier-sick-days"
                                min="0"
                                value={newTier.sickDays}
                                onChange={(e) => setNewTier({...newTier, sickDays: parseInt(e.target.value)})}
                                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                              />
                            </div>
                            
                            <div className="md:col-span-3">
                              <button
                                type="submit"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                              >
                                Add Tier
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Tab.Panel>
              
              {/* Company Holidays Tab */}
              <Tab.Panel>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Company Holidays</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holiday Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recurring Yearly</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {holidays.map((holiday) => (
                            <tr key={holiday.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {holiday.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {format(new Date(holiday.date), 'MMM dd, yyyy')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <input
                                  type="checkbox"
                                  checked={holiday.paid}
                                  onChange={() => {
                                    setHolidays(holidays.map(h => 
                                      h.id === holiday.id ? {...h, paid: !h.paid} : h
                                    ));
                                  }}
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <input
                                  type="checkbox"
                                  checked={holiday.recurring}
                                  onChange={() => {
                                    setHolidays(holidays.map(h => 
                                      h.id === holiday.id ? {...h, recurring: !h.recurring} : h
                                    ));
                                  }}
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <button
                                  onClick={() => handleRemoveHoliday(holiday.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-4 bg-gray-50 p-4 rounded-md">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Add New Holiday</h5>
                      <form onSubmit={handleAddHoliday} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="new-holiday-name" className="block text-xs font-medium text-gray-700 mb-1">
                            Holiday Name
                          </label>
                          <input
                            type="text"
                            id="new-holiday-name"
                            value={newHoliday.name}
                            onChange={(e) => setNewHoliday({...newHoliday, name: e.target.value})}
                            className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            placeholder="e.g., President's Day"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="new-holiday-date" className="block text-xs font-medium text-gray-700 mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            id="new-holiday-date"
                            value={newHoliday.date}
                            onChange={(e) => setNewHoliday({...newHoliday, date: e.target.value})}
                            className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                          />
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            id="new-holiday-paid"
                            type="checkbox"
                            checked={newHoliday.paid}
                            onChange={(e) => setNewHoliday({...newHoliday, paid: e.target.checked})}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="new-holiday-paid" className="ml-2 block text-sm text-gray-700">
                            Paid Holiday
                          </label>
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            id="new-holiday-recurring"
                            type="checkbox"
                            checked={newHoliday.recurring}
                            onChange={(e) => setNewHoliday({...newHoliday, recurring: e.target.checked})}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="new-holiday-recurring" className="ml-2 block text-sm text-gray-700">
                            Recurring Yearly
                          </label>
                        </div>
                        
                        <div className="md:col-span-2">
                          <button
                            type="submit"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                          >
                            Add Holiday
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save All Settings'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TimesheetSettings; 