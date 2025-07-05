'use client';

import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { format } from 'date-fns';

// Import sub-components
import CurrentPay from './tabs/CurrentPay';
import PayHistory from './tabs/PayHistory';
import YTDSummary from './tabs/YTDSummary';
import Deposit from './tabs/Deposit';
import IncomeTax from './tabs/IncomeTax';
import Statement from './tabs/Statement';

const MyPay = ({ userData }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [payData, setPayData] = useState(null);
  const [payStatements, setPayStatements] = useState([]);
  
  useEffect(() => {
    const fetchPayData = async () => {
      try {
        // In a real app, this would fetch from the API
        // For now, we'll use mock data
        setTimeout(() => {
          setPayData({
            currentPay: {
              amount: 3500.00,
              currency: 'USD',
              payPeriod: 'Bi-weekly',
              nextPayDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
              regularHours: 80,
              overtimeHours: 0,
              grossPay: 3500.00,
              netPay: 2680.50,
              deductions: {
                federalTax: 525.00,
                stateTax: 175.00,
                medicare: 50.75,
                socialSecurity: 217.00,
                retirement401k: 175.00,
                healthInsurance: 124.75,
                otherDeductions: 52.00
              }
            },
            ytdSummary: {
              grossPay: 31500.00,
              netPay: 24124.50,
              federalTax: 4725.00,
              stateTax: 1575.00,
              medicare: 456.75,
              socialSecurity: 1953.00,
              retirement401k: 1575.00,
              healthInsurance: 1122.75,
              otherDeductions: 468.00
            },
            deposit: {
              method: 'Direct Deposit',
              bankName: 'First National Bank',
              accountType: 'Checking',
              accountLastFour: '4321',
              routingLastFour: '9876'
            },
            incomeTax: {
              federalFilingStatus: 'Single',
              federalAllowances: 1,
              stateCode: 'CA',
              stateFilingStatus: 'Single',
              stateAllowances: 1,
              additionalWithholding: 0
            }
          });
          
          setPayStatements([
            {
              id: '1',
              payPeriodStart: '2023-06-01',
              payPeriodEnd: '2023-06-15',
              payDate: '2023-06-20',
              grossPay: 3500.00,
              netPay: 2680.50,
              type: 'Regular'
            },
            {
              id: '2',
              payPeriodStart: '2023-05-16',
              payPeriodEnd: '2023-05-31',
              payDate: '2023-06-05',
              grossPay: 3500.00,
              netPay: 2680.50,
              type: 'Regular'
            },
            {
              id: '3',
              payPeriodStart: '2023-05-01',
              payPeriodEnd: '2023-05-15',
              payDate: '2023-05-20',
              grossPay: 3500.00,
              netPay: 2680.50,
              type: 'Regular'
            },
            {
              id: '4',
              payPeriodStart: '2023-04-16',
              payPeriodEnd: '2023-04-30',
              payDate: '2023-05-05',
              grossPay: 3500.00,
              netPay: 2680.50,
              type: 'Regular'
            }
          ]);
          
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('[MyPay] Error fetching pay data:', error);
        setLoading(false);
      }
    };
    
    fetchPayData();
  }, []);
  
  return (
    <div>
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
            Current Pay
          </Tab>
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Pay History
          </Tab>
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            YTD Summary
          </Tab>
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Deposit
          </Tab>
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Income Tax
          </Tab>
          <Tab 
            className={({ selected }) => `
              py-3 px-5 text-sm font-medium outline-none whitespace-nowrap
              ${selected 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Statement
          </Tab>
        </Tab.List>
        
        <Tab.Panels className="mt-4">
          <Tab.Panel>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <CurrentPay currentPay={payData?.currentPay} />
            )}
          </Tab.Panel>
          
          <Tab.Panel>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <PayHistory payStatements={payStatements} />
            )}
          </Tab.Panel>
          
          <Tab.Panel>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <YTDSummary ytdSummary={payData?.ytdSummary} />
            )}
          </Tab.Panel>
          
          <Tab.Panel>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <Deposit deposit={payData?.deposit} userData={userData} />
            )}
          </Tab.Panel>
          
          <Tab.Panel>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <IncomeTax incomeTax={payData?.incomeTax} userData={userData} />
            )}
          </Tab.Panel>
          
          <Tab.Panel>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <Statement payStatements={payStatements} />
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default MyPay; 