'use client';

import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

const GeneralLedgerManagement = () => {
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [summary, setSummary] = useState([]);
  const toast = useToast();
  const [generalLedgerEntries, setGeneralLedgerEntries] = useState([]);
  const [generalLedgerSummary, setGeneralLedgerSummary] = useState([]);

  useEffect(() => {
    fetchAccounts();
    fetchGeneralLedgerSummary();
    fetchGeneralLedger();
  }, []);

  useEffect(() => {
    console.log('Effect triggered. Selected account:', selectedAccount);
    fetchGeneralLedger();
  }, [selectedAccount, startDate, endDate]);

  const fetchAccounts = async () => {
    try {
      const response = await axiosInstance.get('/api/finance/chart-of-accounts/');
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchGeneralLedger = async () => {
    try {
      const response = await axiosInstance.get('/api/finance/general-ledger/', {
        params: {
          account_id: selectedAccount,
          start_date: startDate ? formatDate(startDate) : null,
          end_date: endDate ? formatDate(endDate) : null,
        },
      });
      setGeneralLedgerEntries(response.data);
      setLedgerEntries(response.data);
    } catch (error) {
      console.error('Error fetching general ledger:', error);
    }
  };

  const fetchGeneralLedgerSummary = async () => {
    try {
      const response = await axiosInstance.get('/api/finance/general-ledger-summary/');
      setGeneralLedgerSummary(response.data);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching general ledger summary:', error);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2 flex items-center">
          <svg className="h-6 w-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          General Ledger
        </h2>
        <p className="text-gray-600 text-sm">View detailed transaction history by account with running balances and comprehensive filtering options.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md bg-white"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <option value="">All Accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={formatDate(startDate)}
            onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={formatDate(endDate)}
            onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Account
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reference
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Debit
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Credit
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {generalLedgerEntries.length > 0 ? (
              generalLedgerEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.account_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.reference}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {entry.debit_amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {entry.credit_amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {entry.balance}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No ledger entries found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 className="text-xl font-semibold mb-4">Account Balances Summary</h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Account Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Account Name
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {summary.length > 0 ? (
              summary.map((item) => (
                <tr key={item.account_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.account_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.account_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.balance}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                  No account summary data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GeneralLedgerManagement;