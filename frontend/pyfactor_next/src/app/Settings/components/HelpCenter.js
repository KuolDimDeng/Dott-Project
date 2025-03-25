import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Card,
  CardContent,
  CardActions,
  Link,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ArticleIcon from '@mui/icons-material/Article';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import DescriptionIcon from '@mui/icons-material/Description';

const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock FAQs
  const faqs = [
    {
      question: 'How do I create an invoice?',
      answer: 'To create an invoice, navigate to the "Invoices" tab from the dashboard, click on "New Invoice", fill in the required information, and click "Save" or "Send" to complete the process.'
    },
    {
      question: 'How can I add a new client?',
      answer: 'You can add a new client by going to the "Clients" section, clicking on "Add Client", and filling out the client information form with details such as name, contact information, and payment terms.'
    },
    {
      question: 'What payment methods are supported?',
      answer: 'We currently support credit card payments through Stripe, bank transfers, PayPal, and mobile money services depending on your region and account settings.'
    },
    {
      question: 'How do I generate financial reports?',
      answer: 'To generate financial reports, go to the "Reports" section, select the type of report you want (e.g., Profit & Loss, Balance Sheet), set the date range, and click "Generate Report".'
    },
    {
      question: 'Can I customize my invoice templates?',
      answer: 'Yes, you can customize invoice templates by going to "Settings" > "Invoice Settings", where you can adjust the layout, add your logo, and change colors to match your brand.'
    },
  ];

  // Mock popular articles
  const popularArticles = [
    { 
      title: 'Getting Started Guide', 
      icon: <SchoolIcon />, 
      description: 'Learn the basics of setting up your account and using the platform.'
    },
    { 
      title: 'Invoice Management', 
      icon: <DescriptionIcon />, 
      description: 'Everything you need to know about creating and managing invoices.'
    },
    { 
      title: 'Payment Processing', 
      icon: <ArticleIcon />, 
      description: 'Learn about different payment methods and how to process payments.'
    },
  ];

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // Filter FAQs based on search query
  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Help Center
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              How can we help you today?
            </Typography>
            <TextField
              fullWidth
              placeholder="Search for help topics..."
              value={searchQuery}
              onChange={handleSearchChange}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Frequently Asked Questions
            </Typography>
            
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => (
                <Accordion key={index} sx={{ mb: 1 }}>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                  >
                    <Typography sx={{ fontWeight: 'medium' }}>{faq.question}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2">{faq.answer}</Typography>
                  </AccordionDetails>
                </Accordion>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No results found for "{searchQuery}". Try a different search term or contact support.
              </Typography>
            )}
          </Paper>

          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Popular Articles
            </Typography>
            <Grid container spacing={2}>
              {popularArticles.map((article, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {article.icon}
                        <Typography variant="subtitle1" sx={{ ml: 1, fontWeight: 'medium' }}>
                          {article.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {article.description}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small" color="primary">
                        Read More
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ContactSupportIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Contact Support</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              Can't find what you're looking for? Our support team is here to help.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth
              startIcon={<HelpOutlineIcon />}
              sx={{ mb: 2 }}
            >
              Submit a Support Ticket
            </Button>
            <Typography variant="body2" color="text.secondary" paragraph>
              For urgent matters, contact us directly:
            </Typography>
            <Typography variant="body2" paragraph>
              Email: <Link href="mailto:support@pyfactor.com">support@pyfactor.com</Link>
            </Typography>
            <Typography variant="body2" paragraph>
              Phone: <Link href="tel:+12345678901">+1 (234) 567-8901</Link>
            </Typography>
            <Typography variant="body2" paragraph>
              Hours: Monday-Friday, 9AM-6PM EST
            </Typography>
          </Paper>

          <Paper elevation={1} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Community</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              Join our user community to connect with other users and share experiences.
            </Typography>
            <List>
              <ListItem button component="a" href="#" sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <ArticleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="User Forums" />
              </ListItem>
              <Divider component="li" />
              <ListItem button component="a" href="#" sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <SchoolIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Video Tutorials" />
              </ListItem>
              <Divider component="li" />
              <ListItem button component="a" href="#" sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <DescriptionIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Documentation" />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HelpCenter; 