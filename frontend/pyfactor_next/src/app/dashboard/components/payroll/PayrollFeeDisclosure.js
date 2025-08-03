'use client';

import React from 'react';
import {
  CheckCircleIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ClockIcon,
  DocumentCheckIcon,
  BanknotesIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline';

const PayrollFeeDisclosure = () => {
  const benefits = [
    {
      icon: CalculatorIcon,
      title: 'Automatic Tax Calculations',
      description: 'Accurate payroll tax calculations for all countries and states'
    },
    {
      icon: DocumentCheckIcon,
      title: 'Electronic Filing',
      description: 'We file all tax forms electronically with government agencies'
    },
    {
      icon: BanknotesIcon,
      title: 'Direct Deposit',
      description: 'Employees receive payments directly to their bank accounts'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Compliance Guarantee',
      description: 'We ensure compliance with all local tax laws and regulations'
    },
    {
      icon: ClockIcon,
      title: 'Time Savings',
      description: 'Save 20+ hours monthly on payroll processing'
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Cost Effective',
      description: 'Save $500+ monthly vs traditional payroll services'
    }
  ];

  const costComparison = [
    {
      employees: 5,
      avgSalary: 2000,
      totalTaxes: 2000,
      ourFee: 48,
      traditionalCost: 300,
      savings: 252
    },
    {
      employees: 10,
      avgSalary: 2000,
      totalTaxes: 4000,
      ourFee: 96,
      traditionalCost: 500,
      savings: 404
    },
    {
      employees: 20,
      avgSalary: 2000,
      totalTaxes: 8000,
      ourFee: 192,
      traditionalCost: 800,
      savings: 608
    },
    {
      employees: 50,
      avgSalary: 2000,
      totalTaxes: 20000,
      ourFee: 480,
      traditionalCost: 1500,
      savings: 1020
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Transparent Payroll Processing Fees
        </h2>
        <p className="text-xl text-gray-600">
          Simple, fair pricing that saves you money
        </p>
      </div>

      {/* Fee Structure */}
      <div className="bg-blue-50 rounded-xl p-8 mb-12">
        <h3 className="text-2xl font-bold text-blue-900 mb-6 text-center">
          Our Fee Structure
        </h3>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Tax Processing Fee</h4>
              <span className="text-3xl font-bold text-blue-600">2.4%</span>
            </div>
            <p className="text-gray-600">
              Of all tax payments we process on your behalf. This covers calculating,
              filing, and remitting all payroll taxes.
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Direct Deposit Fee</h4>
              <span className="text-3xl font-bold text-blue-600">$2</span>
            </div>
            <p className="text-gray-600">
              Per employee per payment. Ensures fast, secure direct deposits to
              employee bank accounts.
            </p>
          </div>
        </div>
        <div className="mt-6 text-center">
          <p className="text-lg font-medium text-blue-900">
            No hidden fees • No setup costs • No monthly minimums
          </p>
        </div>
      </div>

      {/* What You Get */}
      <div className="mb-12">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          What's Included
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="bg-green-100 rounded-lg p-3">
                <benefit.icon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{benefit.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost Comparison Table */}
      <div className="mb-12">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Cost Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border">
                  Employees
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border">
                  Monthly Taxes
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border">
                  Our Fee
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border">
                  Traditional Services
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-green-900 border">
                  Your Savings
                </th>
              </tr>
            </thead>
            <tbody>
              {costComparison.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border">{row.employees}</td>
                  <td className="px-4 py-3 border">${row.totalTaxes.toLocaleString()}</td>
                  <td className="px-4 py-3 border">
                    ${row.ourFee + row.employees * 2}
                    <span className="text-xs text-gray-500 block">
                      (${row.ourFee} + ${row.employees * 2})
                    </span>
                  </td>
                  <td className="px-4 py-3 border">${row.traditionalCost}</td>
                  <td className="px-4 py-3 border font-semibold text-green-600">
                    ${row.savings}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Example Calculation */}
      <div className="bg-gray-50 rounded-xl p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Example: Processing Payroll for 10 Employees
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-700">Total Gross Salaries</span>
            <span className="font-semibold">$20,000.00</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-700">Total Taxes (Employee + Employer)</span>
            <span className="font-semibold">$4,000.00</span>
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700">Tax Processing Fee (2.4% × $4,000)</span>
              <span className="font-semibold">$96.00</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700">Direct Deposit Fee (10 × $2)</span>
              <span className="font-semibold">$20.00</span>
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">Total Monthly Fee</span>
              <span className="text-2xl font-bold text-blue-600">$116.00</span>
            </div>
          </div>
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <p className="text-green-900 font-semibold">
              Compare to traditional services: $500+/month
            </p>
            <p className="text-green-700 text-sm mt-1">
              You save $384+ every month!
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-12 text-center">
        <button className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition">
          Start Processing Payroll Today
        </button>
        <p className="text-sm text-gray-600 mt-4">
          No contracts • Cancel anytime • Start saving immediately
        </p>
      </div>
    </div>
  );
};

export default PayrollFeeDisclosure;