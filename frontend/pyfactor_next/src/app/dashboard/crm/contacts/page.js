'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardWrapper from '../../DashboardWrapper';
import { fetchAuthSession } from 'aws-amplify/auth';
import { appCache } from '@/utils/awsAppCache';

const ContactsPage = () => {
  const router = useRouter();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [showContactDetails, setShowContactDetails] = useState(false);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        
        // Get authenticated user session
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();
        
        // Check if contacts are available in AppCache first
        const cachedContacts = await appCache.get('crm_contacts');
        if (cachedContacts) {
          setContacts(JSON.parse(cachedContacts));
          setLoading(false);
          
          // Refresh cache in background
          fetchAndUpdateContacts(token);
          return;
        }
        
        await fetchAndUpdateContacts(token);
      } catch (err) {
        console.error("Error fetching contacts:", err);
        setError("Failed to load contacts. Please try again later.");
        setLoading(false);
      }
    };
    
    const fetchAndUpdateContacts = async (token) => {
      try {
        // In a real implementation, you would fetch actual data from your backend
        // For now, we'll use mock data
        const mockContacts = [
          {
            id: 1,
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '(555) 123-4567',
            company: 'Acme Corp',
            position: 'CEO',
            status: 'active',
            lastContacted: '2023-10-15',
            leadSource: 'Website',
            tags: ['VIP', 'Decision Maker'],
            notes: 'Met at the annual tech conference. Interested in our enterprise plan.'
          },
          {
            id: 2,
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            phone: '(555) 987-6543',
            company: 'XYZ Industries',
            position: 'Marketing Director',
            status: 'active',
            lastContacted: '2023-10-10',
            leadSource: 'Referral',
            tags: ['Marketing', 'Potential'],
            notes: 'Referred by Mike Johnson. Looking for marketing automation solutions.'
          },
          {
            id: 3,
            name: 'Robert Johnson',
            email: 'robert.johnson@example.com',
            phone: '(555) 456-7890',
            company: 'Johnson & Partners',
            position: 'Partner',
            status: 'inactive',
            lastContacted: '2023-09-05',
            leadSource: 'Cold Call',
            tags: ['Legal', 'Inactive'],
            notes: 'Was interested but went with a competitor. May revisit in 6 months.'
          },
          {
            id: 4,
            name: 'Sarah Williams',
            email: 'sarah.williams@example.com',
            phone: '(555) 234-5678',
            company: 'Tech Innovations',
            position: 'CTO',
            status: 'active',
            lastContacted: '2023-10-18',
            leadSource: 'LinkedIn',
            tags: ['Technical', 'Decision Maker'],
            notes: 'Highly technical, interested in our API integration capabilities.'
          },
          {
            id: 5,
            name: 'Michael Brown',
            email: 'michael.brown@example.com',
            phone: '(555) 876-5432',
            company: 'Brown Consulting',
            position: 'Consultant',
            status: 'active',
            lastContacted: '2023-10-12',
            leadSource: 'Event',
            tags: ['Consultant', 'Influencer'],
            notes: 'Met at industry seminar. Has connections with several potential clients.'
          }
        ];
        
        // Store in AppCache for future quick access
        await appCache.set('crm_contacts', JSON.stringify(mockContacts), { expires: 60 * 10 }); // 10 minutes cache
        
        setContacts(mockContacts);
        setLoading(false);
      } catch (err) {
        console.error("Error updating contacts:", err);
        setError("Failed to update contacts. Please try again later.");
        setLoading(false);
      }
    };
    
    fetchContacts();
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewContact = (contact) => {
    setSelectedContact(contact);
    setShowContactDetails(true);
  };

  const handleAddContact = () => {
    // In a real app, navigate to add contact form
    alert('Add contact functionality would go here');
  };

  const handleCloseDetails = () => {
    setShowContactDetails(false);
  };

  // RLS policy for contacts data - In a real implementation, this would be enforced by the backend
  const applyRowLevelSecurity = () => {
    // This is just to demonstrate the concept
    const userRole = 'manager'; // In reality, this would come from Cognito attributes
    
    if (userRole === 'admin') {
      return contacts; // Admins see all contacts
    } else if (userRole === 'manager') {
      // Managers see all active contacts
      return contacts.filter(contact => contact.status === 'active');
    } else {
      // Regular users see only their assigned contacts (in this mock, we'll just return active)
      return contacts.filter(contact => contact.status === 'active');
    }
  };

  return (
    <DashboardWrapper>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Contacts</h1>
          <button 
            onClick={handleAddContact} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Contact
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search contacts..."
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>

          {loading ? (
            <div className="animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex py-4 border-b border-gray-200">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-24 h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContacts.length > 0 ? (
                    filteredContacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-medium">{contact.name.split(' ').map(n => n[0]).join('')}</span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                              <div className="text-sm text-gray-500">{contact.position}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{contact.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{contact.company}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{contact.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${contact.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {contact.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => handleViewContact(contact)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            View
                          </button>
                          <button className="text-blue-600 hover:text-blue-900">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        No contacts found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Contact Details Modal */}
      {showContactDetails && selectedContact && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-800">Contact Details</h2>
              <button 
                onClick={handleCloseDetails}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/3 mb-4 md:mb-0 md:mr-4">
                <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                  <span className="text-2xl text-blue-600 font-medium">
                    {selectedContact.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                
                <div className="mt-4 text-center">
                  <h3 className="text-lg font-semibold">{selectedContact.name}</h3>
                  <p className="text-gray-600">{selectedContact.position}</p>
                  <p className="text-gray-600">{selectedContact.company}</p>
                </div>
                
                <div className="mt-4">
                  <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Tags</h4>
                  <div className="flex flex-wrap justify-center">
                    {selectedContact.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full m-1">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="md:w-2/3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Email</h4>
                    <p className="text-gray-800">{selectedContact.email}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Phone</h4>
                    <p className="text-gray-800">{selectedContact.phone}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Status</h4>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${selectedContact.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {selectedContact.status}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Last Contacted</h4>
                    <p className="text-gray-800">{selectedContact.lastContacted}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Lead Source</h4>
                    <p className="text-gray-800">{selectedContact.leadSource}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1">Notes</h4>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded">
                    {selectedContact.notes}
                  </p>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors mr-2">
                    Edit Contact
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    Schedule Activity
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardWrapper>
  );
};

export default ContactsPage; 