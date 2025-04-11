import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

const PayrollTransactions = () => {
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [archivedYears, setArchivedYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [expandEmployees, setExpandEmployees] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchPayrollRuns();
    fetchArchivedYears();
  }, [selectedYear]);

  const fetchPayrollRuns = async () => {
    try {
      const response = await axiosInstance.get('/api/payroll/runs/', {
        params: {
          year: selectedYear,
          start_date: startDate ? formatDateForAPI(startDate) : null,
          end_date: endDate ? formatDateForAPI(endDate) : null,
        },
      });
      setPayrollRuns(response.data);
    } catch (error) {
      toast.error('Error fetching payroll runs');
      console.error('Error fetching payroll runs:', error);
    }
  };

  const fetchArchivedYears = async () => {
    try {
      const response = await axiosInstance.get('/api/payroll/archived-years/');
      setArchivedYears(response.data);
    } catch (error) {
      toast.error('Error fetching archived years');
      console.error('Error fetching archived years:', error);
    }
  };

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
  };

  const handleApplyFilter = () => {
    fetchPayrollRuns();
  };

  const handleRowClick = async (runId) => {
    try {
      const response = await axiosInstance.get(`/api/payroll/runs/${runId}/`);
      setSelectedRun(response.data);
      setOpenDialog(true);
    } catch (error) {
      toast.error('Error fetching payroll run details');
      console.error('Error fetching payroll run details:', error);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  // Format date for API
  const formatDateForAPI = (date) => {
    if (!date) return null;
    return date instanceof Date ? date.toISOString() : date;
  };

  // Format date for input type="date"
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Payroll Transactions</h1>
      <p className="text-gray-600 mb-6">Manage your payroll transactions.</p>

      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <select
            value={selectedYear}
            onChange={handleYearChange}
            className="w-full p-2 border border-gray-300 rounded-md bg-white"
          >
            <option value={new Date().getFullYear()}>Current Year</option>
            {archivedYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate ? formatDateForInput(startDate) : ''}
            onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
            className="p-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate ? formatDateForInput(endDate) : ''}
            onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
            className="p-2 border border-gray-300 rounded-md"
          />
        </div>

        <button
          onClick={handleApplyFilter}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Apply Filter
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Run Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payrollRuns.map((run) => (
              <tr 
                key={run.id} 
                onClick={() => handleRowClick(run.id)} 
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(run.run_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(run.start_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(run.end_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {run.status}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${run.total_amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog */}
      {openDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Payroll Run Details</h2>
              <button 
                onClick={() => setOpenDialog(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedRun && (
              <div>
                <h3 className="text-lg font-semibold mb-2">General Information</h3>
                <div className="space-y-1 mb-4">
                  <p className="text-sm">
                    <span className="font-medium">Run Date:</span> {formatDate(selectedRun.run_date)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Start Date:</span> {formatDate(selectedRun.start_date)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">End Date:</span> {formatDate(selectedRun.end_date)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Status:</span> {selectedRun.status}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Total Amount:</span> ${selectedRun.total_amount.toFixed(2)}
                  </p>
                </div>

                <h3 className="text-lg font-semibold mt-4 mb-2">Employee Details</h3>
                <div className="border border-gray-200 rounded-md mb-4">
                  <button
                    className="flex w-full justify-between items-center p-3 focus:outline-none"
                    onClick={() => setExpandEmployees(!expandEmployees)}
                  >
                    <span className="font-medium">Employee List</span>
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        expandEmployees ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {expandEmployees && (
                    <div className="p-3 border-t border-gray-200">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Name
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Amount
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Bank Details
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {selectedRun.employees.map((employee) => (
                              <tr key={employee.id}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {employee.name}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                  ${employee.amount.toFixed(2)}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {employee.bank_details}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-semibold mt-4 mb-2">Notes</h3>
                <p className="text-sm text-gray-700">
                  {selectedRun.notes || 'No notes available.'}
                </p>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setOpenDialog(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollTransactions;