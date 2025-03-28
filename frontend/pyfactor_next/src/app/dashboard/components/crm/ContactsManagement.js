'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/authStore';
import { logger } from '@/utils/logger';
import { Dialog } from '@headlessui/react';
import { 
  AddIcon, 
  EditIcon, 
  DeleteIcon,
  SearchIcon,
  FilterListIcon,
  VisibilityIcon
} from '@/app/components/icons';

const ContactsManagement = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalContacts, setTotalContacts] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const token = useStore((state) => state.token);

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/crm/contacts/?page=${page + 1}&limit=${rowsPerPage}&search=${searchTerm}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setContacts(data.results || []);
          setTotalContacts(data.count || 0);
        } else {
          logger.error('Failed to fetch contacts');
          // Show mock data for demonstration
          const mockContacts = [
            { id: '1', first_name: 'John', last_name: 'Doe', email: 'john.doe@example.com', phone: '555-1234', job_title: 'CEO', customer_name: 'ABC Corp', is_primary: true },
            { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@example.com', phone: '555-2345', job_title: 'CTO', customer_name: 'XYZ Inc', is_primary: false },
            { id: '3', first_name: 'Robert', last_name: 'Johnson', email: 'robert.j@example.com', phone: '555-3456', job_title: 'Sales Manager', customer_name: 'Acme Ltd', is_primary: true },
            { id: '4', first_name: 'Sarah', last_name: 'Williams', email: 'sarah.w@example.com', phone: '555-4567', job_title: 'Marketing Director', customer_name: 'Best Co', is_primary: false },
            { id: '5', first_name: 'Michael', last_name: 'Brown', email: 'michael.b@example.com', phone: '555-5678', job_title: 'CFO', customer_name: 'Global Enterprises', is_primary: true },
          ];
          setContacts(mockContacts);
          setTotalContacts(mockContacts.length);
        }
      } catch (error) {
        logger.error('Error fetching contacts:', error);
        // Show mock data for demonstration
        const mockContacts = [
          { id: '1', first_name: 'John', last_name: 'Doe', email: 'john.doe@example.com', phone: '555-1234', job_title: 'CEO', customer_name: 'ABC Corp', is_primary: true },
          { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@example.com', phone: '555-2345', job_title: 'CTO', customer_name: 'XYZ Inc', is_primary: false },
          { id: '3', first_name: 'Robert', last_name: 'Johnson', email: 'robert.j@example.com', phone: '555-3456', job_title: 'Sales Manager', customer_name: 'Acme Ltd', is_primary: true },
          { id: '4', first_name: 'Sarah', last_name: 'Williams', email: 'sarah.w@example.com', phone: '555-4567', job_title: 'Marketing Director', customer_name: 'Best Co', is_primary: false },
          { id: '5', first_name: 'Michael', last_name: 'Brown', email: 'michael.b@example.com', phone: '555-5678', job_title: 'CFO', customer_name: 'Global Enterprises', is_primary: true },
        ];
        setContacts(mockContacts);
        setTotalContacts(mockContacts.length);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContacts();
  }, [page, rowsPerPage, searchTerm, token]);

  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleDeleteClick = (contact) => {
    setSelectedContact(contact);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedContact) return;
    
    try {
      const response = await fetch(`/api/crm/contacts/${selectedContact.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        // Remove deleted contact from the list
        setContacts(contacts.filter(c => c.id !== selectedContact.id));
        setTotalContacts(totalContacts - 1);
      } else {
        logger.error('Failed to delete contact');
      }
    } catch (error) {
      logger.error('Error deleting contact:', error);
    } finally {
      setOpenDeleteDialog(false);
      setSelectedContact(null);
    }
  };

  const handleDeleteCancel = () => {
    setOpenDeleteDialog(false);
    setSelectedContact(null);
  };

  if (loading && contacts.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-12 h-12 border-4 border-t-blue-500 border-b-blue-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Contact Management
      </h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Contacts
          </h2>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {totalContacts}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Primary Contacts
          </h2>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {contacts.filter(c => c.is_primary).length}
          </p>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search Contacts"
            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 min-w-[300px]"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        
        <div className="flex space-x-2">
          <button 
            className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <FilterListIcon className="h-5 w-5 mr-2" />
            Filter
          </button>
          <button 
            className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <AddIcon className="h-5 w-5 mr-2" />
            Add Contact
          </button>
        </div>
      </div>
      
      {/* Contacts Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Job Title</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Company</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Primary</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{`${contact.first_name} ${contact.last_name}`}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{contact.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{contact.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{contact.job_title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{contact.customer_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{contact.is_primary ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button 
                        className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100" 
                        title="View"
                      >
                        <VisibilityIcon className="h-5 w-5" />
                      </button>
                      <button 
                        className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100" 
                        title="Edit"
                      >
                        <EditIcon className="h-5 w-5" />
                      </button>
                      <button 
                        className="text-gray-500 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400" 
                        onClick={() => handleDeleteClick(contact)}
                        title="Delete"
                      >
                        <DeleteIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handleChangePage(page - 1)}
              disabled={page === 0}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                page === 0 
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => handleChangePage(page + 1)}
              disabled={page >= Math.ceil(totalContacts / rowsPerPage) - 1}
              className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                page >= Math.ceil(totalContacts / rowsPerPage) - 1
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">{page * rowsPerPage + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min((page + 1) * rowsPerPage, totalContacts)}
                </span>{' '}
                of <span className="font-medium">{totalContacts}</span> results
              </p>
            </div>
            <div>
              <select
                value={rowsPerPage}
                onChange={handleChangeRowsPerPage}
                className="mr-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md py-1 px-2 text-sm"
              >
                {[5, 10, 25].map((value) => (
                  <option key={value} value={value}>
                    {value} per page
                  </option>
                ))}
              </select>
              <nav className="inline-flex rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handleChangePage(page - 1)}
                  disabled={page === 0}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 text-sm font-medium ${
                    page === 0
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                {[...Array(Math.min(5, Math.ceil(totalContacts / rowsPerPage))).keys()].map((_, i) => {
                  // If we have more than 5 pages, show the first 3, the current one, and the last one
                  let pageNumber = i;
                  if (Math.ceil(totalContacts / rowsPerPage) > 5) {
                    if (page < 3) {
                      pageNumber = i;
                    } else if (page >= Math.ceil(totalContacts / rowsPerPage) - 3) {
                      pageNumber = Math.ceil(totalContacts / rowsPerPage) - 5 + i;
                    } else {
                      pageNumber = page - 2 + i;
                    }
                  }
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => handleChangePage(pageNumber)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium ${
                        page === pageNumber
                          ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-300'
                          : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNumber + 1}
                    </button>
                  );
                })}
                <button
                  onClick={() => handleChangePage(page + 1)}
                  disabled={page >= Math.ceil(totalContacts / rowsPerPage) - 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 text-sm font-medium ${
                    page >= Math.ceil(totalContacts / rowsPerPage) - 1
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleDeleteCancel}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Delete Contact
            </Dialog.Title>
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to delete the contact 
                {selectedContact && ` "${selectedContact.first_name} ${selectedContact.last_name}"`}? 
                This action cannot be undone.
              </p>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default ContactsManagement;