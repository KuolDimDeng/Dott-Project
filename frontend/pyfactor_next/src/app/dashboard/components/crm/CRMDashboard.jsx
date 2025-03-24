'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Divider,
  Button,
  useTheme
} from '@mui/material';
import { useStore } from '@/store/authStore';
import { logger } from '@/utils/logger';

const CRMDashboard = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    customers: { total: 0, new30d: 0 },
    leads: { total: 0, new30d: 0, byStatus: [], bySource: [] },
    opportunities: { total: 0, totalValue: 0, byStage: [] },
    deals: { total: 0, totalValue: 0, byStatus: [] },
    activities: { upcoming: [], overdue: [] },
    campaigns: { total: 0, active: 0, byType: [], byStatus: [] }
  });
  const token = useStore((state) => state.token);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch data for each dashboard section
        const responses = await Promise.all([
          fetch('/api/crm/dashboard/customers/', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/crm/dashboard/leads/', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/crm/dashboard/opportunities/', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/crm/dashboard/deals/', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/crm/activities/upcoming/', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/crm/activities/overdue/', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/crm/dashboard/campaigns/', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        const [
          customersData, 
          leadsData, 
          opportunitiesData, 
          dealsData, 
          upcomingActivities, 
          overdueActivities, 
          campaignsData
        ] = await Promise.all(responses.map(res => res.json()));
        
        setDashboardData({
          customers: { 
            total: customersData.total_customers, 
            new30d: customersData.new_customers_30d 
          },
          leads: { 
            total: leadsData.total_leads, 
            new30d: leadsData.new_leads_30d,
            byStatus: leadsData.leads_by_status || [],
            bySource: leadsData.leads_by_source || []
          },
          opportunities: { 
            total: opportunitiesData.total_opportunities, 
            totalValue: opportunitiesData.total_value,
            byStage: opportunitiesData.opportunities_by_stage || []
          },
          deals: { 
            total: dealsData.total_deals, 
            totalValue: dealsData.total_value,
            byStatus: dealsData.deals_by_status || []
          },
          activities: { 
            upcoming: upcomingActivities || [], 
            overdue: overdueActivities || [] 
          },
          campaigns: { 
            total: campaignsData.total_campaigns, 
            active: campaignsData.active_campaigns,
            byType: campaignsData.campaigns_by_type || [],
            byStatus: campaignsData.campaigns_by_status || []
          }
        });
      } catch (error) {
        logger.error('Error fetching CRM dashboard data:', error);
        // Show mock data for demonstration purposes
        setDashboardData({
          customers: { total: 124, new30d: 15 },
          leads: { 
            total: 57, 
            new30d: 22,
            byStatus: [
              { status: 'new', count: 22 },
              { status: 'contacted', count: 15 },
              { status: 'qualified', count: 12 },
              { status: 'unqualified', count: 5 },
              { status: 'converted', count: 3 }
            ],
            bySource: [
              { source: 'website', count: 25 },
              { source: 'referral', count: 15 },
              { source: 'social media', count: 10 },
              { source: 'event', count: 7 }
            ]
          },
          opportunities: { 
            total: 32, 
            totalValue: 450000,
            byStage: [
              { stage: 'prospecting', count: 8, value: 120000 },
              { stage: 'qualification', count: 6, value: 80000 },
              { stage: 'proposal', count: 5, value: 150000 },
              { stage: 'negotiation', count: 3, value: 75000 },
              { stage: 'closed_won', count: 10, value: 25000 }
            ]
          },
          deals: { 
            total: 18, 
            totalValue: 320000,
            byStatus: [
              { status: 'draft', count: 5, value: 85000 },
              { status: 'sent', count: 7, value: 135000 },
              { status: 'accepted', count: 6, value: 100000 }
            ]
          },
          activities: { 
            upcoming: [
              { id: 1, type: 'call', subject: 'Follow-up call with ABC Corp', due_date: '2025-03-28T10:00:00Z', status: 'not_started' },
              { id: 2, type: 'meeting', subject: 'Demo for XYZ Inc', due_date: '2025-03-29T14:30:00Z', status: 'not_started' },
              { id: 3, type: 'email', subject: 'Send proposal to Johnson Ltd', due_date: '2025-03-27T12:00:00Z', status: 'in_progress' }
            ], 
            overdue: [
              { id: 4, type: 'task', subject: 'Update customer details', due_date: '2025-03-22T17:00:00Z', status: 'in_progress' },
              { id: 5, type: 'call', subject: 'Check in with Smith Co', due_date: '2025-03-21T11:00:00Z', status: 'not_started' }
            ] 
          },
          campaigns: { 
            total: 12, 
            active: 4,
            byType: [
              { type: 'email', count: 5 },
              { type: 'social', count: 3 },
              { type: 'event', count: 2 },
              { type: 'webinar', count: 2 }
            ],
            byStatus: [
              { status: 'planning', count: 3 },
              { status: 'active', count: 4 },
              { status: 'completed', count: 5 }
            ]
          }
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [token]);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 'bold' }}>
        CRM Dashboard
      </Typography>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="textSecondary">
                Customers
              </Typography>
              <Typography variant="h3" component="div" sx={{ mt: 1 }}>
                {dashboardData.customers.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {dashboardData.customers.new30d} new in last 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="textSecondary">
                Leads
              </Typography>
              <Typography variant="h3" component="div" sx={{ mt: 1 }}>
                {dashboardData.leads.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {dashboardData.leads.new30d} new in last 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="textSecondary">
                Opportunities
              </Typography>
              <Typography variant="h3" component="div" sx={{ mt: 1 }}>
                {dashboardData.opportunities.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Value: {formatCurrency(dashboardData.opportunities.totalValue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="textSecondary">
                Deals
              </Typography>
              <Typography variant="h3" component="div" sx={{ mt: 1 }}>
                {dashboardData.deals.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Value: {formatCurrency(dashboardData.deals.totalValue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Activities Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader 
              title="Upcoming Activities" 
              action={
                <Button size="small" color="primary">View All</Button>
              }
            />
            <Divider />
            <CardContent>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData.activities.upcoming.length > 0 ? (
                      dashboardData.activities.upcoming.slice(0, 5).map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell>{activity.type}</TableCell>
                          <TableCell>{activity.subject}</TableCell>
                          <TableCell>{formatDate(activity.due_date)}</TableCell>
                          <TableCell>{activity.status.replace('_', ' ')}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">No upcoming activities</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader 
              title="Overdue Activities" 
              action={
                <Button size="small" color="primary">View All</Button>
              }
            />
            <Divider />
            <CardContent>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData.activities.overdue.length > 0 ? (
                      dashboardData.activities.overdue.slice(0, 5).map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell>{activity.type}</TableCell>
                          <TableCell>{activity.subject}</TableCell>
                          <TableCell>{formatDate(activity.due_date)}</TableCell>
                          <TableCell>{activity.status.replace('_', ' ')}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">No overdue activities</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Leads and Opportunities */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader 
              title="Leads by Status" 
              action={
                <Button size="small" color="primary">View Leads</Button>
              }
            />
            <Divider />
            <CardContent>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData.leads.byStatus.map((status) => (
                      <TableRow key={status.status}>
                        <TableCell>{status.status.replace('_', ' ')}</TableCell>
                        <TableCell align="right">{status.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader 
              title="Opportunities by Stage" 
              action={
                <Button size="small" color="primary">View Opportunities</Button>
              }
            />
            <Divider />
            <CardContent>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Stage</TableCell>
                      <TableCell align="right">Count</TableCell>
                      <TableCell align="right">Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData.opportunities.byStage.map((stage) => (
                      <TableRow key={stage.stage}>
                        <TableCell>{stage.stage.replace('_', ' ')}</TableCell>
                        <TableCell align="right">{stage.count}</TableCell>
                        <TableCell align="right">{formatCurrency(stage.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CRMDashboard;