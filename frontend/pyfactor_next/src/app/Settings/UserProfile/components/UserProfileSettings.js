'use client';

// UserProfileSettings.js
import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';

const UserProfileSettings = ({ userData, onUpdate }) => {
  const [activeTab, setActiveTab] = useState(0);
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

  useEffect(() => {
    if (userData) {
      setFormData({
        ...formData,
        ...userData,
      });
    }
  }, [userData]);

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

  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
  };

  return (
    <div className="mt-6">
      <h4 className="text-2xl font-semibold mb-4">
        User Profile Settings
      </h4>
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            className={`py-2 px-4 font-medium text-sm mr-8 ${
              activeTab === 0
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(0)}
          >
            Personal Info
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm mr-8 ${
              activeTab === 1
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(1)}
          >
            Account Settings
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm ${
              activeTab === 2
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange(2)}
          >
            Privacy & Security
          </button>
        </nav>
      </div>
      
      {activeTab === 0 && (
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
      
      {activeTab === 1 && (
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
      
      {activeTab === 2 && (
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
    </div>
  );
};

export default UserProfileSettings;