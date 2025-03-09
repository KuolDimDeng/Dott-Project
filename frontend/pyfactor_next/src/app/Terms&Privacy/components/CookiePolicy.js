// src/app/Terms&Privacy/components/CookiePolicy.jsx
import React from 'react';
import {
  Typography,
  Box,
  Container,
  Paper,
  Divider,
  useTheme,
  useMediaQuery,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

const CookiePolicy = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const SectionTitle = ({ children }) => (
    <Typography
      variant={isMobile ? 'h6' : 'h5'}
      sx={{
        fontWeight: 'bold',
        color: theme.palette.primary.main,
        mt: 4,
        mb: 2,
      }}
    >
      {children}
    </Typography>
  );

  const SectionContent = ({ children }) => (
    <Typography
      variant="body1"
      sx={{
        mb: 3,
        lineHeight: 1.6,
        color: theme.palette.text.secondary,
      }}
    >
      {children}
    </Typography>
  );

  const SubsectionTitle = ({ children }) => (
    <Typography
      variant="h6"
      sx={{
        fontWeight: 'bold',
        color: theme.palette.text.primary,
        mt: 2,
        mb: 1,
        fontSize: isMobile ? '1rem' : '1.1rem',
      }}
    >
      {children}
    </Typography>
  );

  const cookieSections = [
    {
      title: '1. What Are Cookies',
      content:
        'Cookies are small text files that are stored on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners. Cookies help enhance your browsing experience by remembering your preferences, login status, and other customizations.',
    },
    {
      title: '2. How We Use Cookies',
      content:
        'Dott uses cookies for various purposes to improve your experience with our services:',
      subsections: [
        {
          title: '2.1 Essential Cookies',
          content: 'These cookies are necessary for the proper functioning of our website and services. They enable core functionality such as security, network management, and account access. You cannot opt out of these cookies as the website cannot function properly without them.'
        },
        {
          title: '2.2 Functional Cookies',
          content: 'These cookies enable us to provide enhanced functionality and personalization. They may be set by us or by third-party providers whose services we have added to our pages. If you disable these cookies, some or all of these services may not function properly.'
        },
        {
          title: '2.3 Analytics Cookies',
          content: 'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. They help us improve the way our website works and optimize user experience.'
        },
        {
          title: '2.4 Marketing Cookies',
          content: 'These cookies are used to track visitors across websites. They are set to display targeted advertisements based on your interests and online behavior. They also help measure the effectiveness of advertising campaigns.'
        }
      ]
    },
    {
      title: '3. Specific Cookies We Use',
      content:
        'Here are the specific cookies that Dott uses:',
      subsections: [
        {
          title: '3.1 Session Cookies',
          content: 'These temporary cookies are erased when you close your browser. They are used to store a temporary identifier that allows you to move from page to page without having to log in repeatedly.'
        },
        {
          title: '3.2 Persistent Cookies',
          content: 'These cookies remain on your device until they expire or you delete them. They help us recognize you as an existing user so it is easier to return to Dott and interact with our services without signing in again.'
        },
        {
          title: '3.3 Third-Party Cookies',
          content: 'We use services from third parties who may also set cookies on your device when you visit our site. These include analytics providers (like Google Analytics), payment processors (like Stripe and PayPal), and feature functionality providers (for customer support, chat, etc.).'
        }
      ]
    },
    {
      title: '4. Cookie Duration',
      content:
        'The length of time a cookie will remain on your device depends on whether it is a "persistent" or "session" cookie. Session cookies will remain on your device until you stop browsing. Persistent cookies remain on your device until they expire or are deleted.',
    },
    {
      title: '5. Managing Cookies',
      content:
        'You can control and manage cookies in various ways:',
      subsections: [
        {
          title: '5.1 Browser Settings',
          content: 'Most web browsers allow you to manage your cookie preferences. You can set your browser to refuse cookies, or to alert you when cookies are being sent. The methods for doing so vary from browser to browser, and from version to version. You can obtain up-to-date information about blocking and deleting cookies via the support pages of your browser:'
        },
        {
          title: '5.2 Our Cookie Preference Tool',
          content: 'When you first visit our website, you will be presented with a cookie consent banner that allows you to choose which types of cookies you accept.'
        },
        {
          title: '5.3 Impact of Disabling Cookies',
          content: 'Please note that if you choose to disable cookies, you may not be able to access certain parts of our website, and some features may not function properly. In particular, you will not be able to use features that require you to log in to your account.'
        }
      ]
    },
    {
      title: '6. Updates to This Cookie Policy',
      content:
        'We may update this Cookie Policy from time to time to reflect changes in technology, regulation, or our business practices. Any changes will become effective when we post the revised policy on our website. We encourage you to periodically review this page to stay informed about our use of cookies.',
    },
    {
      title: '7. Contact Us',
      content:
        'If you have any questions about our use of cookies or this Cookie Policy, please contact us at:',
    },
  ];

  return (
    <Container maxWidth="md">
      <Paper
        elevation={3}
        sx={{
          mt: 5,
          mb: 5,
          p: isMobile ? 3 : 5,
          borderRadius: 2,
        }}
      >
        <Typography
          variant={isMobile ? 'h4' : 'h3'}
          align="center"
          sx={{ fontWeight: 'bold', mb: 2 }}
        >
          Cookie Policy
        </Typography>

        <Typography variant="subtitle1" color="textSecondary" align="center" sx={{ mb: 4 }}>
          Effective as of: {new Date().toLocaleDateString()}
        </Typography>

        <Divider sx={{ mb: 4 }} />

        <SectionContent>
          This Cookie Policy explains how Dott LLC ("we", "us", or "our") uses cookies and similar technologies to recognize you when you visit our website at www.dottapps.com or use our mobile applications ("Services"). It explains what these technologies are and why we use them, as well as your rights to control our use of them.
        </SectionContent>

        <List>
          {cookieSections.map((section, index) => (
            <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 2 }}>
              <SectionTitle>{section.title}</SectionTitle>
              <SectionContent>{section.content}</SectionContent>
              
              {section.subsections && section.subsections.map((subsection, subIndex) => (
                <Box key={subIndex} sx={{ width: '100%', mb: 2 }}>
                  <SubsectionTitle>{subsection.title}</SubsectionTitle>
                  <SectionContent>{subsection.content}</SectionContent>
                </Box>
              ))}
              
              {index !== cookieSections.length - 1 && <Divider sx={{ width: '100%', mt: 2 }} />}
            </ListItem>
          ))}
        </List>

        <Box
          sx={{
            bgcolor: theme.palette.background.default,
            p: 3,
            borderRadius: 1,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="body2" component="address" sx={{ fontStyle: 'normal' }}>
            <strong>Dott LLC</strong>
            <br />
            800 N King Street
            Suite 304 #2797
            Wilmington, DE 19801
            United States            
            <br />
            Email: support@dottapps.com
            <br />
            Website: www.dottapps.com
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default CookiePolicy;