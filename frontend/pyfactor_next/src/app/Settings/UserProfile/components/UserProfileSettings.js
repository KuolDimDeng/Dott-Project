'use client';

// UserProfileSettings.js
import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useSession } from '@/hooks/useSession-v2';
import StandardSpinner from '@/components/ui/StandardSpinner';
import {
  UserIcon,
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  UsersIcon,
  ChartBarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const UserProfileSettings = ({ userData, onUpdate, selectedSettingsOption }) => {
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    occupation: '',
    receive_notifications: true,
    two_factor_auth: false,
    language: 'en',
    timezone: 'UTC',
  });

  // Settings tabs configuration
  const settingsTabs = [
    { id: 'personal', name: 'Personal Info', icon: UserIcon },
    { id: 'account', name: 'Account Settings', icon: CogIcon },
    { id: 'security', name: 'Privacy & Security', icon: ShieldCheckIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'business', name: 'Business', icon: BuildingOfficeIcon },
    { id: 'billing', name: 'Billing', icon: CreditCardIcon },
    { id: 'team', name: 'Team', icon: UsersIcon },
    { id: 'integrations', name: 'Integrations', icon: GlobeAltIcon },
    { id: 'reports', name: 'Reports', icon: ChartBarIcon },
    { id: 'tax', name: 'Tax Settings', icon: DocumentTextIcon },
  ];

  useEffect(() => {
    // Set active tab based on selectedSettingsOption
    if (selectedSettingsOption) {
      const matchingTab = settingsTabs.find(tab => 
        tab.name.toLowerCase().includes(selectedSettingsOption.toLowerCase())
      );
      if (matchingTab) {
        setActiveTab(matchingTab.id);
      }
    }
  }, [selectedSettingsOption]);

  useEffect(() => {
    if (userData) {
      setFormData({
        ...formData,
        ...userData,
      });
    } else {
      // Fetch user data if not provided
      fetchUserData();
    }
  }, [userData]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/users/me/');
      setFormData({ ...formData, ...response.data });
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await axiosInstance.put('/api/auth/profileupdate/', formData);
      if (response.status === 200) {
        onUpdate(response.data);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <StandardSpinner size="medium" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1 bg-white rounded-lg shadow">
            {settingsTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow p-6">
            {activeTab === 'personal' && (
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1">
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                id="first_name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
              />
            </div>
            <div className="col-span-1">
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                id="last_name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                id="phone_number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-1">
                Occupation
              </label>
              <input
                id="occupation"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
              />
            </div>
          </div>
          <button 
            type="submit" 
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save Changes
          </button>
        </form>
      )}
      
            {activeTab === 'account' && (
        <div className="mt-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="col-span-1">
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                id="language"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                name="language"
                value={formData.language}
                onChange={handleChange}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
            <div className="col-span-1">
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                id="timezone"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
              >
                <option value="UTC">UTC</option>
                <option value="EST">EST</option>
                <option value="PST">PST</option>
              </select>
            </div>
            <div className="col-span-1">
              <label className="inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  name="receive_notifications"
                  checked={formData.receive_notifications}
                  onChange={handleChange}
                />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ms-3 text-sm font-medium text-gray-900">Receive Notifications</span>
              </label>
            </div>
          </div>
          <button 
            onClick={handleSubmit}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save Changes
          </button>
        </div>
      )}
      
            {activeTab === 'security' && (
        <div className="mt-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="col-span-1">
              <label className="inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  name="two_factor_auth"
                  checked={formData.two_factor_auth}
                  onChange={handleChange}
                />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ms-3 text-sm font-medium text-gray-900">Enable Two-Factor Authentication</span>
              </label>
            </div>
            <div className="col-span-1">
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                Change Password
              </button>
            </div>
            <div className="col-span-1">
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                Export Personal Data
              </button>
            </div>
          </div>
          <button 
            onClick={handleSubmit}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save Changes
          </button>
        </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
                <div className="space-y-4">
                  <div className="border-b pb-4">
                    <h3 className="text-md font-medium text-gray-900 mb-3">Email Notifications</h3>
                    <div className="space-y-2">
                      {['Marketing emails', 'Product updates', 'Security alerts', 'Invoice reminders'].map((item) => (
                        <label key={item} className="flex items-center">
                          <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                          <span className="ml-2 text-sm text-gray-700">{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Preferences</button>
                </div>
              </div>
            )}

            {activeTab === 'business' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Settings</h2>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Business Name</label>
                    <input type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Business Type</label>
                    <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                      <option>Retail</option>
                      <option>Service</option>
                      <option>Mixed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tax ID</label>
                    <input type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Business Info</button>
                </form>
              </div>
            )}

            {activeTab === 'billing' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing & Subscription</h2>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900">Current Plan</h3>
                    <p className="text-sm text-gray-600 mt-1">{formData.subscription_plan || 'Basic'} Plan</p>
                    <button className="mt-2 text-sm text-blue-600 hover:text-blue-700">Upgrade Plan</button>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Payment Method</h3>
                    <p className="text-sm text-gray-600">•••• •••• •••• 4242</p>
                    <button className="mt-2 text-sm text-blue-600 hover:text-blue-700">Update Payment Method</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Management</h2>
                <div className="mb-4">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Invite Team Member</button>
                </div>
                <div className="text-center py-8 text-gray-500">
                  <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2">No team members yet</p>
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Integrations</h2>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">WhatsApp Business</h3>
                    <p className="text-sm text-gray-600 mt-1">Connect your WhatsApp Business account</p>
                    <button className="mt-2 text-sm text-blue-600 hover:text-blue-700">Configure</button>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">Google Calendar</h3>
                    <p className="text-sm text-gray-600 mt-1">Sync your calendar events</p>
                    <button className="mt-2 text-sm text-blue-600 hover:text-blue-700">Connect</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Default Report Format</label>
                    <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                      <option>PDF</option>
                      <option>Excel</option>
                      <option>CSV</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Report Frequency</label>
                    <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                      <option>Weekly</option>
                      <option>Monthly</option>
                      <option>Quarterly</option>
                    </select>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Report Settings</button>
                </div>
              </div>
            )}

            {activeTab === 'tax' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tax Year</label>
                    <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                      <option>2025</option>
                      <option>2024</option>
                      <option>2023</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tax Method</label>
                    <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                      <option>Cash Basis</option>
                      <option>Accrual Basis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Default Tax Rate (%)</label>
                    <input type="number" step="0.01" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Tax Settings</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileSettings;