'use client';

import Image from 'next/image';
import { Box, Button, Stack } from '@mui/material';
import AuthButton from '@/components/AuthButton';
import { useRouter } from 'next/navigation';

export default function AppBar() {
  const router = useRouter();

  return (
    <Box
      component="nav"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 2, sm: 4 },
        py: 1,
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => router.push('/')}
      >
        <Image
          src="/static/images/Pyfactor.png"
          alt="Pyfactor Logo"
          width={140}
          height={100}
          priority
        />
      </Box>

      {/* Navigation Links */}
      <Stack
        direction="row"
        spacing={2}
        sx={{
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          mx: 4,
        }}
      >
        <Button
          color="inherit"
          onClick={() => router.push('/#about')}
        >
          About
        </Button>
        <Button
          color="inherit"
          onClick={() => router.push('/#features')}
        >
          Features
        </Button>
        <Button
          color="inherit"
          onClick={() => router.push('/#pricing')}
        >
          Pricing
        </Button>
        <Button
          color="inherit"
          onClick={() => router.push('/#contact')}
        >
          Contact
        </Button>
      </Stack>

      {/* Auth Button */}
      <AuthButton />
    </Box>
  );
}
