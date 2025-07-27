'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Stack,
  Button,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Alert,
  Divider,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Send,
  CheckCircle,
  Receipt,
  Description,
  History,
  Chat,
  AttachMoney,
  Add,
  Edit,
  Visibility,
  Download,
  Email,
  WhatsApp,
  Print
} from '@mui/icons-material';
import jobsApi from '@/app/utils/api/jobsApi';
import JobStatusTransition from './JobStatusTransition';
import QuoteSendModal from './QuoteSendModal';
import SignatureCapture from './SignatureCapture';
import JobDocumentUpload from './JobDocumentUpload';
import JobInvoiceGeneration from './JobInvoiceGeneration';
import JobPaymentCollection from './JobPaymentCollection';
import { logger } from '@/utils/logger';

const JobWorkflow = ({ jobId, onJobUpdate }) => {
  const [job, setJob] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [quoteSendOpen, setQuoteSendOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureType, setSignatureType] = useState('customer');
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  
  // Data states
  const [documents, setDocuments] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);
  const [communications, setCommunications] = useState([]);

  useEffect(() => {
    fetchJobData();
  }, [jobId]);

  const fetchJobData = async () => {
    setLoading(true);
    try {
      const [jobData, docsData, historyData, commsData] = await Promise.all([
        jobsApi.getJob(jobId),
        jobsApi.getDocuments(jobId),
        jobsApi.getStatusHistory(jobId),
        jobsApi.getCommunications(jobId)
      ]);
      
      setJob(jobData.data);
      setDocuments(docsData.data);
      setStatusHistory(historyData.data);
      setCommunications(commsData.data);
    } catch (err) {
      logger.error('Error fetching job workflow data:', err);
      setError('Failed to load job data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (updatedJob) => {
    setJob(updatedJob);
    
    // If job is completed, prompt for signatures
    if (updatedJob.status === 'completed') {
      if (!updatedJob.customer_signature) {
        setSignatureType('customer');
        setSignatureOpen(true);
      } else if (!updatedJob.supervisor_signature) {
        setSignatureType('supervisor');
        setSignatureOpen(true);
      }
    }
    
    // If job is invoiced, redirect to invoice creation
    if (updatedJob.status === 'invoiced') {
      // TODO: Redirect to invoice creation
    }
    
    onJobUpdate && onJobUpdate(updatedJob);
    fetchJobData(); // Refresh all data
  };

  const handleQuoteSent = () => {
    fetchJobData();
  };

  const handleSignatureCaptured = (response) => {
    setJob(response.job);
    
    // Check if we need the other signature
    if (signatureType === 'customer' && !response.job.supervisor_signature) {
      setSignatureType('supervisor');
      setSignatureOpen(true);
    } else {
      setSignatureOpen(false);
      fetchJobData();
    }
  };

  const handleDocumentAdded = (document) => {
    setDocuments([...documents, document]);
  };

  const handleDocumentDeleted = (documentId) => {
    setDocuments(documents.filter(doc => doc.id !== documentId));
  };

  const handleCreateInvoice = () => {
    setInvoiceOpen(true);
  };
  
  const handleInvoiceCreated = (invoice) => {
    setCurrentInvoice(invoice);
    setInvoiceOpen(false);
    fetchJobData(); // Refresh job data
    
    // Ask if they want to collect payment
    if (window.confirm('Invoice created successfully! Would you like to collect payment now?')) {
      setPaymentOpen(true);
    }
  };
  
  const handlePaymentSuccess = (paymentData) => {
    setPaymentOpen(false);
    fetchJobData(); // Refresh job data
  };

  if (loading) return <Box sx={{ p: 3 }}>Loading job workflow...</Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!job) return null;

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h5">
                {job.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Job #{job.job_number} • Customer: {job.customer_name}
              </Typography>
            </Box>
            <JobStatusTransition job={job} onStatusChange={handleStatusChange} />
          </Stack>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Typography variant="caption" color="text.secondary">Quoted Amount</Typography>
              <Typography variant="h6">${job.quoted_amount}</Typography>
            </Grid>
            {job.deposit_amount > 0 && (
              <Grid item xs={12} md={3}>
                <Typography variant="caption" color="text.secondary">Deposit</Typography>
                <Typography variant="h6">
                  ${job.deposit_amount}
                  {job.deposit_paid && (
                    <Chip label="Paid" size="small" color="success" sx={{ ml: 1 }} />
                  )}
                </Typography>
              </Grid>
            )}
            {job.final_amount > 0 && (
              <Grid item xs={12} md={3}>
                <Typography variant="caption" color="text.secondary">Final Amount</Typography>
                <Typography variant="h6">${job.final_amount}</Typography>
              </Grid>
            )}
            <Grid item xs={12} md={3}>
              <Stack direction="row" spacing={1}>
                {job.status === 'quote' && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Send />}
                    onClick={() => setQuoteSendOpen(true)}
                  >
                    Send Quote
                  </Button>
                )}
                {job.status === 'completed' && !job.invoice_id && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Receipt />}
                    onClick={handleCreateInvoice}
                  >
                    Create Invoice
                  </Button>
                )}
              </Stack>
            </Grid>
          </Grid>
          
          {/* Signatures */}
          {(job.customer_signature || job.supervisor_signature) && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>Signatures</Typography>
              <Stack direction="row" spacing={2}>
                {job.customer_signature && (
                  <Chip
                    icon={<CheckCircle />}
                    label={`Customer: ${job.customer_signed_name}`}
                    color="success"
                    variant="outlined"
                  />
                )}
                {job.supervisor_signature && (
                  <Chip
                    icon={<CheckCircle />}
                    label={`Supervisor: ${job.supervisor_signed_by?.name || 'Signed'}`}
                    color="success"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
      
      <Paper>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Documents" icon={<Description />} iconPosition="start" />
          <Tab label="Status History" icon={<History />} iconPosition="start" />
          <Tab label="Communications" icon={<Chat />} iconPosition="start" />
        </Tabs>
        
        <Box sx={{ p: 2 }}>
          {activeTab === 0 && (
            <JobDocumentUpload
              job={job}
              documents={documents}
              onDocumentAdded={handleDocumentAdded}
              onDocumentDeleted={handleDocumentDeleted}
            />
          )}
          
          {activeTab === 1 && (
            <List>
              {statusHistory.map((entry) => (
                <ListItem key={entry.id} divider>
                  <ListItemText
                    primary={`${entry.from_status_display || 'New'} → ${entry.to_status_display}`}
                    secondary={
                      <Stack>
                        <Typography variant="caption">
                          By {entry.changed_by_name} on {new Date(entry.changed_at).toLocaleString()}
                        </Typography>
                        {entry.reason && (
                          <Typography variant="caption" color="text.secondary">
                            {entry.reason}
                          </Typography>
                        )}
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
          
          {activeTab === 2 && (
            <List>
              {communications.map((comm) => {
                const Icon = comm.communication_type === 'email' ? Email : 
                             comm.communication_type === 'whatsapp' ? WhatsApp : Chat;
                return (
                  <ListItem key={comm.id} divider>
                    <ListItemIcon>
                      <Icon />
                    </ListItemIcon>
                    <ListItemText
                      primary={comm.subject || comm.communication_type_display}
                      secondary={
                        <Stack>
                          <Typography variant="caption">
                            {comm.direction_display} • {new Date(comm.sent_at).toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {comm.content}
                          </Typography>
                        </Stack>
                      }
                    />
                    {comm.is_delivered && (
                      <Chip label="Delivered" size="small" color="success" />
                    )}
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
      </Paper>
      
      {/* Modals */}
      <QuoteSendModal
        open={quoteSendOpen}
        onClose={() => setQuoteSendOpen(false)}
        job={job}
        onSuccess={handleQuoteSent}
      />
      
      <SignatureCapture
        open={signatureOpen}
        onClose={() => setSignatureOpen(false)}
        job={job}
        signatureType={signatureType}
        onSuccess={handleSignatureCaptured}
      />
      
      <JobInvoiceGeneration
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        job={job}
        onInvoiceCreated={handleInvoiceCreated}
      />
      
      <JobPaymentCollection
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        job={job}
        invoice={currentInvoice}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </Box>
  );
};

export default JobWorkflow;