import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';

const items = [
  {
    icon: <ReceiptLongIcon fontSize="large" />,
    title: 'Invoice Management',
    description: 'Easily create, customize, and send professional invoices. Automate reminders for unpaid invoices, track payments, and stay organized effortlessly.',
  },
  {
    icon: <PaymentsIcon fontSize="large" />,
    title: 'Payments',
    description: 'Accept payments with ease, whether it\'s through traditional payment methods like cards or mobile money platforms. Our seamless payment integration speeds up transactions, helping you get paid faster.',
  },
  {
    icon: <PhoneAndroidIcon fontSize="large" />,
    title: 'Mobile Money Integration',
    description: 'Take advantage of our mobile money support for instant, secure payments from platforms like MTN, Airtel, and others. Perfect for businesses operating in regions with a high reliance on mobile money services.',
  },
  {
    icon: <AccountBalanceWalletIcon fontSize="large" />,
    title: 'Accounting',
    description: 'Manage your finances in real time with Dott\'s comprehensive accounting features. Track income, expenses, and profitability all in one easy-to-use dashboard, helping you make informed business decisions.',
  },
  {
    icon: <MonetizationOnIcon fontSize="large" />,
    title: 'Payroll',
    description: 'Simplify payroll with automated calculations, tax compliance, and easy employee management. Whether you choose full-service or self-service payroll, Dott ensures your team gets paid on time, every time.',
  },
  {
    icon: <PeopleIcon fontSize="large" />,
    title: 'HR Management',
    description: 'Streamline your HR processes, from employee onboarding to performance management. Dott helps you manage your workforce more efficiently with integrated HR tools.',
  },
  {
    icon: <InventoryIcon fontSize="large" />,
    title: 'Inventory',
    description: 'Keep track of your stock in real time, whether you\'re managing physical products or digital services. Dott\'s inventory system is built to help you reduce waste and optimize your supply chain.',
  },
];

export default function Features() {
  return (
    <Box
      id="features"
      sx={{
        py: { xs: 8, sm: 16 },
        backgroundColor: 'background.paper',
      }}
    >
      <Container maxWidth="lg">
        <Typography
          component="h2"
          variant="h2"
          color="text.primary"
          sx={{ mb: 8, fontWeight: 700, textAlign: 'center' }}
        >
          Your All-in-One Solution for Business Management
        </Typography>
        <Grid container spacing={4}>
          {items.map(({ icon, title, description }, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card
                sx={{
                  p: 4,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 22px 40px 4px rgba(0, 0, 0, 0.1)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {React.cloneElement(icon, { sx: { fontSize: 40, color: 'primary.main', mr: 2 } })}
                  <Typography variant="h5" component="h3" sx={{ fontWeight: 600 }}>
                    {title}
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                  {description}
                </Typography>
                <Button variant="outlined" color="primary">
                  Learn More
                </Button>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}