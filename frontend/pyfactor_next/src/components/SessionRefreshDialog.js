'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/auth';
import { useRefreshSession } from '@/utils/refreshUserSession';
import { useToast } from '@/components/Toast/ToastProvider';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';

export function SessionRefreshDialog({ open, onClose, onComplete }) {
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const refreshSession = useRefreshSession(auth);
  const toast = useToast();

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      const result = await refreshSession();
      setEmail(result.email);
      toast.info(result.message);
    } catch (error) {
      toast.error('Failed to prepare session refresh');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await auth.signIn({ username: email, password });
      toast.success('Session refreshed successfully');
      if (onComplete) {
        await onComplete();
      }
      onClose();
    } catch (error) {
      toast.error('Failed to sign in');
    } finally {
      setIsLoading(false);
      setPassword('');
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Session Refresh Required</DialogTitle>
      <DialogContent>
        <DialogContentText>
          To update your profile, you need to refresh your session. This will require signing in again.
        </DialogContentText>
        {email ? (
          <TextField
            autoFocus
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        {email ? (
          <Button onClick={handleSignIn} disabled={isLoading || !password}>
            Sign In
          </Button>
        ) : (
          <Button onClick={handleRefresh} disabled={isLoading}>
            Continue
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}