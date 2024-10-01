import React from 'react';
import { 
  Typography, 
  Box, 
  Container, 
  Paper, 
  Divider, 
  useTheme, 
  useMediaQuery 
} from '@mui/material';

const TermsOfUse = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const SectionTitle = ({ children }) => (
    <Typography 
      variant={isMobile ? "h6" : "h5"} 
      gutterBottom 
      sx={{ 
        fontWeight: 'bold', 
        color: theme.palette.primary.main,
        mt: 3,
        mb: 2
      }}
    >
      {children}
    </Typography>
  );

  const SectionContent = ({ children }) => (
    <Typography 
      variant="body1" 
      paragraph 
      sx={{ 
        lineHeight: 1.6,
        color: theme.palette.text.secondary
      }}
    >
      {children}
    </Typography>
  );

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
          gutterBottom 
          align="center"
          sx={{ fontWeight: 'bold', mb: 3 }}
        >
          Terms of Use
        </Typography>
        
        <Typography 
          variant="subtitle1" 
          color="textSecondary" 
          align="center" 
          paragraph
        >
          Effective as of: {new Date().toLocaleDateString()}
        </Typography>

        <Divider sx={{ my: 3 }} />

        <SectionContent>
          Welcome to Dott, a service provided by Pyfactor, LLC. This Terms of Use Agreement ("Agreement") governs your use of the Dott website and any related services offered by Pyfactor, LLC.
        </SectionContent>

        <SectionTitle>1. Acceptance of Terms</SectionTitle>
        <SectionContent>
          By using Dott, you agree to be bound by this Agreement. If you do not agree to these terms, please do not use our services.
        </SectionContent>

        <SectionTitle>2. Description of Service</SectionTitle>
        <SectionContent>
          Dott is a [brief description of your app's main features and purpose].
        </SectionContent>

        <SectionTitle>3. User Conduct</SectionTitle>
        <SectionContent>
          You agree to use Dott only for lawful purposes and in accordance with this Agreement.
        </SectionContent>

        <SectionTitle>4. Intellectual Property</SectionTitle>
        <SectionContent>
          All content and functionality on Dott is the property of Pyfactor, LLC or its licensors and is protected by copyright and other intellectual property laws.
        </SectionContent>

        <SectionTitle>5. Privacy</SectionTitle>
        <SectionContent>
          Your privacy is important to us. Please refer to our Privacy Policy for information on how we collect, use, and disclose your personal information.
        </SectionContent>

        <SectionTitle>6. Limitation of Liability</SectionTitle>
        <SectionContent>
          Pyfactor, LLC shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of or inability to use Dott.
        </SectionContent>

        <SectionTitle>7. Changes to Agreement</SectionTitle>
        <SectionContent>
          We reserve the right to modify this Agreement at any time. We will notify users of any significant changes.
        </SectionContent>

        <SectionTitle>8. Contact Information</SectionTitle>
        <SectionContent>
          If you have any questions about this Agreement, please contact us at:
        </SectionContent>
        <Box sx={{ pl: 2, borderLeft: `4px solid ${theme.palette.primary.main}`, mt: 2 }}>
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            Pyfactor, LLC<br />
            [Enter Address Here]<br />
            Email: [Your contact email]
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default TermsOfUse;