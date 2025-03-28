// Export all CRM components
import CRMDashboard from './CRMDashboard';
import ContactsManagement from './ContactsManagement';
import LeadsManagement from './LeadsManagement';

// These components will be implemented later
// For now, they'll just render a simple message
import React from 'react';

const PlaceholderComponent = ({ title }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
      {title}
    </h1>
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
      <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">
        This feature is coming soon. Check back later!
      </h2>
    </div>
  </div>
);

const OpportunitiesManagement = () => <PlaceholderComponent title="Opportunities Management" />;
const DealsManagement = () => <PlaceholderComponent title="Deals Management" />;
const ActivitiesManagement = () => <PlaceholderComponent title="Activities Management" />;
const CampaignsManagement = () => <PlaceholderComponent title="Campaigns Management" />;
const ReportsManagement = () => <PlaceholderComponent title="CRM Reports" />;

export {
  CRMDashboard,
  ContactsManagement,
  LeadsManagement,
  OpportunitiesManagement,
  DealsManagement,
  ActivitiesManagement,
  CampaignsManagement,
  ReportsManagement
};