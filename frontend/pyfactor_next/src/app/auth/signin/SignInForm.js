'use client';
import React, { useState } from 'react';
import { Controller } from 'react-hook-form';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff, Email as EmailIcon } from '@mui/icons-material';

const SignInForm = ({ control, errors, credentialsLoginMutation }) => {
  const [isPasswordShown, setIsPasswordShown] = useState(false);

  return (
    <>
      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            fullWidth
            label="Email Address"
            error={!!errors.email}
            helperText={errors.email?.message}
            disabled={credentialsLoginMutation.isPending}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
        )}
      />
      <Controller
        name="password"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            fullWidth
            label="Password"
            type={isPasswordShown ? 'text' : 'password'}
            error={!!errors.password}
            helperText={errors.password?.message}
            disabled={credentialsLoginMutation.isPending}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setIsPasswordShown(!isPasswordShown)} edge="end">
                    {isPasswordShown ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        )}
      />
    </>
  );
};

export default SignInForm;
