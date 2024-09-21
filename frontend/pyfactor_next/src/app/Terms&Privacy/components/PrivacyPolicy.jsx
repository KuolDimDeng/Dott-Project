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

const TermsOfUse = () => {
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

  const terms = [
    {
      title: "1. Acceptance of Terms",
      content: "By using Dott, you agree to be bound by this Agreement. If you do not agree to these terms, please do not use our services."
    },
    {
      title: "2. Description of Service",
      content: "Dott is a [brief description of your app's main features and purpose]."
    },
    {
      title: "3. User Conduct",
      content: "You agree to use Dott only for lawful purposes and in accordance with this Agreement."
    },
    {
      title: "4. Intellectual Property",
      content: "All content and functionality on Dott is the property of Pyfactor, LLC or its licensors and is protected by copyright and other intellectual property laws."
    },
    {
      title: "5. Privacy",
      content: "Your privacy is important to us. Please refer to our Privacy Policy for information on how we collect, use, and disclose your personal information."
    },
    {
      title: "6. Limitation of Liability",
      content: "Pyfactor, LLC shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of or inability to use Dott."
    },
    {
      title: "7. Changes to Agreement",
      content: "We reserve the right to modify this Agreement at any time. We will notify users of any significant changes."
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
          Dott Terms of Use Agreement
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
          Welcome to Dott, a service provided by Pyfactor, LLC. This Terms of Use Agreement ("Agreement") governs your use of the Dott website and any related services offered by Pyfactor, LLC.
        </SectionContent>

        <List>
          {terms.map((term, index) => (
            <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 2 }}>
              <SectionTitle>{term.title}</SectionTitle>
              <SectionContent>{term.content}</SectionContent>
              {index !== terms.length - 1 && <Divider sx={{ width: '100%', mt: 2 }} />}
            </ListItem>
          ))}
        </List>

        <SectionTitle>8. Contact Information</SectionTitle>
        <SectionContent>
          If you have any questions about this Agreement, please contact us at:
        </SectionContent>
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
            Email: [Your contact email]
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default TermsOfUse;