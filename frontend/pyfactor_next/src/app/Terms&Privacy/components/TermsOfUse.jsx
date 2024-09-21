import React from 'react';
import { Typography, Box } from '@mui/material';

const TermsOfUse = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dott Terms of Use Agreement
      </Typography>
      <Typography variant="body1" paragraph>
        Effective as of: [Current Date]
      </Typography>
      <Typography variant="body1" paragraph>
        Welcome to Dott, a service provided by Pyfactor, LLC. This Terms of Use Agreement ("Agreement") governs your use of the Dott website and any related services offered by Pyfactor, LLC.
      </Typography>
      <Typography variant="h5" gutterBottom>
        1. Acceptance of Terms
      </Typography>
      <Typography variant="body1" paragraph>
        By using Dott, you agree to be bound by this Agreement. If you do not agree to these terms, please do not use our services.
      </Typography>
      <Typography variant="h5" gutterBottom>
        2. Description of Service
      </Typography>
      <Typography variant="body1" paragraph>
        Dott is a [brief description of your app's main features and purpose].
      </Typography>
      <Typography variant="h5" gutterBottom>
        3. User Conduct
      </Typography>
      <Typography variant="body1" paragraph>
        You agree to use Dott only for lawful purposes and in accordance with this Agreement.
      </Typography>
      <Typography variant="h5" gutterBottom>
        4. Intellectual Property
      </Typography>
      <Typography variant="body1" paragraph>
        All content and functionality on Dott is the property of Pyfactor, LLC or its licensors and is protected by copyright and other intellectual property laws.
      </Typography>
      <Typography variant="h5" gutterBottom>
        5. Privacy
      </Typography>
      <Typography variant="body1" paragraph>
        Your privacy is important to us. Please refer to our Privacy Policy for information on how we collect, use, and disclose your personal information.
      </Typography>
      <Typography variant="h5" gutterBottom>
        6. Limitation of Liability
      </Typography>
      <Typography variant="body1" paragraph>
        Pyfactor, LLC shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of or inability to use Dott.
      </Typography>
      <Typography variant="h5" gutterBottom>
        7. Changes to Agreement
      </Typography>
      <Typography variant="body1" paragraph>
        We reserve the right to modify this Agreement at any time. We will notify users of any significant changes.
      </Typography>
      <Typography variant="h5" gutterBottom>
        8. Contact Information
      </Typography>
      <Typography variant="body1" paragraph>
        If you have any questions about this Agreement, please contact us at:
      </Typography>
      <Typography variant="body1">
        Pyfactor, LLC<br />
        [Enter Address Here]<br />
        Email: [Your contact email]
      </Typography>
    </Box>
  );
};

export default TermsOfUse;