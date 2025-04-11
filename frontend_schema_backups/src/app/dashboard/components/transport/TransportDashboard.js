import React, { useState, useEffect } from 'react';
import PieChart from '../charts/PieChart';

const TransportDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    vehicles: {
      total: 0,
      byType: [],
      byStatus: [],
      maintenanceDue: 0
    },
    loads: {
      total: 0,
      byStatus: [],
      upcomingPickups: 0,
      upcomingDeliveries: 0
    },
    compliance: {
      expiringSoon: 0,
      expired: 0
    },
    routes: {
      total: 0,
      mostUsed: []
    }
  });

  // Simulated data loading - in a real app, this would fetch from your API
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setDashboardData({
        vehicles: {
          total: 14,
          byType: [
            { name: 'Truck', value: 5 },
            { name: 'Trailer', value: 4 },
            { name: 'Van', value: 3 },
            { name: 'Other', value: 2 }
          ],
          byStatus: [
            { name: 'Active', value: 9 },
            { name: 'Maintenance', value: 2 },
            { name: 'Out of Service', value: 1 },
            { name: 'Retired', value: 2 }
          ],
          maintenanceDue: 3
        },
        loads: {
          total: 28,
          byStatus: [
            { name: 'Pending', value: 5 },
            { name: 'Assigned', value: 8 },
            { name: 'In Transit', value: 10 },
            { name: 'Delivered', value: 4 },
            { name: 'Cancelled', value: 1 }
          ],
          upcomingPickups: 6,
          upcomingDeliveries: 4
        },
        compliance: {
          expiringSoon: 4,
          expired: 1
        },
        routes: {
          total: 12,
          mostUsed: [
            { name: 'Chicago to Detroit', count: 15 },
            { name: 'Detroit to Pittsburgh', count: 12 },
            { name: 'Pittsburgh to New York', count: 10 }
          ]
        }
      });
      setIsLoading(false);
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Transport Dashboard
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Summary Cards Row */}
        <div className="col-span-1">
          <div className="bg-white shadow rounded-lg h-full">
            <div className="p-6">
              <div className="flex items-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <div>
                  <p className="text-3xl font-bold">{dashboardData.vehicles.total}</p>
                  <p className="text-gray-600">Vehicles</p>
                </div>
              </div>
              <div className="border-t border-gray-200 my-3"></div>
              <div>
                <p className="text-sm text-gray-600">
                  {dashboardData.vehicles.maintenanceDue} vehicles due for maintenance
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1">
          <div className="bg-white shadow rounded-lg h-full">
            <div className="p-6">
              <div className="flex items-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
                <div>
                  <p className="text-3xl font-bold">{dashboardData.loads.total}</p>
                  <p className="text-gray-600">Loads/Jobs</p>
                </div>
              </div>
              <div className="border-t border-gray-200 my-3"></div>
              <div>
                <p className="text-sm text-gray-600">
                  {dashboardData.loads.upcomingPickups} upcoming pickups
                </p>
                <p className="text-sm text-gray-600">
                  {dashboardData.loads.upcomingDeliveries} upcoming deliveries
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1">
          <div className="bg-white shadow rounded-lg h-full">
            <div className="p-6">
              <div className="flex items-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-3xl font-bold">{dashboardData.compliance.expiringSoon + dashboardData.compliance.expired}</p>
                  <p className="text-gray-600">Compliance Issues</p>
                </div>
              </div>
              <div className="border-t border-gray-200 my-3"></div>
              <div>
                {dashboardData.compliance.expired > 0 && (
                  <p className="text-sm text-red-600">
                    {dashboardData.compliance.expired} expired documents
                  </p>
                )}
                <p className="text-sm text-amber-600">
                  {dashboardData.compliance.expiringSoon} documents expiring soon
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="col-span-1 md:col-span-3 lg:col-span-1 lg:row-span-2">
          <div className="bg-white shadow rounded-lg h-full">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Vehicles by Type</h2>
            </div>
            <div className="p-4">
              <div className="h-[300px]">
                <PieChart
                  data={dashboardData.vehicles.byType}
                  colors={['#1976d2', '#42a5f5', '#90caf9', '#e3f2fd']}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-3 lg:col-span-2">
          <div className="bg-white shadow rounded-lg h-full">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Loads by Status</h2>
            </div>
            <div className="p-4">
              <div className="h-[300px]">
                <PieChart
                  data={dashboardData.loads.byStatus}
                  colors={['#ff9800', '#ffa726', '#ffb74d', '#4caf50', '#e57373']}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Most Used Routes */}
        <div className="col-span-1 md:col-span-3 lg:col-span-1">
          <div className="bg-white shadow rounded-lg h-full">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Most Used Routes</h2>
            </div>
            <div className="p-0">
              <ul className="divide-y divide-gray-200">
                {dashboardData.routes.mostUsed.map((route, index) => (
                  <li key={index} className="flex justify-between items-center p-4">
                    <div>
                      <p className="font-medium">{route.name}</p>
                      <p className="text-sm text-gray-600">Used {route.count} times</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      index === 0 
                        ? 'bg-indigo-100 text-indigo-800' 
                        : index === 1 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      #{index + 1}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-1 md:col-span-3 lg:col-span-1">
          <div className="bg-white shadow rounded-lg h-full">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Quick Actions</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => window.location.href = '/dashboard?view=transport-loads'}
                  className="flex items-center justify-center px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                  Add New Load
                </button>
                
                <button 
                  onClick={() => window.location.href = '/dashboard?view=transport-equipment'}
                  className="flex items-center justify-center px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Add New Vehicle
                </button>
                
                <button 
                  onClick={() => window.location.href = '/dashboard?view=transport-routes'}
                  className="flex items-center justify-center px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Manage Routes
                </button>
                
                <button 
                  onClick={() => window.location.href = '/dashboard?view=transport-maintenance'}
                  className="flex items-center justify-center px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Schedule Maintenance
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransportDashboard; 