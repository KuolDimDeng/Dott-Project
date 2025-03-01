import React from 'react';
import { Typography, Box, Container, Paper, Divider, useTheme, useMediaQuery } from '@mui/material';

const TermsOfUse = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const SectionTitle = ({ children }) => (
    <Typography
      variant={isMobile ? 'h6' : 'h5'}
      gutterBottom
      sx={{
        fontWeight: 'bold',
        color: theme.palette.primary.main,
        mt: 3,
        mb: 2,
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
        color: theme.palette.text.secondary,
      }}
    >
      {children}
    </Typography>
  );
  
  const SubsectionTitle = ({ children }) => (
    <Typography
      variant="h6"
      gutterBottom
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
          gutterBottom
          align="center"
          sx={{ fontWeight: 'bold', mb: 3 }}
        >
          Terms of Use
        </Typography>

        <Typography variant="subtitle1" color="textSecondary" align="center" paragraph>
          Effective as of: {new Date().toLocaleDateString()}
        </Typography>

        <Divider sx={{ my: 3 }} />

        <SectionContent>
          Welcome to Dott, a service provided by Dott LLC. This Terms of Use Agreement
          ("Agreement") governs your use of the Dott website, mobile applications, and all related services
          offered by Dott LLC. By accessing or using our service, you acknowledge that you have read,
          understood, and agree to be bound by these terms.
        </SectionContent>

        <SectionTitle>1. Acceptance of Terms</SectionTitle>
        <SectionContent>
          By registering for and/or using Dott in any manner, including but not limited to visiting or
          browsing the website or downloading the application, you agree to be bound by this Agreement,
          all applicable laws and regulations, and agree that you are responsible for compliance with
          any applicable local laws. If you do not agree with any of these terms, you are prohibited from
          using or accessing Dott. The materials contained in Dott are protected by applicable copyright
          and trademark law.
        </SectionContent>

        <SectionTitle>2. Description of Service</SectionTitle>
        <SectionContent>
          Dott is a comprehensive financial management platform that provides businesses with tools for
          accounting, payroll, payment processing, invoicing, and financial insights. Our services include
          subscription-based access to our software, payment processing capabilities, payroll services,
          and invoice factoring in select regions. The specific features available to you may depend on your
          subscription level, geographical location, and applicable laws and regulations.
        </SectionContent>

        <SectionTitle>3. User Accounts</SectionTitle>
        <SectionContent>
          To access most features of Dott, you must register for an account. You agree to provide accurate,
          current, and complete information during the registration process and to update such information
          to keep it accurate, current, and complete. You are responsible for safeguarding your password
          and for all activities that occur under your account. You agree to notify Dott LLC immediately of
          any unauthorized use of your account. Dott LLC cannot and will not be liable for any loss or damage
          arising from your failure to comply with the above requirements.
        </SectionContent>

        <SectionTitle>4. Subscription and Payments</SectionTitle>
        <SectionContent>
          Dott offers various subscription plans and payment services. By subscribing to our services,
          you agree to pay the applicable fees as they become due. Subscription fees are billed in advance on a
          monthly or annual basis depending on your selected billing cycle. When you register for a paid service,
          you must provide accurate and complete information for a valid payment method that you are authorized to use.
        </SectionContent>
        
        <SubsectionTitle>4.1 Recurring Billing</SubsectionTitle>
        <SectionContent>
          By subscribing to Dott services, you authorize us to charge the payment method you provide to us on a 
          recurring basis. If we are unable to charge your payment method for any reason, we reserve the right to 
          terminate or suspend your access to the paid services.
        </SectionContent>
        
        <SubsectionTitle>4.2 Payment Processing</SubsectionTitle>
        <SectionContent>
          Dott uses third-party payment processors including Stripe, Flutterwave, DLocal, Wise, PayPal, and others 
          to process transactions. Your use of these payment services is subject to the applicable 
          payment processor's terms of service and privacy policy. Dott charges a transaction fee for payment 
          processing services as outlined in our pricing page.
        </SectionContent>
        
        <SubsectionTitle>4.3 Refunds</SubsectionTitle>
        <SectionContent>
          All fees are non-refundable unless otherwise specified or required by applicable law. If you believe 
          you've been charged in error, please contact our customer support team.
        </SectionContent>

        <SectionTitle>5. User Conduct</SectionTitle>
        <SectionContent>
          You agree to use Dott only for lawful purposes and in accordance with this Agreement. You agree not to use Dott:
        </SectionContent>
        <Box component="ul" sx={{ pl: 4 }}>
          <Box component="li">
            <Typography variant="body1" paragraph>
              In any way that violates any applicable federal, state, local, or international law or regulation.
            </Typography>
          </Box>
          <Box component="li">
            <Typography variant="body1" paragraph>
              To transmit any material that is unlawful, threatening, abusive, libelous, defamatory, obscene, or otherwise objectionable.
            </Typography>
          </Box>
          <Box component="li">
            <Typography variant="body1" paragraph>
              To impersonate or attempt to impersonate Dott LLC, a Dott LLC employee, another user, or any other person or entity.
            </Typography>
          </Box>
          <Box component="li">
            <Typography variant="body1" paragraph>
              To engage in any activity that interferes with or disrupts the services (or the servers and networks connected to the services).
            </Typography>
          </Box>
          <Box component="li">
            <Typography variant="body1" paragraph>
              To attempt to circumvent any security measures implemented by Dott LLC.
            </Typography>
          </Box>
          <Box component="li">
            <Typography variant="body1" paragraph>
              For money laundering, terrorist financing, or any other illegal financial activities.
            </Typography>
          </Box>
        </Box>

        <SectionTitle>6. Payment and Financial Services</SectionTitle>
        <SectionContent>
          Dott enables users to process payments, manage payroll, and access financial services through various third-party 
          providers. When using these services, you agree to comply with all applicable laws and regulations, including 
          those related to financial transactions, anti-money laundering requirements, and data privacy.
        </SectionContent>
        
        <SubsectionTitle>6.1 Payment Processing</SubsectionTitle>
        <SectionContent>
          Use of our payment processing features is subject to the terms of service of our payment partners. You are responsible 
          for ensuring all payment information provided is accurate and that you are authorized to use the payment methods you provide.
        </SectionContent>
        
        <SubsectionTitle>6.2 Invoice Factoring</SubsectionTitle>
        <SectionContent>
          Where available, Dott offers invoice factoring services subject to additional terms and eligibility requirements. These services 
          are currently only available in the United States and Canada. By using our invoice factoring services, you authorize Dott LLC to 
          verify your business information, credit history, and other relevant details.
        </SectionContent>
        
        <SubsectionTitle>6.3 International Transactions</SubsectionTitle>
        <SectionContent>
          For international transactions, you acknowledge that currency conversion rates and additional fees may apply. Dott LLC is not 
          responsible for any fees charged by your financial institution or any third-party payment processors.
        </SectionContent>

        <SectionTitle>7. Data and Content</SectionTitle>
        <SectionContent>
          You retain all rights to your data uploaded to Dott. By using our services, you grant Dott LLC a non-exclusive, worldwide, 
          royalty-free license to use, process, and display your data solely for the purpose of providing and improving our services. 
          We will maintain appropriate administrative, physical, and technical safeguards to protect your data.
        </SectionContent>
        
        <SubsectionTitle>7.1 Data Processing</SubsectionTitle>
        <SectionContent>
          As part of providing our services, Dott processes financial and personal data in accordance with our Privacy Policy. 
          You acknowledge that Dott may use third-party service providers to process data on our behalf.
        </SectionContent>
        
        <SubsectionTitle>7.2 Data Security</SubsectionTitle>
        <SectionContent>
          You are responsible for maintaining the confidentiality of your account information and for restricting access to your 
          computer or device. You agree to accept responsibility for all activities that occur under your account.
        </SectionContent>

        <SectionTitle>8. Intellectual Property</SectionTitle>
        <SectionContent>
          All content and functionality on Dott, including but not limited to text, graphics, logos, icons, images, audio clips, 
          digital downloads, data compilations, and software, is the property of Dott LLC or its licensors and is protected by 
          United States and international copyright, trademark, patent, trade secret, and other intellectual property or proprietary 
          rights laws. The compilation of all content and any software or other materials on Dott are the exclusive property of Dott LLC 
          and protected by U.S. and international copyright laws.
        </SectionContent>

        <SectionTitle>9. Privacy</SectionTitle>
        <SectionContent>
          Your privacy is important to us. Our Privacy Policy, which is incorporated into this Agreement by reference, 
          explains how we collect, use, and disclose information about you. By using Dott, you consent to the collection 
          and use of information as described in our Privacy Policy.
        </SectionContent>

        <SectionTitle>10. Third-Party Links and Services</SectionTitle>
        <SectionContent>
          Dott may contain links to third-party websites or services that are not owned or controlled by Dott LLC. 
          Dott LLC has no control over, and assumes no responsibility for, the content, privacy policies, or practices 
          of any third-party websites or services. You acknowledge and agree that Dott LLC shall not be responsible or 
          liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection with the 
          use of or reliance on any such content, goods, or services available on or through any such websites or services.
        </SectionContent>

        <SectionTitle>11. Disclaimer of Warranties</SectionTitle>
        <SectionContent>
          DOTT IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE 
          FULLEST EXTENT PERMISSIBLE PURSUANT TO APPLICABLE LAW, DOTT LLC DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, 
          INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND 
          NON-INFRINGEMENT. DOTT LLC DOES NOT WARRANT THAT THE FUNCTIONS CONTAINED IN DOTT WILL BE UNINTERRUPTED OR ERROR-FREE, 
          THAT DEFECTS WILL BE CORRECTED, OR THAT DOTT OR THE SERVER THAT MAKES IT AVAILABLE ARE FREE OF VIRUSES OR OTHER 
          HARMFUL COMPONENTS.
        </SectionContent>

        <SectionTitle>12. Limitation of Liability</SectionTitle>
        <SectionContent>
          TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL DOTT LLC, ITS AFFILIATES, OFFICERS, DIRECTORS, 
          EMPLOYEES, AGENTS, SUPPLIERS OR LICENSORS BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL, PUNITIVE, EXEMPLARY OR 
          CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF USE, DATA, BUSINESS, OR PROFITS) ARISING OUT OF OR IN CONNECTION WITH THIS 
          AGREEMENT, WHETHER BASED ON BREACH OF CONTRACT, TORT (INCLUDING NEGLIGENCE), PRODUCT LIABILITY OR OTHERWISE, EVEN IF 
          DOTT LLC OR ITS REPRESENTATIVES HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES AND EVEN IF A REMEDY SET FORTH 
          HEREIN IS FOUND TO HAVE FAILED OF ITS ESSENTIAL PURPOSE.
        </SectionContent>
        
        <SubsectionTitle>12.1 Limitation of Total Liability</SubsectionTitle>
        <SectionContent>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, DOTT LLC'S TOTAL LIABILITY TO YOU FOR ANY DAMAGES (REGARDLESS OF 
          THE FOUNDATION FOR THE ACTION) SHALL NOT EXCEED THE AMOUNT YOU HAVE PAID DOTT LLC IN THE PRIOR 12 MONTHS.
        </SectionContent>

        <SectionTitle>13. Indemnification</SectionTitle>
        <SectionContent>
          You agree to indemnify, defend and hold harmless Dott LLC, its affiliates, officers, directors, employees, agents and 
          third parties, for any losses, costs, liabilities and expenses (including reasonable attorney's fees) relating to or 
          arising out of your use of Dott, including but not limited to any breach by you of the terms of this Agreement or 
          violation of any law, regulation, or third-party rights.
        </SectionContent>

        <SectionTitle>14. Termination</SectionTitle>
        <SectionContent>
          Dott LLC reserves the right to terminate or suspend your account and access to Dott immediately, without prior notice or 
          liability, for any reason whatsoever, including, without limitation, if you breach this Agreement. Upon termination, 
          your right to use Dott will immediately cease. All provisions of this Agreement which by their nature should survive 
          termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, 
          and limitations of liability.
        </SectionContent>
        
        <SubsectionTitle>14.1 Data After Termination</SubsectionTitle>
        <SectionContent>
          Upon termination, you may request a copy of your data within 30 days. After this period, we may delete your data 
          in accordance with our data retention policies and applicable laws.
        </SectionContent>

        <SectionTitle>15. Governing Law</SectionTitle>
        <SectionContent>
          This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without 
          regard to its conflict of law provisions. You agree to submit to the personal and exclusive jurisdiction of the 
          courts located within Delaware for the resolution of any disputes.
        </SectionContent>

        <SectionTitle>16. Compliance with Laws</SectionTitle>
        <SectionContent>
          You agree to comply with all applicable domestic and international laws, statutes, ordinances, and regulations regarding 
          your use of Dott and any financial transactions conducted through it. Dott LLC reserves the right to investigate and take 
          appropriate legal action against anyone who, in Dott LLC's sole discretion, violates this provision.
        </SectionContent>

        <SectionTitle>17. Changes to Agreement</SectionTitle>
        <SectionContent>
          We reserve the right, at our sole discretion, to modify or replace this Agreement at any time. If a revision is material, 
          we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be 
          determined at our sole discretion. By continuing to access or use Dott after those revisions become effective, you agree 
          to be bound by the revised Agreement.
        </SectionContent>

        <SectionTitle>18. Entire Agreement</SectionTitle>
        <SectionContent>
          This Agreement, together with our Privacy Policy and any other legal notices and agreements published by Dott LLC, shall 
          constitute the entire agreement between you and Dott LLC concerning Dott.
        </SectionContent>

        <SectionTitle>19. Severability</SectionTitle>
        <SectionContent>
          If any provision of this Agreement is found to be unenforceable or invalid, that provision will be limited or eliminated 
          to the minimum extent necessary so that this Agreement will otherwise remain in full force and effect and enforceable.
        </SectionContent>

        <SectionTitle>20. Contact Information</SectionTitle>
        <SectionContent>
          If you have any questions about this Agreement, please contact us at:
        </SectionContent>
        <Box sx={{ pl: 2, borderLeft: `4px solid ${theme.palette.primary.main}`, mt: 2 }}>
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            Dott LLC
            <br />
            800 N King Street
            Suite 304 #2797
            Wilmington, DE 19801
            United States

            <br />
            Email: support@dottapps.com
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default TermsOfUse;