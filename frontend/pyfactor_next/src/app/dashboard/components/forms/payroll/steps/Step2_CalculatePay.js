'use client';

import React, { useState, useEffect } from 'react';
import { CurrencyDollarIcon, LightBulbIcon, CalendarIcon } from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { logger } from '@/utils/logger';
import FieldTooltip from '@/components/ui/FieldTooltip';

export default function Step2_CalculatePay({ 
  payrollData, 
  updatePayrollData, 
  onNext, 
  onPrevious 
}) {
  const [calculations, setCalculations] = useState(payrollData.calculations || null);
  const [loading, setLoading] = useState(false);
  const [payPeriod, setPayPeriod] = useState(payrollData.payPeriod || {
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    payDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!calculations) {
      calculatePayroll();
    }
  }, []);

  const calculatePayroll = async () => {
    try {
      setLoading(true);
      const selectedEmployees = payrollData.employees.filter(emp => emp.includeInPayroll);
      
      const response = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          employees: selectedEmployees,
          payPeriod
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCalculations(data.calculations);
        updatePayrollData('calculations', data.calculations);
        updatePayrollData('payPeriod', payPeriod);
      }
    } catch (error) {
      logger.error('Error calculating payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOvertime = async (employeeId, overtimeAmount) => {
    const updatedCalculations = {
      ...calculations,
      employees: calculations.employees.map(emp => 
        emp.id === employeeId 
          ? { 
              ...emp, 
              overtime: parseFloat(overtimeAmount) || 0,
              grossPay: emp.basePay + (parseFloat(overtimeAmount) || 0) + emp.bonus
            }
          : emp
      )
    };
    
    updatedCalculations.totalGross = updatedCalculations.employees.reduce(
      (sum, emp) => sum + emp.grossPay, 
      0
    );
    
    setCalculations(updatedCalculations);
    updatePayrollData('calculations', updatedCalculations);
  };

  const updateBonus = async (employeeId, bonusAmount) => {
    const updatedCalculations = {
      ...calculations,
      employees: calculations.employees.map(emp => 
        emp.id === employeeId 
          ? { 
              ...emp, 
              bonus: parseFloat(bonusAmount) || 0,
              grossPay: emp.basePay + emp.overtime + (parseFloat(bonusAmount) || 0)
            }
          : emp
      )
    };
    
    updatedCalculations.totalGross = updatedCalculations.employees.reduce(
      (sum, emp) => sum + emp.grossPay, 
      0
    );
    
    setCalculations(updatedCalculations);
    updatePayrollData('calculations', updatedCalculations);
  };

  const handlePayPeriodChange = (field, value) => {
    const newPayPeriod = { ...payPeriod, [field]: value };
    setPayPeriod(newPayPeriod);
    updatePayrollData('payPeriod', newPayPeriod);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <StandardSpinner size="large" />
      </div>
    );
  }

  const overtimeEmployees = calculations?.employees.filter(emp => emp.overtime > 0).length || 0;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <CurrencyDollarIcon className="h-6 w-6 text-blue-600 mr-2" />
          Calculate Pay
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Review and adjust gross pay calculations for each employee
        </p>
      </div>

      {/* Pay Period Selector */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Pay Period Start
              <FieldTooltip content="The first day of this pay period" />
            </label>
            <div className="mt-1 relative">
              <input
                type="date"
                value={payPeriod.startDate}
                onChange={(e) => handlePayPeriodChange('startDate', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <CalendarIcon className="absolute right-2 top-2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Pay Period End
              <FieldTooltip content="The last day of this pay period" />
            </label>
            <div className="mt-1 relative">
              <input
                type="date"
                value={payPeriod.endDate}
                onChange={(e) => handlePayPeriodChange('endDate', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <CalendarIcon className="absolute right-2 top-2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Payment Date
              <FieldTooltip content="The date employees will receive their pay" />
            </label>
            <div className="mt-1 relative">
              <input
                type="date"
                value={payPeriod.payDate}
                onChange={(e) => handlePayPeriodChange('payDate', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <CalendarIcon className="absolute right-2 top-2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
        
        <button
          onClick={calculatePayroll}
          className="mt-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Recalculate
        </button>
      </div>

      {/* Calculations Table */}
      {calculations && (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base Pay
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overtime
                  <FieldTooltip content="Additional pay for hours worked beyond regular schedule" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bonuses
                  <FieldTooltip content="One-time additional payments for this period" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross Pay
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {calculations.employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {employee.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(employee.basePay)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={employee.overtime || ''}
                      onChange={(e) => updateOvertime(employee.id, e.target.value)}
                      placeholder="0.00"
                      className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={employee.bonus || ''}
                      onChange={(e) => updateBonus(employee.id, e.target.value)}
                      placeholder="0.00"
                      className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(employee.grossPay)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan="4" className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                  Total Gross Pay
                </td>
                <td className="px-6 py-3 text-sm font-bold text-gray-900">
                  {formatCurrency(calculations.totalGross)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* AI Insights */}
      {overtimeEmployees > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <LightBulbIcon className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800">
                <strong>Insight:</strong> {overtimeEmployees} employee{overtimeEmployees > 1 ? 's have' : ' has'} worked overtime this period. 
                Consider adjusting schedules or hiring additional staff to reduce overtime costs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onPrevious}
          className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Continue to Deductions
        </button>
      </div>
    </div>
  );
}