// Export all CRM components
import CRMDashboard from './CRMDashboard';
import ContactsManagement from './ContactsManagement';
import LeadsManagement from './LeadsManagement';

// These components will be implemented later
// For now, they'll just render a simple message
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const PlaceholderComponent = ({ title }) => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
      {title}
    </Typography>
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h6">
        This feature is coming soon. Check back later!
      </Typography>
    </Paper>
  </Box>
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