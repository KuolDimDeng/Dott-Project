'use client';


import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';

// Import sub-components for PayAdmin
import CompanyPayroll from './tabs/admin/CompanyPayroll';
import DepartmentPayroll from './tabs/admin/DepartmentPayroll';
import EmployeePayroll from './tabs/admin/EmployeePayroll';
import PayrollHistory from './tabs/admin/PayrollHistory';
import PayrollReports from './tabs/admin/PayrollReports';

/**
 * PayAdmin Component
 * Allows HR managers and owners to view and manage company-wide pay information
 */
const PayAdmin = ({ userData, isOwner }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState(null);
  
  // Load payroll data
  useEffect(() => {
    const fetchPayrollData = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          setPayrollData({
            loaded: true,
            timestamp: new Date().toISOString()
          });
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('[PayAdmin] Error fetching payroll data:', error);
        setLoading(false);
      }
    };
    
    fetchPayrollData();
  }, []);
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Company Pay Administration</h2>
        <p className="text-gray-600">Manage and view company-wide payroll information</p>
      </div>
      
      <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
        <Tab.List className="flex border-b border-gray-200 overflow-x-auto">
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Company Overview
          </Tab>
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Department Pay
          </Tab>
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Employee Pay
          </Tab>
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Payroll History
          </Tab>
          {isOwner && (
            <Tab 
              className={({ selected }) => `
                py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
                ${selected 
                  ? 'text-blue-600 border-b-2 border-blue-500' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              Reports
            </Tab>
          )}
        </Tab.List>
        
        <Tab.Panels className="mt-4">
          <Tab.Panel>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <CompanyPayroll />
            )}
          </Tab.Panel>
          
          <Tab.Panel>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <DepartmentPayroll />
            )}
          </Tab.Panel>
          
          <Tab.Panel>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <EmployeePayroll userData={userData} isOwner={isOwner} />
            )}
          </Tab.Panel>
          
          <Tab.Panel>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <PayrollHistory />
            )}
          </Tab.Panel>
          
          {isOwner && (
            <Tab.Panel>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <PayrollReports />
              )}
            </Tab.Panel>
          )}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default PayAdmin; 