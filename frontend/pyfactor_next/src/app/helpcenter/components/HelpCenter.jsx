import React, { useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Button,
  Snackbar,
  Alert,
  Grid,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import EmailIcon from '@mui/icons-material/Email';
import DescriptionIcon from '@mui/icons-material/Description';
import VideocamIcon from '@mui/icons-material/Videocam';
import BookIcon from '@mui/icons-material/Book';
import { axiosInstance } from '@/lib/axiosConfig';
import Image from 'next/image';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import HelpIcon from '@mui/icons-material/Help';

const faqs = [
  {
    question: 'How do I create an invoice?',
    answer:
      "To create an invoice, navigate to the 'Sales' section in the sidebar, then click on 'Create New' and select 'Invoice'. Fill in the required details including customer information, items/services, quantities, prices, and any applicable taxes or discounts. You can also add notes, payment terms, and due dates. Preview the invoice before saving to ensure everything is correct. Click 'Save' to finalize the invoice, after which you can choose to send it directly to the customer or download it as a PDF.",
  },
  {
    question: 'How can I connect my bank account?',
    answer:
      "Go to the 'Banking' section in the main menu, then click on 'Connect Bank Account'. You'll be presented with a list of supported financial institutions. Select your bank and follow the secure authentication process. Dott uses bank-level encryption to establish a secure connection. Once verified, you'll be able to choose which accounts to connect (checking, savings, etc.). After successful connection, your transactions will begin syncing automatically within 24-48 hours. You can manage connected accounts from the Banking section at any time.",
  },
  {
    question: 'How do I generate financial reports?',
    answer:
      "Navigate to the 'Reports' section in the sidebar. Choose the type of report you want to generate (Profit & Loss, Balance Sheet, Cash Flow, etc.). Set the date range for your report - you can use preset periods (This Month, Last Quarter, Year to Date, etc.) or choose custom dates. Apply any filters if needed, such as specific projects, clients, or departments. Click 'Generate Report' to create your financial statement. Once generated, you can export the report as PDF, Excel, or CSV formats for sharing or further analysis. Reports can also be scheduled to automatically generate on a recurring basis.",
  },
  {
    question: 'Is my data secure when using Dott?',
    answer:
      "Absolutely. Dott ensures bank-level encryption and security to protect your sensitive data, whether you're using our web or mobile platforms. We implement 256-bit SSL encryption for all data transmission, and all stored information is encrypted at rest. We follow SOC 2 compliance standards and regularly undergo security audits by third-party specialists. Our platform uses multi-factor authentication to protect your account from unauthorized access. We never share your financial data with third parties without your explicit consent. Additionally, we perform regular backups to protect against data loss and maintain strict access controls within our organization.",
  },
  {
    question: 'Can I use Dott on mobile?',
    answer:
      'Yes! Dott offers native mobile apps for both iOS and Android, making it easy to manage your business from anywhere. The mobile apps include most features from the web version, including invoice creation and sending, expense tracking, receipt scanning, and financial reporting. You can capture photos of receipts directly within the app for immediate expense recording. Push notifications keep you updated on payment statuses, approaching due dates, and account activity. Your data synchronizes seamlessly between mobile and web versions, ensuring you always have access to up-to-date information regardless of which device you use.',
  },
  {
    question: 'Does Dott offer payroll management?',
    answer:
      'Yes, Dott provides comprehensive payroll management that allows you to automate payroll processing, ensuring compliance with tax laws and regulations. You can manage both employees and contractors, process direct deposits, calculate tax withholdings automatically, track vacation and sick leave, and generate payroll reports. Our platform supports multiple pay schedules (weekly, bi-weekly, monthly) and handles year-end tax documents like W-2s and 1099s. Dott also offers employee self-service portals where staff can access pay stubs, tax documents, and update personal information. The payroll system integrates seamlessly with our time tracking and accounting features for a complete business management solution.',
  },
  {
    question: 'What payment methods can my customers use?',
    answer:
      'Your customers can pay using a wide variety of methods, including mobile money services (M-Pesa, MTN Mobile Money), credit/debit cards (Visa, Mastercard, American Express), bank transfers (ACH, SEPA, wire transfers), and digital wallets (PayPal, Apple Pay, Google Pay). We integrate with global payment processors like Stripe, Flutterwave (for Africa), DLocal (for Latin America), and many others to ensure you can accept payments from customers worldwide. You can enable specific payment methods based on your business needs and customer preferences. For recurring payments, customers can securely save their payment information for future transactions.',
  },
  {
    question: 'Does Dott support multi-currency transactions?',
    answer:
      'Yes, Dott fully supports multi-currency transactions, making it easier for you to handle international business. You can create invoices, record expenses, and generate reports in more than 130 currencies. Exchange rates are automatically updated daily, but you can also set custom rates if needed. The platform allows you to define a base currency for your business while still working with foreign currencies. When receiving payments in foreign currencies, you can choose to convert immediately or hold funds in the original currency. Our multi-currency reporting gives you clear insights into your global financial position, with options to view reports in any currency you choose.',
  },
  {
    question: 'Can I automate recurring payments?',
    answer:
      'Absolutely! With Dott, you can set up recurring invoices and payments, helping you streamline your business operations. For subscription-based businesses, you can create templates with customizable billing frequencies (weekly, monthly, quarterly, yearly). Set specific billing dates, automatic payment collection methods, and stop dates if applicable. The system automatically notifies customers before payments are processed and sends receipts after successful transactions. You can track all recurring revenue streams through dedicated reports and dashboards. If a payment fails, our system will automatically retry based on your configured retry settings and alert you if intervention is needed.',
  },
  {
    question: 'How do I set up different tax rates for different regions?',
    answer:
      'Dott makes it easy to configure multiple tax rates for different regions. Navigate to "Settings" > "Tax Settings" to manage your tax profiles. You can create specific tax rates for each country, state, or city where you do business. For each jurisdiction, you can set up multiple tax types (sales tax, VAT, GST) with their respective rates. The system automatically applies the correct tax based on your customer\'s location. For businesses with complex tax requirements, you can also create tax groups that combine multiple taxes. Our platform keeps up with tax regulation changes in major jurisdictions to help ensure compliance.',
  },
  {
    question: 'Can I track time and bill hours through Dott?',
    answer:
      'Yes, Dott includes comprehensive time tracking features that integrate with invoicing. Team members can log time through the web interface or mobile app, categorizing hours by client, project, or task. Time entries can include notes and attachments for detailed documentation. For client billing, you can set different hourly rates by project, service type, or team member. Time entries can be easily converted into invoices with a few clicks, either individually or in batches. The system also provides time utilization reports to help you analyze team productivity and project profitability.',
  },
  {
    question: 'How do I manage permissions for my team members?',
    answer:
      'Dott offers granular permission controls to ensure team members have appropriate access. Navigate to "Settings" > "Team Members" to invite new users and manage existing ones. You can assign predefined roles like Admin, Manager, Accountant, or Employee, each with different permission levels. For more specific needs, you can create custom roles with precise access controls. Permissions can be set for different areas including accounting, invoicing, expenses, banking, reports, payroll, and settings. You can restrict access by department, location, or client if needed. All user activity is logged in the system for accountability and security auditing.',
  },
  {
    question: 'Can I customize my invoice templates?',
    answer:
      'Absolutely! Dott provides extensive invoice customization options. Go to "Settings" > "Templates" to access the invoice editor. You can add your company logo, change colors to match your brand, and select different layouts. Customize which fields appear on invoices and their positioning. Add personalized terms and conditions, thank you messages, or payment instructions. Save multiple templates for different purposes (quotes, standard invoices, receipts). You can also create language-specific templates for international clients. All templates are mobile-responsive and look professional when viewed on any device or printed.',
  },
  {
    question: 'How do I reconcile my bank transactions in Dott?',
    answer:
      'Bank reconciliation in Dott is straightforward. Once your bank account is connected, transactions import automatically. Navigate to the "Banking" section and select "Reconcile" for the appropriate account. The system uses smart matching to automatically pair imported transactions with those in your books. For unmatched transactions, you can categorize them individually or in batches. You can create rules to automatically categorize recurring transactions. The reconciliation page clearly shows matched, unmatched, and pending transactions, with real-time updates of your reconciled balance. Once complete, you can generate reconciliation reports for your records or accountant review.',
  },
  {
    question: 'Does Dott work in countries with mobile money like M-Pesa?',
    answer:
      'Yes, Dott is specifically designed to work seamlessly with mobile money services like M-Pesa, MTN Mobile Money, Orange Money, and others popular across Africa and parts of Asia. Through our integration with Flutterwave and other regional payment processors, your business can accept mobile money payments directly from customers. The funds appear in your Dott dashboard in real-time once transactions are completed. You can also use mobile money for disbursements, making it easy to pay suppliers or employees who prefer these payment methods. Our reporting system properly categorizes and tracks all mobile money transactions for easy reconciliation and financial management.',
  },
];

const theme = createTheme({
  palette: {
    primary: {
      main: '#0d47a1', // Navy blue color
    },
  },
});

const HelpCenter = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filteredFaqs, setFilteredFaqs] = useState(faqs);

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredFaqs(faqs);
      return;
    }
    
    const filtered = faqs.filter(
      faq => 
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFaqs(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await axiosInstance.post('/api/help/contact', { name, email, message });
      setSnackbarOpen(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <HelpIcon sx={{ fontSize: 45, color: theme.palette.primary.main, mr: 1 }} />
          <Typography variant="h4" gutterBottom>
            Help Center
          </Typography>
        </Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Search for Help
              </Typography>
              <Box sx={{ display: 'flex', mb: 2 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search for help topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  sx={{
                    ml: 1,
                    color: 'white',
                    backgroundColor: '#0d47a1',
                    '&:hover': {
                      backgroundColor: '#002171',
                    },
                  }}
                >
                  <SearchIcon />
                </Button>
              </Box>
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Frequently Asked Questions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filteredFaqs.length} {filteredFaqs.length === 1 ? 'result' : 'results'} found
              </Typography>
            </Box>
            
            {filteredFaqs.length === 0 ? (
              <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No results found for "{searchTerm}". Try a different search term or browse our help topics below.
                </Typography>
              </Paper>
            ) : (
              filteredFaqs.map((faq, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography
                      sx={{
                        fontWeight: 'bold',
                        color: theme.palette.primary.main,
                      }}
                    >
                      {faq.question}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography>{faq.answer}</Typography>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
            
            {/* FAQ Image */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Image
                src="/static/images/FAQ.png"
                alt="FAQ Illustration"
                width={300}
                height={200}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quick Links
              </Typography>
              <List>
                <ListItem button component="a" href="/tutorials">
                  <ListItemIcon>
                    <VideocamIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Video Tutorials" />
                </ListItem>
                <ListItem button component="a" href="/user-guide">
                  <ListItemIcon>
                    <BookIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="User Guide" />
                </ListItem>
                <ListItem button component="a" href="/blog">
                  <ListItemIcon>
                    <DescriptionIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Blog & Tips" />
                </ListItem>
              </List>
            </Paper>

            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Contact Support
              </Typography>
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Name"
                  variant="outlined"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label="Email"
                  variant="outlined"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                  type="email"
                />
                <TextField
                  fullWidth
                  label="Message"
                  variant="outlined"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  margin="normal"
                  required
                  multiline
                  rows={4}
                />
                {error && (
                  <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                    {error}
                  </Typography>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={isLoading ? null : <EmailIcon />}
                  disabled={isLoading}
                  sx={{
                    color: 'white',
                    mt: 2,
                    backgroundColor: '#0d47a1',
                    '&:hover': {
                      backgroundColor: '#002171',
                    },
                  }}
                >
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Send Message'}
                </Button>
              </form>
              <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
                We aim to respond to all inquiries within 24 hours.
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
          <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: '100%' }}>
            Your message has been sent successfully. We'll get back to you within 24 hours.
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default HelpCenter;