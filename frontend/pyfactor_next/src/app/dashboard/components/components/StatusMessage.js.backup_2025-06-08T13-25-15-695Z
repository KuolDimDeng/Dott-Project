// components/StatusMessage.js
import React from 'react';

const StatusMessage = ({ status, message }) => (
  <div 
    className={`my-4 p-4 rounded ${
      status === 'success' 
        ? 'bg-green-50 dark:bg-green-900/20' 
        : 'bg-red-50 dark:bg-red-900/20'
    }`}
  >
    <p className={`${
      status === 'success' 
        ? 'text-green-600 dark:text-green-400' 
        : 'text-red-600 dark:text-red-400'
    }`}>
      {message}
    </p>
  </div>
);

export default StatusMessage;
