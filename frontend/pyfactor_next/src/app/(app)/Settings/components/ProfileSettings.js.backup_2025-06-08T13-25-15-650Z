// ProfileSettings.js
import React from 'react';

const ProfileSettings = ({ selectedTab }) => {
  const renderContent = () => {
    switch (selectedTab) {
      case 0:
        return (
          <form className="w-full">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1">
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="col-span-1">
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  id="phone_number"
                  name="phone_number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="col-span-1 sm:col-span-2 mt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        );
      case 1:
        return (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Password and Security</h2>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Change Password</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="current_password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="new_password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirm_password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="mt-2">
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Two-Factor Authentication</h3>
              <div className="flex items-center">
                <div className="form-switch inline-block align-middle">
                  <input 
                    type="checkbox" 
                    id="tfa-switch" 
                    className="form-switch-checkbox absolute h-0 w-0 opacity-0"
                  />
                  <label 
                    htmlFor="tfa-switch" 
                    className="form-switch-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer w-12"
                  >
                    <span className="form-switch-inner block h-6 w-10 rounded-full bg-gray-300 relative transition-transform duration-200 ease-out transform-gpu"></span>
                    <span className="form-switch-switch absolute block w-5 h-5 rounded-full bg-white shadow left-0.5 top-0.5 transition duration-200 ease-out transform-gpu"></span>
                  </label>
                </div>
                <label htmlFor="tfa-switch" className="ml-2 text-sm font-medium text-gray-700">
                  Enable Two-Factor Authentication
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Enhance your account security by requiring a verification code in addition to your password when you sign in.
              </p>
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Notifications</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Email Notifications</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center">
                    <div className="form-switch inline-block align-middle">
                      <input 
                        type="checkbox" 
                        id="invoice-payments-switch" 
                        className="form-switch-checkbox absolute h-0 w-0 opacity-0"
                        defaultChecked
                      />
                      <label 
                        htmlFor="invoice-payments-switch" 
                        className="form-switch-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer w-12"
                      >
                        <span className="form-switch-inner block h-6 w-10 rounded-full bg-gray-300 relative transition-transform duration-200 ease-out transform-gpu"></span>
                        <span className="form-switch-switch absolute block w-5 h-5 rounded-full bg-white shadow left-0.5 top-0.5 transition duration-200 ease-out transform-gpu"></span>
                      </label>
                    </div>
                    <label htmlFor="invoice-payments-switch" className="ml-2 text-sm font-medium text-gray-700">
                      Invoice Payments
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 ml-14">
                    Receive notifications when your clients pay invoices
                  </p>
                </div>
                <hr className="border-gray-200" />
                <div>
                  <div className="flex items-center">
                    <div className="form-switch inline-block align-middle">
                      <input 
                        type="checkbox" 
                        id="invoice-reminders-switch" 
                        className="form-switch-checkbox absolute h-0 w-0 opacity-0"
                        defaultChecked
                      />
                      <label 
                        htmlFor="invoice-reminders-switch" 
                        className="form-switch-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer w-12"
                      >
                        <span className="form-switch-inner block h-6 w-10 rounded-full bg-gray-300 relative transition-transform duration-200 ease-out transform-gpu"></span>
                        <span className="form-switch-switch absolute block w-5 h-5 rounded-full bg-white shadow left-0.5 top-0.5 transition duration-200 ease-out transform-gpu"></span>
                      </label>
                    </div>
                    <label htmlFor="invoice-reminders-switch" className="ml-2 text-sm font-medium text-gray-700">
                      Invoice Reminders
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 ml-14">
                    Receive notifications about unpaid invoices
                  </p>
                </div>
                <hr className="border-gray-200" />
                <div>
                  <div className="flex items-center">
                    <div className="form-switch inline-block align-middle">
                      <input 
                        type="checkbox" 
                        id="system-updates-switch" 
                        className="form-switch-checkbox absolute h-0 w-0 opacity-0"
                        defaultChecked
                      />
                      <label 
                        htmlFor="system-updates-switch" 
                        className="form-switch-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer w-12"
                      >
                        <span className="form-switch-inner block h-6 w-10 rounded-full bg-gray-300 relative transition-transform duration-200 ease-out transform-gpu"></span>
                        <span className="form-switch-switch absolute block w-5 h-5 rounded-full bg-white shadow left-0.5 top-0.5 transition duration-200 ease-out transform-gpu"></span>
                      </label>
                    </div>
                    <label htmlFor="system-updates-switch" className="ml-2 text-sm font-medium text-gray-700">
                      System Updates
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 ml-14">
                    Receive notifications about system updates and new features
                  </p>
                </div>
                <div className="mt-6">
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Businesses</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Your Businesses</h3>
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center mr-3">
                  B1
                </div>
                <div>
                  <h4 className="text-base font-medium text-gray-800">Main Business</h4>
                  <p className="text-sm text-gray-500">Active</p>
                </div>
                <button
                  type="button"
                  className="ml-auto px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Manage
                </button>
              </div>
              <hr className="border-gray-200 my-4" />
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Add New Business
              </button>
            </div>
          </div>
        );
      case 4:
        return (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Billing and Subscriptions</h2>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Current Plan</h3>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-lg font-semibold text-blue-600">Professional Plan</h4>
                  <p className="text-sm text-gray-500">$19.99/month</p>
                </div>
                <button
                  type="button"
                  className="px-3 py-1 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Upgrade Plan
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Payment Method</h3>
              <div className="flex items-center">
                <div>
                  <p className="text-base text-gray-800">•••• •••• •••• 4242</p>
                  <p className="text-sm text-gray-500">Expires 12/2025</p>
                </div>
                <button
                  type="button"
                  className="ml-auto text-blue-600 hover:text-blue-800 focus:outline-none focus:underline"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return <div>{renderContent()}</div>;
};

export default ProfileSettings;