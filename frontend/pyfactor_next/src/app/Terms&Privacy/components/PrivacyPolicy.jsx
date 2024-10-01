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
  ListItemText
} from '@mui/material';

const PrivacyPolicy = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const SectionTitle = ({ children }) => (
    <Typography 
      variant={isMobile ? "h6" : "h5"} 
      sx={{ 
        fontWeight: 'bold', 
        color: theme.palette.primary.main,
        mt: 4,
        mb: 2
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
        color: theme.palette.text.secondary
      }}
    >
      {children}
    </Typography>
  );

  const privacySections = [
    {
      title: "A. Scope",
      content: "Protecting your personal information is important to us. This privacy policy applies to our products and services offered under the Dott brand, our websites, and our mobile applications that incorporate this privacy policy. Our products and services are offered by Pyfactor, LLC."
    },
    {
      title: "B. Personal Information",
      content: "As part of providing our services, we may collect personal information about you and your business. 'Personal Information' is data that can be used to identify a person individually. This policy outlines our collection, protection, use, retention, disclosure and other processing of Personal Information and your rights relating to these activities."
    },
    {
      title: "C. Categories of Personal Information Collected",
      content: "The information we may collect includes, but is not limited to: Contact Information, Government Identification Numbers, Date of Birth, Financial Information, Payment Data, Geo-Location Information, Device Information, Login Information, Demographic Information, and Professional or employment-related information."
    },
    {
      title: "D. How We Use Your Information",
      content: "We use your information to provide you with the products and services you request. We may also use your information to improve our services, communicate with you, and comply with legal obligations. We do not sell your Personal Information to other companies."
    },
    {
      title: "E. Information Sharing and Disclosure",
      content: "We may disclose your Personal Information to our affiliates, service providers, and business partners as necessary to provide our services or as permitted by law. We require all third parties to respect the security of your Personal Information and to treat it in accordance with the law."
    },
    {
      title: "F. Your Choices and Rights",
      content: "Depending on your jurisdiction, you may have the right to access, correct, or delete your Personal Information. You may also have the right to object to or restrict certain types of processing. To exercise these rights, please contact us at privacy@dott.com."
    },
    {
      title: "G. Data Security",
      content: "We implement appropriate technical and organizational measures to protect your personal information against unauthorized or unlawful processing, accidental loss, destruction, or damage."
    },
    {
      title: "H. International Data Transfers",
      content: "Your information may be transferred to and processed in countries other than the country you live in. These countries may have data protection laws different from the laws of your country."
    },
    {
      title: "I. Changes to This Privacy Policy",
      content: "We may update this privacy policy from time to time. We will notify you of any significant changes by posting the new Privacy Policy on this page and updating the effective date at the top of this page."
    },
    {
      title: "J. Contact Us",
      content: "If you have any questions about this Privacy Policy, please contact us at privacy@dott.com or at the address provided below."
    }
  ];

  return (
    <Container maxWidth="md">
      <Paper 
        elevation={3} 
        sx={{ 
          mt: 5, 
          mb: 5, 
          p: isMobile ? 3 : 5,
          borderRadius: 2
        }}
      >
        <Typography 
          variant={isMobile ? "h4" : "h3"} 
          align="center"
          sx={{ fontWeight: 'bold', mb: 2 }}
        >
          Privacy Policy
        </Typography>
        
        <Typography 
          variant="subtitle1" 
          color="textSecondary" 
          align="center" 
          sx={{ mb: 4 }}
        >
          Effective as of: {new Date().toLocaleDateString()}
        </Typography>

        <Divider sx={{ mb: 4 }} />

        <SectionContent>
          We value your trust and respect your privacy. We exist to support users like you by offering a fast and easy way to manage your tasks and projects. We've worked hard to explain—clearly and in plain language—what we do, what information we collect, and why, so you can feel confident about using Dott.
        </SectionContent>

        <List>
          {privacySections.map((section, index) => (
            <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 2 }}>
              <SectionTitle>{section.title}</SectionTitle>
              <SectionContent>{section.content}</SectionContent>
              {index !== privacySections.length - 1 && <Divider sx={{ width: '100%', mt: 2 }} />}
            </ListItem>
          ))}
        </List>

        <Box 
          sx={{ 
            bgcolor: theme.palette.background.default, 
            p: 3, 
            borderRadius: 1,
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <Typography variant="body2" component="address" sx={{ fontStyle: 'normal' }}>
            <strong>Pyfactor, LLC</strong><br />
            [Enter Address Here]<br />
            Email: privacy@dott.com
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default PrivacyPolicy;