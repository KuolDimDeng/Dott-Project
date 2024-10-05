'use client';

///Users/kuoldeng/projectx/frontend/pyfactor_next/pages/onboardingStep1.jsx
import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { TextField, Select, MenuItem, FormControl, InputLabel, Typography, Button, Container, Grid, Paper, Box } from '@mui/material';
import Image from 'next/image';



// Import country list (you'll need to provide this)
import { countries, defaultCountry } from '@/app/countryList/page';

const businessTypes = [
    "Accounting and Bookkeeping",
    "Administration and Office Services",
    "Adventure Tourism and Tour Guides",
    "Advertising and Marketing",
    "Agribusiness and Agricultural Consulting",
    "Agricultural Machinery",
    "Agriculture and Farming",
    "Air Conditioning and HVAC Services",
    "AI, Machine Learning, and Data Science Services",
    "Animal and Pet Services",
    "Apparel and Clothing",
    "Architecture and Design",
    "Arts and Crafts",
    "Automotive, Leasing, and Repair",
    "Babysitting and Childcare Services",
    "Banking and Finance",
    "Barbershops, Hair Salons, and Beauty Services",
    "Beverage and Food Services",
    "Biotechnology and Pharmaceuticals",
    "Blockchain, Cryptocurrencies, and Exchanges",
    "Broadcasting, Media, and Video Streaming",
    "Business Consulting and Advisory Services",
    "Catering and Food Trucks",
    "Cleaning Services",
    "Cloud Computing and IT Services",
    "Construction and Contracting",
    "Craft Beverages (Breweries, Distilleries)",
    "Creative Services (Design, Graphic Design)",
    "Cultural Heritage and Preservation",
    "Cybersecurity and Risk Management",
    "Data Analysis and Business Intelligence",
    "Dairy and Livestock Farming",
    "Digital Marketing and Online Services",
    "DJ, Music, and Entertainment Services",
    "Distribution, Freight Forwarding, and Logistics",
    "Drone and Aerial Services",
    "E-commerce and Retail",
    "Education and Tutoring",
    "Electronics and IT Equipment",
    "Energy Auditing and Sustainability Consulting",
    "Engineering and Technical Services",
    "Event Planning, Rentals, and Technology",
    "Export and Import Trade",
    "Fashion and Apparel",
    "Film, Television, and Media Production",
    "Financial Planning and Investment Services",
    "Fishing and Aquaculture",
    "Fitness and Personal Training",
    "Floristry and Gardening",
    "Forestry and Natural Resource Management",
    "Franchising and Licensing",
    "Freelance Platforms and Gig Economy",
    "Fundraising and Non-Profit Services",
    "Furniture and Home Decor",
    "Green Building, Renewable Energy, and Solar",
    "Healthcare and Medical Services",
    "Home Improvement and Renovation",
    "Hospitality, Hotels, and Vacation Rentals",
    "Human Resources and Recruitment",
    "Hydroelectric and Wind Energy",
    "Industrial Services and Manufacturing",
    "Insurance and Risk Management",
    "Interior Design and Architecture",
    "International Trade and Export",
    "IT Consulting and Services",
    "Jewelry and Watchmaking",
    "Journalism and Reporting",
    "Landscaping and Lawn Care",
    "Law and Legal Services",
    "Leisure, Recreation, and Sports",
    "Logistics and Supply Chain Management",
    "Manufacturing and Production",
    "Media and Entertainment",
    "Medical Equipment and Devices",
    "Microfinance and Small Business Lending",
    "Mining and Resource Extraction",
    "Mobile Services and Telecommunications",
    "Music Production and DJ Services",
    "Natural Resource Extraction and Mining",
    "Non-Profit and Charitable Organizations",
    "Oil, Gas, and Petroleum Refining",
    "On-Demand and Gig Economy (Uber, Lyft)",
    "Packaging and Distribution Services",
    "Personal Services (Babysitting, Caregiving)",
    "Petroleum, Gas, and Energy Services",
    "Photography and Videography",
    "Printing, Publishing, and Copy Services",
    "Private Investigation and Security Services",
    "Property Development and Management",
    "Public Relations and Communications",
    "Public Sector and Government Services",
    "Public Transportation and Taxi Services",
    "Real Estate and Property Management",
    "Renewable Energy and Green Tech",
    "Research and Development (R&D)",
    "Restaurants, Cafes, and Food Services",
    "Retail and Consumer Goods",
    "Security and Alarm Services",
    "Shipping, Maritime, and Port Services",
    "Software Development and IT Services",
    "Solar Energy and Installation",
    "Sports Coaching and Training",
    "Street Vendors and Micro-Enterprises",
    "Sustainability Consulting and Green Energy",
    "Telecommunications and Mobile Services",
    "Textile Manufacturing and Apparel",
    "Tourism, Travel Agencies, and Adventure Travel",
    "Transportation, Trucking, and Freight",
    "Utilities and Public Services",
    "Vehicle Rental and Leasing",
    "Veterinary and Pet Services",
    "Virtual Assistant and Administrative Services",
    "Waste Management and Recycling",
    "Web Development and Design Services",
    "Wellness and Spa Services",
    "Wholesale and Distribution",
    "Writing, Editing, and Content Creation",
    "Youth Services and Education",
    "Zoological Services, Botanical Gardens, and Consultancy"
  ];
  

