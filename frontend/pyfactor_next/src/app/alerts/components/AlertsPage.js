'use client';
import React from 'react';

const AlertsPage = ({ alerts, onMarkAsRead }) => {
  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">
        Alerts
      </h1>
      <ul className="divide-y divide-gray-200">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className={`${
              alert.is_read ? 'bg-white' : 'bg-blue-50'
            } hover:bg-gray-100 transition-colors duration-150 cursor-pointer px-4 py-3`}
            onClick={() => onMarkAsRead(alert.id)}
          >
            <div>
              <h3 
                className={`${
                  alert.is_read ? 'font-normal' : 'font-semibold'
                } text-blue-600`}
              >
                {alert.alert.subject}
              </h3>
              <div className="mt-1">
                <span className="text-sm text-gray-700 block">
                  {new Date(alert.alert.created_at).toLocaleString()}
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  {alert.alert.message}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AlertsPage;