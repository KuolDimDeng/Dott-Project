// src/components/MonthEndManagement.js

import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';

const MonthEndManagement = () => {
  const [closings, setClosings] = useState([]);
  const [selectedClosing, setSelectedClosing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newClosing, setNewClosing] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: 'in_progress',
    notes: '',
  });

  useEffect(() => {
    fetchClosings();
  }, []);

  const fetchClosings = async () => {
    try {
      const response = await axiosInstance.get('/api/month-end-closings/');
      setClosings(response.data);
    } catch (error) {
      console.error('Error fetching month-end closings:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewClosing({ ...newClosing, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/api/month-end-closings/', newClosing);
      fetchClosings();
      setDialogOpen(false);
      setNewClosing({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        status: 'in_progress',
        notes: '',
      });
    } catch (error) {
      console.error('Error creating month-end closing:', error);
    }
  };

  const handleTaskUpdate = async (taskId, isCompleted) => {
    try {
      await axiosInstance.put(`/api/month-end-tasks/${taskId}/`, { is_completed: isCompleted });
      const updatedClosing = await axiosInstance.get(
        `/api/month-end-closings/${selectedClosing.id}/`
      );
      setSelectedClosing(updatedClosing.data);
      fetchClosings();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 py-2">
        <h1 className="text-2xl font-semibold text-gray-800">
          Month-End Closing Management
        </h1>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Start New Closing
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900">Month</th>
              <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900">Year</th>
              <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900">Started At</th>
              <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900">Completed At</th>
              <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {closings.map((closing) => (
              <tr key={closing.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap py-4 px-3 text-sm text-gray-500">{closing.month}</td>
                <td className="whitespace-nowrap py-4 px-3 text-sm text-gray-500">{closing.year}</td>
                <td className="whitespace-nowrap py-4 px-3 text-sm text-gray-500">{closing.status}</td>
                <td className="whitespace-nowrap py-4 px-3 text-sm text-gray-500">{new Date(closing.started_at).toLocaleString()}</td>
                <td className="whitespace-nowrap py-4 px-3 text-sm text-gray-500">
                  {closing.completed_at ? new Date(closing.completed_at).toLocaleString() : '-'}
                </td>
                <td className="whitespace-nowrap py-4 px-3 text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedClosing(closing)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button className="text-red-600 hover:text-red-800">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Closing Dialog */}
      {dialogOpen && (
        <div className="absolute inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setDialogOpen(false)}></div>
            
            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Start New Month-End Closing
                </h3>
              </div>
              
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <form className="space-y-4">
                  {/* Month Select */}
                  <div>
                    <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">
                      Month
                    </label>
                    <select
                      id="month"
                      name="month"
                      value={newClosing.month}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                        <option key={month} value={month}>
                          {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Year Input */}
                  <div>
                    <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                      Year
                    </label>
                    <input
                      type="number"
                      id="year"
                      name="year"
                      value={newClosing.year}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Notes */}
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={4}
                      value={newClosing.notes}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </form>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Start Closing
                </button>
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Dialog */}
      {selectedClosing && (
        <div className="absolute inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSelectedClosing(null)}></div>
            
            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Month-End Closing - {new Date(0, selectedClosing.month - 1).toLocaleString('default', { month: 'long' })} {selectedClosing.year}
                </h3>
              </div>
              
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h4 className="text-lg font-medium text-gray-800 mb-4">Tasks</h4>
                <ul className="divide-y divide-gray-200">
                  {selectedClosing.tasks.map((task) => (
                    <li key={task.id} className="py-3">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-0.5">
                          <input
                            type="checkbox"
                            checked={task.is_completed}
                            onChange={(e) => handleTaskUpdate(task.id, e.target.checked)}
                            className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{task.name}</p>
                          <p className="text-sm text-gray-500">
                            {task.is_completed
                              ? `Completed at: ${new Date(task.completed_at).toLocaleString()}`
                              : 'Not completed'}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setSelectedClosing(null)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthEndManagement;
