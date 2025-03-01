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

const PrivacyPolicy = () => {
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

  const privacySections = [
    {
      title: 'A. Scope',
      content:
        'Protecting your personal information is important to us. This privacy policy applies to our products and services offered under the Dott brand, our websites, and our mobile applications that incorporate this privacy policy. Our products and services are offered by Dott LLC. This policy covers how we collect, use, store, process, and share your information in connection with our financial management platform, including accounting, payroll, payment processing, invoicing, and other services.',
    },
    {
      title: 'B. Personal Information',
      content:
        "As part of providing our services, we may collect personal information about you, your business, your employees, and your customers. 'Personal Information' is data that can be used to identify a person individually. This policy outlines our collection, protection, use, retention, disclosure and other processing of Personal Information and your rights relating to these activities.",
      subsections: [
        {
          title: 'B.1 Business Information',
          content: 'This includes your business name, address, tax identification numbers, industry type, business entity type, and other information necessary to provide our services.'
        },
        {
          title: 'B.2 Individual Information',
          content: 'This includes information about you as a business owner, your employees, contractors, and your customers, as necessary to provide our services.'
        }
      ]
    },
    {
      title: 'C. Categories of Personal Information Collected',
      content:
        'The information we may collect includes, but is not limited to:',
      subsections: [
        {
          title: 'C.1 Identification Information',
          content: 'Contact Information (name, email address, phone number, postal address), Government Identification Numbers (EIN, SSN, tax IDs), Date of Birth, photographic ID, and business documentation.'
        },
        {
          title: 'C.2 Financial Information',
          content: 'Bank account details, payment card information, transaction history, account balances, payment records, credit history, financial statements, and payroll information.'
        },
        {
          title: 'C.3 Employee Information',
          content: 'For payroll services, we collect information about your employees including their names, contact details, salary information, tax withholding information, bank details for direct deposit, and other employment-related data.'
        },
        {
          title: 'C.4 Technical Information',
          content: 'Device Information (IP address, device type, operating system), Browser Information, Geo-Location Data, Usage Data, Login Information, and Application Interaction Data.'
        },
        {
          title: 'C.5 Customer Information',
          content: 'When you use our invoicing or payment processing features, we may collect information about your customers necessary to process these transactions.'
        }
      ]
    },
    {
      title: 'D. How We Collect Your Information',
      content: 'We collect information from various sources:',
      subsections: [
        {
          title: 'D.1 Direct Collection',
          content: 'Information you provide when you register for our services, set up your account, connect your financial accounts, process payments, or communicate with us.'
        },
        {
          title: 'D.2 Automated Collection',
          content: 'Information collected automatically through cookies, web beacons, and similar technologies when you use our services.'
        },
        {
          title: 'D.3 Third-Party Sources',
          content: 'Information we receive from third-party service providers, business partners, identity verification services, credit bureaus, and other publicly available sources.'
        },
        {
          title: 'D.4 Financial Institutions',
          content: 'When you connect your bank accounts or other financial services to Dott, we collect information from these financial institutions with your authorization.'
        }
      ]
    },
    {
      title: 'E. How We Use Your Information',
      content:
        'We use your information for the following purposes:',
      subsections: [
        {
          title: 'E.1 Providing and Improving Our Services',
          content: 'To deliver the financial management services you request, process transactions, facilitate payments, manage invoices, process payroll, provide technical support, and improve our platform.'
        },
        {
          title: 'E.2 Authentication and Security',
          content: 'To verify your identity, secure your account, prevent fraud, and ensure the security of our platform.'
        },
        {
          title: 'E.3 Communications',
          content: 'To communicate with you about your account, provide customer support, send service updates, and, with your consent, send marketing communications.'
        },
        {
          title: 'E.4 Legal Compliance',
          content: 'To comply with our legal obligations, including anti-money laundering regulations, tax reporting requirements, and other financial services regulations.'
        },
        {
          title: 'E.5 Analytics and Improvements',
          content: 'To analyze usage patterns, troubleshoot technical issues, and develop new features and services.'
        }
      ]
    },
    {
      title: 'F. Information Sharing and Disclosure',
      content:
        'We may share your information with the following categories of recipients:',
      subsections: [
        {
          title: 'F.1 Service Providers',
          content: 'Third-party service providers who help us deliver our services, including payment processors (Stripe, Flutterwave, DLocal, Wise, PayPal), hosting providers, customer support services, and analytics providers.'
        },
        {
          title: 'F.2 Financial Partners',
          content: 'Banks and financial institutions necessary to process transactions, facilitate payments, and provide invoice factoring services.'
        },
        {
          title: 'F.3 Legal and Regulatory Authorities',
          content: 'Government authorities, law enforcement, and other third parties where required by law, to comply with legal process, or to protect our rights.'
        },
        {
          title: 'F.4 Business Transfers',
          content: 'In connection with any merger, acquisition, or sale of company assets, your information may be transferred as a business asset.'
        },
        {
          title: 'F.5 With Your Consent',
          content: 'We may share your information with other third parties when you have given your consent to do so.'
        }
      ]
    },
    {
      title: 'G. Your Choices and Rights',
      content:
        'Depending on your jurisdiction, you may have the following rights regarding your personal information:',
      subsections: [
        {
          title: 'G.1 Access and Portability',
          content: 'You may request access to your personal information and receive a copy in a structured, commonly used format.'
        },
        {
          title: 'G.2 Correction',
          content: 'You may request that we correct inaccurate or incomplete personal information.'
        },
        {
          title: 'G.3 Deletion',
          content: 'You may request that we delete your personal information, subject to certain exceptions.'
        },
        {
          title: 'G.4 Objection and Restriction',
          content: 'You may object to or request restriction of processing of your personal information.'
        },
        {
          title: 'G.5 Withdraw Consent',
          content: 'Where we rely on your consent to process your personal information, you may withdraw your consent at any time.'
        },
        {
          title: 'G.6 How to Exercise Your Rights',
          content: 'To exercise your rights, please contact us at support@dottapps.com We may need to verify your identity before fulfilling your request.'
        }
      ]
    },
    {
      title: 'H. Data Security',
      content:
        'We implement appropriate technical and organizational measures to protect your personal information:',
      subsections: [
        {
          title: 'H.1 Security Measures',
          content: 'We use industry-standard security measures including encryption, access controls, firewalls, and regular security assessments.'
        },
        {
          title: 'H.2 Payment Information',
          content: 'Payment information is processed in compliance with the Payment Card Industry Data Security Standard (PCI DSS).'
        },
        {
          title: 'H.3 Employee Access',
          content: 'We restrict employee access to personal information to those who need it to perform their job functions.'
        },
        {
          title: 'H.4 Data Breach Procedures',
          content: 'We have procedures in place to respond to suspected data security breaches and will notify you and applicable regulators of breaches as required by law.'
        }
      ]
    },
    {
      title: 'I. Data Retention',
      content:
        'We retain your personal information for as long as necessary to provide our services and for legitimate business purposes, such as maintaining business records, complying with legal obligations, resolving disputes, and enforcing our agreements. When we no longer need your personal information, we will securely delete or anonymize it.'
    },
    {
      title: 'J. International Data Transfers',
      content:
        'Your information may be transferred to and processed in countries other than the country you live in, including the United States, Rwanda, and other countries where Dott LLC or its service providers operate. These countries may have data protection laws different from the laws of your country. We implement appropriate safeguards to protect your information when transferred internationally, such as standard contractual clauses approved by relevant data protection authorities.'
    },
    {
      title: 'K. Children\'s Privacy',
      content:
        'Our services are not directed to children under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us so that we can delete the information.'
    },
    {
      title: 'L. Cookies and Similar Technologies',
      content:
        'We use cookies and similar technologies to collect information about how you interact with our services, to remember your preferences, and to optimize your experience. You can manage your cookie preferences through your browser settings.',
      subsections: [
        {
          title: 'L.1 Types of Cookies We Use',
          content: 'Essential cookies (necessary for the functionality of our services), Analytical cookies (to understand how users interact with our services), and Marketing cookies (to deliver relevant advertisements).'
        },
        {
          title: 'L.2 Your Cookie Choices',
          content: 'Most web browsers allow you to control cookies through their settings. However, if you reject certain cookies, you may not be able to use all features of our services.'
        }
      ]
    },
    {
      title: 'M. Changes to This Privacy Policy',
      content:
        'We may update this privacy policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any material changes by posting the new version on our website and updating the effective date. We encourage you to review our privacy policy periodically.'
    },
    {
      title: 'N. Contact Us',
      content:
        'If you have any questions about this Privacy Policy or our data practices, or if you wish to exercise your rights regarding your personal information, please contact us at:',
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
          Privacy Policy
        </Typography>

        <Typography variant="subtitle1" color="textSecondary" align="center" sx={{ mb: 4 }}>
          Effective as of: {new Date().toLocaleDateString()}
        </Typography>

        <Divider sx={{ mb: 4 }} />

        <SectionContent>
          At Dott LLC, we value your trust and respect your privacy. We exist to provide businesses with comprehensive financial management tools. This Privacy Policy explains—in clear and plain language—what information we collect, how we use it, and the choices you have regarding your personal information, so you can feel confident about using our platform.
        </SectionContent>

        <List>
          {privacySections.map((section, index) => (
            <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 2 }}>
              <SectionTitle>{section.title}</SectionTitle>
              <SectionContent>{section.content}</SectionContent>
              
              {section.subsections && section.subsections.map((subsection, subIndex) => (
                <Box key={subIndex} sx={{ width: '100%', mb: 2 }}>
                  <SubsectionTitle>{subsection.title}</SubsectionTitle>
                  <SectionContent>{subsection.content}</SectionContent>
                </Box>
              ))}
              
              {index !== privacySections.length - 1 && <Divider sx={{ width: '100%', mt: 2 }} />}
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
            [Enter Address Here]
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

export default PrivacyPolicy;