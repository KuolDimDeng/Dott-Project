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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import EmailIcon from '@mui/icons-material/Email';
import { useApi } from '@/lib/axiosConfig';
import Image from 'next/image';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import HelpIcon from '@mui/icons-material/Help'; // Import the Help icon

const faqs = [
  {
    question: 'How do I create an invoice?',
    answer:
      "To create an invoice, navigate to the 'Sales' section in the sidebar, then click on 'Create New' and select 'Invoice'. Fill in the required details and click 'Save'.",
  },
  {
    question: 'How can I connect my bank account?',
    answer:
      "Go to the 'Banking' section, click on 'Connect Bank Account', and follow the prompts to securely link your bank account to the platform.",
  },
  {
    question: 'How do I generate financial reports?',
    answer:
      "Navigate to the 'Reports' section in the sidebar. Choose the type of report you want to generate, set the date range, and click 'Generate Report'.",
  },
  {
    question: 'Is my data secure when using Dott?',
    answer:
      "Absolutely. Dott ensures bank-level encryption and security to protect your sensitive data, whether you're using our web or mobile platforms.",
  },
  {
    question: 'Can I use Dott on mobile?',
    answer:
      'Yes! Dott offers a mobile app for both iOS and Android, making it easy to manage your business from anywhere.',
  },
  {
    question: 'Does Dott offer payroll management?',
    answer:
      'Yes, Dott provides payroll management that allows you to automate payroll processing, ensuring compliance with tax laws and regulations.',
  },
  {
    question: 'What payment methods can my customers use?',
    answer:
      'Your customers can pay using various methods, including mobile money, credit cards, and bank transfers, integrated with platforms like Stripe, Venmo, and PayPal.',
  },
  {
    question: 'Does Dott support multi-currency transactions?',
    answer:
      'Yes, Dott supports multi-currency transactions, making it easier for you to handle international business.',
  },
  {
    question: 'Can I automate recurring payments?',
    answer:
      'Absolutely! With Dott, you can set up recurring invoices and payments, helping you streamline your business operations.',
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

  const handleSearch = () => {
    // Implement search functionality here
    console.log('Searching for:', searchTerm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await useApi.post('/api/help/contact', { name, email, message });
      setSnackbarOpen(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
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
              />
              <Button
                variant="contained"
                onClick={handleSearch}
                sx={{
                  ml: 1,
                  color: 'white', // This makes the text (icon in this case) white

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

          <Typography variant="h6" gutterBottom>
            Frequently Asked Questions
          </Typography>
          {faqs.map((faq, index) => (
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
          ))}
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
                  <HelpOutlineIcon />
                </ListItemIcon>
                <ListItemText primary="Video Tutorials" />
              </ListItem>
              <ListItem button component="a" href="/user-guide">
                <ListItemIcon>
                  <HelpOutlineIcon />
                </ListItemIcon>
                <ListItemText primary="User Guide" />
              </ListItem>
              <ListItem button component="a" href="/blog">
                <ListItemIcon>
                  <HelpOutlineIcon />
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
              <Button
                type="submit"
                variant="contained"
                startIcon={<EmailIcon />}
                sx={{
                  color: 'white', // This makes the text (icon in this case) white
                  mt: 2,
                  backgroundColor: '#0d47a1',
                  '&:hover': {
                    backgroundColor: '#002171',
                  },
                }}
              >
                Send Message
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
  );
};

export default HelpCenter;
