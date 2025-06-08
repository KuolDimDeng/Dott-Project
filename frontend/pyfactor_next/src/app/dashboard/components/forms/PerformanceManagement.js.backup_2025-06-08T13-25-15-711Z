'use client';

import React, { useState } from 'react';

/**
 * Performance Management Component
 * Features a tabbed interface with role-based access to different views:
 * - Employee View (Limited Access)
 * - Manager View (Expanded Access)
 * - HR Admin View (Comprehensive Access)
 * - Executive View (Strategic Access)
 */
function PerformanceManagement() {
  const [activeTab, setActiveTab] = useState('employee');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Tab navigation component
  const TabNavigation = () => (
    <div className="mb-6">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px space-x-8">
          {['employee', 'management', 'hr-admin', 'executive'].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );

  // Employee View Content
  const EmployeeView = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Personal Performance Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-blue-800 mb-2">Goal Completion</h3>
            <div className="flex items-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">75%</div>
              <div className="ml-4">
                <div className="text-sm text-blue-800">On track</div>
                <div className="text-xs text-blue-600">6 of 8 goals completed</div>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-green-800 mb-2">KPI Status</h3>
            <div className="flex items-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl font-bold">82%</div>
              <div className="ml-4">
                <div className="text-sm text-green-800">Exceeding</div>
                <div className="text-xs text-green-600">4 of 5 KPIs above target</div>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-amber-800 mb-2">Training</h3>
            <div className="flex items-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xl font-bold">60%</div>
              <div className="ml-4">
                <div className="text-sm text-amber-800">In progress</div>
                <div className="text-xs text-amber-600">3 of 5 courses completed</div>
              </div>
            </div>
          </div>
        </div>
        
        <h3 className="text-lg font-medium mb-3">Individual KPIs and Goal Progress</h3>
        <div className="overflow-hidden bg-white rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KPI / Goal</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Sales Conversion Rate</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">25%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">27%</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Exceeding</span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Customer Satisfaction</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">4.5/5</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">4.7/5</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Exceeding</span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Response Time</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">4 hours</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">4.5 hours</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">At Risk</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Team Performance Overview</h2>
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Team Metrics (Anonymized)</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <div className="w-32 text-sm font-medium">Sales Conversion:</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '70%' }}></div>
              </div>
              <div className="ml-2 text-sm">Your position: 70%</div>
            </div>
            <div className="flex items-center mb-2">
              <div className="w-32 text-sm font-medium">Customer Rating:</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '85%' }}></div>
              </div>
              <div className="ml-2 text-sm">Your position: 85%</div>
            </div>
            <div className="flex items-center">
              <div className="w-32 text-sm font-medium">Task Completion:</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '60%' }}></div>
              </div>
              <div className="ml-2 text-sm">Your position: 60%</div>
            </div>
          </div>
        </div>
        
        <h3 className="text-lg font-medium mb-2">Department Goals</h3>
        <div className="overflow-hidden bg-white rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Goal</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Increase department revenue by 15%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Dec 31, 2023</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                  <span className="text-xs text-gray-500">45% Complete</span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Reduce customer churn to under 5%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Dec 31, 2023</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                  <span className="text-xs text-gray-500">60% Complete</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Feedback & Self-Assessment</h2>
        
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Recent Feedback</h3>
          <div className="space-y-4">
            <div className="border p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <div className="font-medium">Manager Feedback</div>
                <div className="text-sm text-gray-500">May 1, 2023</div>
              </div>
              <p className="text-sm text-gray-700">Great job on the Smith project. Your attention to detail and client communication were excellent. Consider delegating more tasks to junior team members for efficiency.</p>
            </div>
            <div className="border p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <div className="font-medium">Peer Feedback</div>
                <div className="text-sm text-gray-500">April 15, 2023</div>
              </div>
              <p className="text-sm text-gray-700">Always available to help team members. Brings creative solutions to meetings. Could improve on meeting deadlines for internal deliverables.</p>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Self-Assessment Tool</h3>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800 mb-3">Complete your quarterly self-assessment to reflect on your achievements and areas for growth.</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
              Start Self-Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Placeholder for the other tab views
  const ManagerView = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Team Performance Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-blue-800 mb-2">Team Goals</h3>
            <div className="flex items-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">68%</div>
              <div className="ml-4">
                <div className="text-sm text-blue-800">On track</div>
                <div className="text-xs text-blue-600">17 of 25 team goals completed</div>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-green-800 mb-2">Team KPIs</h3>
            <div className="flex items-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl font-bold">79%</div>
              <div className="ml-4">
                <div className="text-sm text-green-800">Meeting targets</div>
                <div className="text-xs text-green-600">7 of 9 KPIs at or above target</div>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-amber-800 mb-2">Training</h3>
            <div className="flex items-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xl font-bold">55%</div>
              <div className="ml-4">
                <div className="text-sm text-amber-800">Needs attention</div>
                <div className="text-xs text-amber-600">Team training completion below target</div>
              </div>
            </div>
          </div>
        </div>
        
        <h3 className="text-lg font-medium mb-3">Team-wide Trends and Patterns</h3>
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Q1 vs Q2 Performance</span>
              <span className="text-sm font-medium text-green-600">+12%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '70%' }}></div>
            </div>
          </div>
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Project Completion Rate</span>
              <span className="text-sm font-medium text-amber-600">-3%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '65%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Client Satisfaction</span>
              <span className="text-sm font-medium text-green-600">+8%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Individual Employee Deep Dives</h2>
        
        <div className="mb-6">
          <div className="border-b pb-4 mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold">JD</div>
              <div className="ml-4">
                <h3 className="text-lg font-medium">John Doe</h3>
                <p className="text-sm text-gray-600">Senior Sales Representative</p>
              </div>
              <div className="ml-auto">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Full Profile</button>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-md font-medium mb-2">Performance Metrics</h4>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Sales Target</span>
                    <span className="text-sm font-medium">92%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Client Retention</span>
                    <span className="text-sm font-medium">88%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '88%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Response Time</span>
                    <span className="text-sm font-medium">75%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-md font-medium mb-2">Development Plan</h4>
              <div className="space-y-2">
                <div className="flex items-start">
                  <div className="min-w-[24px] h-6 flex items-center">
                    <input type="checkbox" className="rounded text-blue-600" checked disabled />
                  </div>
                  <div className="ml-2">
                    <p className="text-sm">Complete advanced negotiation training</p>
                    <p className="text-xs text-gray-500">Completed: April 15, 2023</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="min-w-[24px] h-6 flex items-center">
                    <input type="checkbox" className="rounded text-blue-600" checked disabled />
                  </div>
                  <div className="ml-2">
                    <p className="text-sm">Product knowledge certification</p>
                    <p className="text-xs text-gray-500">Completed: May 10, 2023</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="min-w-[24px] h-6 flex items-center">
                    <input type="checkbox" className="rounded text-blue-600" />
                  </div>
                  <div className="ml-2">
                    <p className="text-sm">Leadership shadowing program</p>
                    <p className="text-xs text-gray-500">Due: August 30, 2023</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="text-md font-medium mb-2">Feedback Collection</h4>
            <div className="flex space-x-2">
              <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors">
                Collect Feedback
              </button>
              <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors">
                Schedule 1:1
              </button>
              <button className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition-colors">
                Development Plan
              </button>
            </div>
          </div>
        </div>
        
        <div className="text-center pt-4">
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View All Team Members (12)
          </button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Training Completion Status</h2>
        
        <div className="overflow-hidden bg-white rounded-lg border mb-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required Training</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">John Doe</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">5 / 5</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">100%</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Complete</span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Jane Smith</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">3 / 5</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">60%</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">In Progress</span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Michael Johnson</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1 / 5</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">20%</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Behind</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="flex justify-between">
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View All Training Records
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors">
            Assign New Training
          </button>
        </div>
      </div>
    </div>
  );

  const HRAdminView = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Organization-Wide Performance Analytics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-md font-medium text-blue-800 mb-2">Overall Rating</h3>
            <div className="text-center">
              <div className="inline-block w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">3.8</div>
              <div className="mt-2 text-sm text-blue-800">Out of 5.0</div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-md font-medium text-green-800 mb-2">Goal Completion</h3>
            <div className="text-center">
              <div className="inline-block w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl font-bold">74%</div>
              <div className="mt-2 text-sm text-green-800">Company-wide</div>
            </div>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="text-md font-medium text-amber-800 mb-2">High Performers</h3>
            <div className="text-center">
              <div className="inline-block w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-2xl font-bold">18%</div>
              <div className="mt-2 text-sm text-amber-800">Of workforce</div>
            </div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-md font-medium text-red-800 mb-2">At Risk</h3>
            <div className="text-center">
              <div className="inline-block w-20 h-20 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-2xl font-bold">7%</div>
              <div className="mt-2 text-sm text-red-800">Need intervention</div>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Cross-Department Performance Comparison</h3>
          <div className="overflow-hidden bg-white rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Rating</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Goal Completion</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">High Performers</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth Trend</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Sales</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">4.2</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">82%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">24%</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">+12%</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Marketing</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">3.9</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">78%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">19%</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">+8%</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Engineering</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">3.7</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">70%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">15%</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">+3%</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Customer Support</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">3.5</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">65%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">12%</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">-2%</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-3">Performance Distribution Analysis</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium">Distribution by Rating (1-5)</div>
              <div className="text-sm text-gray-500">Total Employees: 247</div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Rating 5 (Outstanding)</span>
                  <span className="text-sm text-gray-500">12%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '12%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Rating 4 (Exceeds Expectations)</span>
                  <span className="text-sm text-gray-500">28%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '28%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Rating 3 (Meets Expectations)</span>
                  <span className="text-sm text-gray-500">42%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '42%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Rating 2 (Needs Improvement)</span>
                  <span className="text-sm text-gray-500">15%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '15%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Rating 1 (Unsatisfactory)</span>
                  <span className="text-sm text-gray-500">3%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-red-600 h-2.5 rounded-full" style={{ width: '3%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Compensation Management Tools</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Salary Data Overview</h3>
          <div className="overflow-hidden bg-white rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Salary</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Rate</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay vs Performance</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Sales</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$82,500</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$80,000</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Aligned</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                    <button>View Details</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Engineering</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$105,750</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$110,000</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">Below Market</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                    <button>View Details</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Marketing</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$78,250</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$75,000</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Aligned</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                    <button>View Details</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Compensation Planning</h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 mb-3">Next compensation review cycle begins: August 15, 2023</p>
              <div className="space-x-2">
                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                  Start Planning
                </button>
                <button className="bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded hover:bg-blue-50 transition-colors">
                  View Budget
                </button>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3">Market Rate Comparison</h3>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800 mb-3">Overall company compensation is at 97% of market rates</p>
              <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors">
                Run Comparison Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const ExecutiveView = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Strategic Performance Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <h3 className="text-md font-medium text-blue-800 mb-2">Overall Performance</h3>
            <div className="text-3xl font-bold text-blue-600 mb-1">78%</div>
            <div className="text-sm text-blue-800">+7% YOY</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <h3 className="text-md font-medium text-green-800 mb-2">Retention Rate</h3>
            <div className="text-3xl font-bold text-green-600 mb-1">92%</div>
            <div className="text-sm text-green-800">+3% YOY</div>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg text-center">
            <h3 className="text-md font-medium text-amber-800 mb-2">Revenue Per Employee</h3>
            <div className="text-3xl font-bold text-amber-600 mb-1">$274K</div>
            <div className="text-sm text-amber-800">+12% YOY</div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Performance by Department</h3>
          <div className="overflow-hidden bg-white rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance Score</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Goal Achievement</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue Impact</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Sales</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">85%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">82%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$5.2M</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">↑ 12%</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Product</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">79%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">75%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$3.8M</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">↑ 8%</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Operations</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">72%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">68%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$2.1M</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">↑ 3%</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Marketing</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">76%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">71%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$3.2M</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">↑ 7%</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-3">Critical Talent Identification</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-md font-medium mb-2">High Performers</h4>
                <p className="text-sm text-gray-700 mb-2">Top 10% of employees by performance rating</p>
                <div className="flex justify-between">
                  <span className="text-sm">24 employees identified</span>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View List</button>
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium mb-2">Flight Risks</h4>
                <p className="text-sm text-gray-700 mb-2">High performers with retention risk factors</p>
                <div className="flex justify-between">
                  <span className="text-sm">9 employees identified</span>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View List</button>
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium mb-2">Succession Planning</h4>
                <p className="text-sm text-gray-700 mb-2">Leadership roles with identified successors</p>
                <div className="flex justify-between">
                  <span className="text-sm">17 of 22 positions covered (77%)</span>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Plan</button>
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium mb-2">Skill Gaps</h4>
                <p className="text-sm text-gray-700 mb-2">Critical skill areas needing development</p>
                <div className="flex justify-between">
                  <span className="text-sm">3 major areas identified</span>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Report</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">System Configuration Controls</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Performance Rating Scale</h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 mb-3">Current scale: 5-point with descriptive ratings</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                Modify Scale
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3">Review Cycle Scheduling</h3>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800 mb-3">Annual reviews with quarterly check-ins</p>
              <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors">
                Configure Cycles
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3">Access Control Permissions</h3>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-800 mb-3">Role-based access with 4 permission levels</p>
              <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors">
                Manage Permissions
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3">Integration Configuration</h3>
            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-sm text-amber-800 mb-3">Connected to compensation and training systems</p>
              <button className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 transition-colors">
                Manage Integrations
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render the appropriate tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'employee':
        return <EmployeeView />;
      case 'management':
        return <ManagerView />;
      case 'hr-admin':
        return <HRAdminView />;
      case 'executive':
        return <ExecutiveView />;
      default:
        return <EmployeeView />;
    }
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Performance Management</h1>
      <TabNavigation />
      <div className="mt-4">
        {renderTabContent()}
      </div>
    </div>
  );
}

export default PerformanceManagement; 