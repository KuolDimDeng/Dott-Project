'use client';

import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  CalculatorIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const SelfServicePayrollFiling = ({ filingId, onClose }) => {
  const [instructions, setInstructions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [completedSteps, setCompletedSteps] = useState([]);

  useEffect(() => {
    fetchFilingInstructions();
  }, [filingId]);

  const fetchFilingInstructions = async () => {
    try {
      const response = await fetch(`/api/taxes/payroll/filing/${filingId}/instructions/`);
      const data = await response.json();
      if (data.success) {
        setInstructions(data.instructions);
      }
    } catch (error) {
      console.error('Error fetching instructions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = (stepNumber) => {
    if (!completedSteps.includes(stepNumber)) {
      setCompletedSteps([...completedSteps, stepNumber]);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    // This would call an API to generate PDF
    alert('PDF download will be implemented');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!instructions) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Unable to load filing instructions</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: DocumentTextIcon },
    { id: 'calculations', label: 'Tax Calculations', icon: CalculatorIcon },
    { id: 'where', label: 'Where to File', icon: BuildingOfficeIcon },
    { id: 'steps', label: 'Step-by-Step', icon: ClipboardDocumentCheckIcon },
    { id: 'payment', label: 'Payment', icon: CurrencyDollarIcon },
    { id: 'help', label: 'Help', icon: InformationCircleIcon }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Self-Service Payroll Tax Filing Instructions
            </h1>
            <p className="text-gray-600">
              Period: {instructions.filing_summary.period} | 
              Jurisdiction: {instructions.filing_summary.jurisdiction}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
            >
              <PrinterIcon className="h-5 w-5" />
              Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Important Notice */}
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">Self-Service Filing</p>
              <p className="text-sm text-yellow-800 mt-1">
                These instructions help you file your payroll taxes yourself. 
                Dott has calculated your taxes, but you are responsible for filing with the tax authority.
                Keep all confirmations for your records.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b">
          <nav className="flex space-x-1 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Filing Summary</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Total Tax Due:</dt>
                      <dd className="font-bold text-lg">${instructions.tax_calculations.total_tax_due}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Due Date:</dt>
                      <dd className="font-semibold text-red-600">{instructions.deadlines.due_date}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Employees:</dt>
                      <dd>{instructions.tax_calculations.employee_count}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Filing Frequency:</dt>
                      <dd className="capitalize">{instructions.deadlines.filing_frequency}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Required Actions</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                      <span>File tax return by {instructions.deadlines.due_date}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                      <span>Pay ${instructions.tax_calculations.total_tax_due}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                      <span>Keep confirmation for records</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-3">Forms Needed</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <ul className="space-y-2">
                    <li className="flex justify-between">
                      <span>Main Return Form:</span>
                      <span className="font-semibold">{instructions.forms_needed.employer_return}</span>
                    </li>
                    {instructions.forms_needed.payment_voucher && (
                      <li className="flex justify-between">
                        <span>Payment Voucher:</span>
                        <span className="font-semibold">{instructions.forms_needed.payment_voucher}</span>
                      </li>
                    )}
                  </ul>
                  <a 
                    href={instructions.forms_needed.where_to_download}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm mt-3 inline-block"
                  >
                    Download forms →
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Tax Calculations Tab */}
          {activeTab === 'calculations' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-lg mb-4">Tax Calculation Summary</h3>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <dl className="space-y-3">
                  <div className="flex justify-between py-2">
                    <dt className="text-gray-600">Gross Wages:</dt>
                    <dd className="font-semibold">${instructions.tax_calculations.gross_wages}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-gray-600">Employee Tax (withheld):</dt>
                    <dd className="font-semibold">${instructions.tax_calculations.total_employee_tax}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-gray-600">Employer Tax (additional):</dt>
                    <dd className="font-semibold">${instructions.tax_calculations.total_employer_tax}</dd>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <dt className="text-gray-900 font-semibold">Total Tax Due:</dt>
                    <dd className="font-bold text-xl text-blue-600">
                      ${instructions.tax_calculations.total_tax_due}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="border rounded-lg p-4 bg-blue-50">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> These calculations are based on {instructions.tax_calculations.employee_count} employees 
                  for the period {instructions.filing_summary.period}. 
                  Use these exact amounts when filing your return.
                </p>
              </div>

              {instructions.tax_calculations.breakdown && (
                <div>
                  <h4 className="font-semibold mb-3">Detailed Breakdown</h4>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left p-3 border">Component</th>
                        <th className="text-right p-3 border">Amount</th>
                        <th className="text-left p-3 border">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {instructions.tax_calculations.breakdown.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 border">{item.component}</td>
                          <td className="p-3 border text-right">${item.amount}</td>
                          <td className="p-3 border text-sm text-gray-600">{item.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Where to File Tab */}
          {activeTab === 'where' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-lg mb-4">Where to File Your Taxes</h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-600" />
                    Tax Authority
                  </h4>
                  <p className="font-semibold text-lg mb-2">{instructions.where_to_file.tax_authority}</p>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-gray-600">Phone:</dt>
                      <dd>{instructions.where_to_file.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Hours:</dt>
                      <dd>{instructions.where_to_file.business_hours}</dd>
                    </div>
                    {instructions.where_to_file.physical_address && (
                      <div>
                        <dt className="text-gray-600">Mailing Address:</dt>
                        <dd>{instructions.where_to_file.physical_address}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {instructions.where_to_file.online_available && (
                  <div className="border rounded-lg p-6 bg-green-50">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-900">
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      Online Filing Available
                    </h4>
                    <p className="font-semibold mb-2">{instructions.where_to_file.portal_name}</p>
                    <a
                      href={instructions.where_to_file.online_portal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      Go to Online Portal →
                    </a>
                    <p className="text-sm text-green-800 mt-3">
                      Online filing is faster and provides instant confirmation
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Always use official government websites and phone numbers. 
                  Be cautious of scams pretending to be tax authorities.
                </p>
              </div>
            </div>
          )}

          {/* Step-by-Step Tab */}
          {activeTab === 'steps' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-lg mb-4">Step-by-Step Filing Guide</h3>

              <div className="space-y-4">
                {instructions.step_by_step_guide.map((step, idx) => (
                  <div key={idx} className="border rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        completedSteps.includes(step.step)
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {completedSteps.includes(step.step) ? (
                          <CheckCircleIcon className="h-6 w-6" />
                        ) : (
                          step.step
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">{step.title}</h4>
                        <p className="text-gray-700 mb-3">{step.instructions}</p>
                        {step.tips && (
                          <div className="bg-blue-50 rounded p-3">
                            <p className="text-sm font-medium text-blue-900 mb-1">Tips:</p>
                            <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                              {step.tips.map((tip, tipIdx) => (
                                <li key={tipIdx}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <button
                          onClick={() => handleStepComplete(step.step)}
                          className={`mt-3 px-4 py-2 rounded-md text-sm ${
                            completedSteps.includes(step.step)
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                          disabled={completedSteps.includes(step.step)}
                        >
                          {completedSteps.includes(step.step) ? 'Completed' : 'Mark as Complete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {completedSteps.length === instructions.step_by_step_guide.length && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="font-semibold text-green-900">All steps completed!</p>
                  <p className="text-sm text-green-800 mt-1">
                    Make sure to keep all confirmations and receipts for your records.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Payment Tab */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-lg mb-4">Payment Instructions</h3>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-blue-900">Amount Due:</span>
                  <span className="text-3xl font-bold text-blue-900">
                    ${instructions.payment_instructions.payment_amount}
                  </span>
                </div>
                <div className="text-sm text-blue-800">
                  <p><strong>Reference Number:</strong> {instructions.payment_instructions.reference_number}</p>
                  <p className="mt-1">Include this reference with your payment</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Payment Methods</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {instructions.payment_instructions.payment_methods.map((method, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <p className="font-medium">{method}</p>
                    </div>
                  ))}
                </div>
              </div>

              {instructions.payment_instructions.online_payment_url && (
                <div className="border rounded-lg p-6 bg-green-50">
                  <h4 className="font-semibold mb-3">Online Payment</h4>
                  <p className="mb-4">Pay online for instant confirmation</p>
                  <a
                    href={instructions.payment_instructions.online_payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700"
                  >
                    Pay Online Now →
                  </a>
                </div>
              )}

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <strong>Late Payment Warning:</strong> {instructions.deadlines.late_payment_penalty}
                </p>
              </div>
            </div>
          )}

          {/* Help Tab */}
          {activeTab === 'help' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-lg mb-4">Help & Resources</h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Contact Information</h4>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-gray-600">Phone Support:</dt>
                      <dd className="font-medium">{instructions.help_resources.phone_support}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Email:</dt>
                      <dd className="font-medium">{instructions.help_resources.email_support}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Official Website:</dt>
                      <dd>
                        <a
                          href={instructions.help_resources.official_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Visit Website →
                        </a>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Common Mistakes to Avoid</h4>
                  <ul className="space-y-2">
                    {(instructions.common_mistakes || []).map((mistake, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <span className="text-sm">{mistake}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-semibold mb-3">Additional Resources</h4>
                <div className="space-y-2">
                  {instructions.help_resources.faq_url && (
                    <a
                      href={instructions.help_resources.faq_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-600 hover:text-blue-800"
                    >
                      Frequently Asked Questions →
                    </a>
                  )}
                  <p className="text-sm text-gray-600">
                    {instructions.help_resources.video_guides?.search}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end gap-4">
        <button
          onClick={onClose}
          className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Close
        </button>
        <button
          onClick={() => window.open(instructions.where_to_file.online_portal, '_blank')}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          disabled={!instructions.where_to_file.online_portal}
        >
          Go to Tax Portal
        </button>
      </div>
    </div>
  );
};

export default SelfServicePayrollFiling;