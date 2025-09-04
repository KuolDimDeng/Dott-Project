'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BusinessMenu() {
  const router = useRouter();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const sessionData = localStorage.getItem('user_session');
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      setUserName(parsed.user?.full_name || 'Business User');
    }
    localStorage.setItem('userMode', 'business');
    localStorage.setItem('hasBusiness', 'true');
  }, []);

  const menuItems = [
    { icon: '💰', title: 'POS Terminal', path: '/mobile/pos' },
    { icon: '⏰', title: 'Timesheet', path: '/mobile/timesheet' },
    { icon: '📊', title: 'Reports', path: '/dashboard/reports' },
    { icon: '👥', title: 'Employees', path: '/dashboard/employees' },
    { icon: '📦', title: 'Inventory', path: '/dashboard/inventory' },
    { icon: '💳', title: 'Expenses', path: '/dashboard/expenses' },
    { icon: '📄', title: 'Invoices', path: '/dashboard/invoices' },
    { icon: '🏦', title: 'Banking', path: '/dashboard/banking' },
    { icon: '📈', title: 'More', path: '/mobile/more' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 pb-20">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome back!</h1>
            <p className="text-blue-100">{userName}</p>
          </div>
          <button
            onClick={() => router.push('/mobile/consumer-menu')}
            className="bg-white/20 backdrop-blur text-white px-3 py-1 rounded-full text-sm"
          >
            Switch to Consumer
          </button>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-lg p-3 mt-4">
          <p className="text-sm">Today\'s Sales</p>
          <p className="text-2xl font-bold">$0.00</p>
        </div>
      </div>
      
      <div className="px-4 -mt-12">
        <div className="grid grid-cols-3 gap-4">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => router.push(item.path)}
              className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
            >
              <span className="text-3xl mb-2">{item.icon}</span>
              <span className="text-xs text-gray-700 text-center">{item.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Unified Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-around py-2">
          <button
            onClick={() => router.push('/mobile/call')}
            className="flex flex-col items-center py-2 px-3"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-xs text-gray-600 mt-1">Call</span>
          </button>
          
          <button
            onClick={() => router.push('/mobile/consumer-menu')}
            className="flex flex-col items-center py-2 px-3"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs text-gray-600 mt-1">Marketplace</span>
          </button>
          
          <button
            className="flex flex-col items-center py-2 px-3"
          >
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-xs text-blue-600 mt-1">Business</span>
          </button>
          
          <button
            onClick={() => router.push('/mobile/chat')}
            className="flex flex-col items-center py-2 px-3"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs text-gray-600 mt-1">Chat</span>
          </button>
          
          <button
            onClick={() => router.push('/mobile/account-business')}
            className="flex flex-col items-center py-2 px-3"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-gray-600 mt-1">Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}