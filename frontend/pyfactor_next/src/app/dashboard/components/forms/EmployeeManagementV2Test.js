'use client';

import React, { useState, useEffect } from 'react';
import { employeeApiV2 } from '@/utils/employeeApiV2';
import { useToast } from '@/components/Toast/ToastProvider';
import { logger } from '@/utils/logger';
import { getTenantId } from '@/utils/tenantUtils';

export default function EmployeeManagementV2Test() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const toast = useToast();
  
  // Test form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: 'Staff',
    department: 'Sales',
    employmentType: 'FT',
    compensationType: 'SALARY',
    salary: '50000',
    active: true,
  });

  // Fetch employees on mount
  useEffect(() => {
    fetchEmployees();
    fetchStats();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const tenantId = getTenantId();
      logger.info('[V2 Test] Fetching employees...');
      
      const response = await employeeApiV2.list(tenantId);
      logger.info('[V2 Test] Employees response:', response);
      
      if (response.success) {
        setEmployees(response.data || []);
        toast.success(`Loaded ${response.count} employees`);
      } else {
        toast.error('Failed to load employees');
      }
    } catch (error) {
      logger.error('[V2 Test] Fetch error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const tenantId = getTenantId();
      const response = await employeeApiV2.getStats(tenantId);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      logger.error('[V2 Test] Stats error:', error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const tenantId = getTenantId();
      
      logger.info('[V2 Test] Creating employee:', formData);
      const response = await employeeApiV2.create(formData, tenantId);
      
      if (response.success) {
        toast.success('Employee created successfully!');
        await fetchEmployees();
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          position: 'Staff',
          department: 'Sales',
          employmentType: 'FT',
          compensationType: 'SALARY',
          salary: '50000',
          active: true,
        });
      } else {
        toast.error('Failed to create employee');
      }
    } catch (error) {
      logger.error('[V2 Test] Create error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (employeeId) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    
    try {
      setLoading(true);
      const tenantId = getTenantId();
      
      await employeeApiV2.delete(employeeId, tenantId);
      toast.success('Employee deleted successfully');
      await fetchEmployees();
    } catch (error) {
      logger.error('[V2 Test] Delete error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Employee Management v2 Test</h1>
      
      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Total Employees</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Active</div>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Inactive</div>
            <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Departments</div>
            <div className="text-2xl font-bold">{Object.keys(stats.by_department || {}).length}</div>
          </div>
        </div>
      )}

      {/* Create Form */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Create New Employee</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="First Name"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            className="border rounded px-3 py-2"
            required
          />
          <select
            value={formData.position}
            onChange={(e) => setFormData({...formData, position: e.target.value})}
            className="border rounded px-3 py-2"
          >
            <option value="Staff">Staff</option>
            <option value="Manager">Manager</option>
            <option value="Director">Director</option>
          </select>
          <select
            value={formData.department}
            onChange={(e) => setFormData({...formData, department: e.target.value})}
            className="border rounded px-3 py-2"
          >
            <option value="Sales">Sales</option>
            <option value="Engineering">Engineering</option>
            <option value="HR">HR</option>
            <option value="Finance">Finance</option>
          </select>
          <input
            type="number"
            placeholder="Salary"
            value={formData.salary}
            onChange={(e) => setFormData({...formData, salary: e.target.value})}
            className="border rounded px-3 py-2"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Employee'}
          </button>
        </form>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            Employees ({employees.length})
          </h2>
          
          {loading && <div className="text-center py-4">Loading...</div>}
          
          {!loading && employees.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No employees found. Create your first employee above.
            </div>
          )}
          
          {!loading && employees.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Name</th>
                    <th className="text-left py-2 px-4">Email</th>
                    <th className="text-left py-2 px-4">Position</th>
                    <th className="text-left py-2 px-4">Department</th>
                    <th className="text-left py-2 px-4">Status</th>
                    <th className="text-left py-2 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">
                        {employee.first_name} {employee.last_name}
                      </td>
                      <td className="py-2 px-4">{employee.email}</td>
                      <td className="py-2 px-4">{employee.job_title || 'N/A'}</td>
                      <td className="py-2 px-4">{employee.department || 'N/A'}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          employee.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {employee.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <button
                          onClick={() => handleDelete(employee.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}