const legalStructures = [
  "Sole Proprietorship",
  "General Partnership (GP)",
  "Limited Partnership (LP)",
  "Limited Liability Company (LLC)",
  "Corporation (Inc., Corp.)",
  "Non-Profit Organization (NPO)",
  "Joint Venture (JV)",
  "Holding Company",
  "Branch Office",
  "Representative Office",
];

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
});

const OnboardingStep1 = ({ nextStep }) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    businessName: '',
    industry: '',
    country: defaultCountry,
    legalStructure: '',
    dateFounded: '',
  });

  // Combine the logic for redirecting based on user and loading state
  useEffect(() => {
    console.log('OnboardingStep1 - session:', session, 'status:', status);
    if (status === 'unauthenticated') {
      console.log('User not authenticated, redirecting to login');
      router.push('/login');
    } else if (status === 'authenticated' && session.user.isOnboarded) {
      console.log('User is onboarded, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [session, status, router]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log('Form submitted:', formData);
    nextStep();
  };

  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') return null;


  return (
    <ThemeProvider theme={theme}>
      <Grid container component="main" sx={{ height: '100vh' }}>
        {/* Left side - Onboarding Form */}
        <Grid item xs={12} sm={8} md={6} component={Paper} elevation={6} square>
          <Box
            sx={{
              my: 8,
              mx: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Image
                src="/static/images/Pyfactor.png"
                alt="Pyfactor Logo"
                width={150}
                height={50}
                priority
              />
            </Box>
            <Typography variant="h6" color="primary" gutterBottom >
              STEP 1 OF 2
            </Typography>
            <Typography component="h2" variant="h5" gutterBottom>
              Welcome to Dott!
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="What's your business name?"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    required
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth required variant="outlined">
                    <InputLabel>Select your industry</InputLabel>
                    <Select
                      name="industry"
                      value={formData.industry}
                      onChange={handleChange}
                      label="Select your industry"
                    >
                      {businessTypes.map((type) => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth required variant="outlined">
                    <InputLabel>Where is your business located?</InputLabel>
                    <Select
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      label="Where is your business located?"
                    >
                      {countries.map((country) => (
                        <MenuItem key={country.code} value={country.code}>
                          {country.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth required variant="outlined">
                    <InputLabel>What is the legal structure of your business?</InputLabel>
                    <Select
                      name="legalStructure"
                      value={formData.legalStructure}
                      onChange={handleChange}
                      label="What is the legal structure of your business?"
                    >
                      {legalStructures.map((structure) => (
                        <MenuItem key={structure} value={structure}>{structure}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="When was your business founded?"
                    name="dateFounded"
                    type="date"
                    value={formData.dateFounded}
                    onChange={handleChange}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    inputProps={{
                      max: new Date().toISOString().split('T')[0], // Sets max date to today
                    }}
                    required
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button type="submit" variant="contained" color="primary" fullWidth size="large">
                    Next
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Grid>

        {/* Right side - Image and Text */}
        <Grid
          item
          xs={false}
          sm={4}
          md={6}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#e3f2fd', // Light blue background
            p: 4, // Add padding to the container
          }}
        >
          <Box
            sx={{
              width: '100%',
              mb: 4, // Margin bottom to separate text from image
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: "bold", color: 'black', mb: 2 }}>
              Start Your Business Journey
            </Typography>

            <ul style={{ listStyleType: 'none', padding: 0, color: "black"}}>
              <li>✅ <strong>Easy setup</strong> - Get started in minutes.</li>
              <li>✅ <strong>Tailored solutions</strong> - Customized for your business needs.</li>
              <li>✅ <strong>Expert support</strong> - We're here to help you succeed.</li>
            </ul>
          </Box>
          <Box
            sx={{
              width: '80%',
              height: '50%', // Reduced height to accommodate the text
              position: 'relative',
            }}
          >
            <Image
              src="/static/images/Office-Working-1--Streamline-Brooklyn.png"
              alt="Product Launch Illustration"
              width={350}
              height={350}
              priority
            />
          </Box>
        </Grid>
      </Grid>
    </ThemeProvider>
  );
};

export default OnboardingStep1;