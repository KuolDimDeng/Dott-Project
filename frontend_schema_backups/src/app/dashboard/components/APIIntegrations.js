// src/app/dashboard/components/APIIntegrations.js
import React from 'react';

const APIIntegrations = ({ onECommerceClick, onCRMClick }) => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        API & Integrations
      </h1>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mt-6">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              E-Commerce Platform API
            </h2>
            <a
              href="#"
              onClick={onECommerceClick}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer mt-2 inline-block"
            >
              Click here
            </a>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              CRM API
            </h2>
            <a
              href="#"
              onClick={onCRMClick}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer mt-2 inline-block"
            >
              Click here
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIIntegrations;