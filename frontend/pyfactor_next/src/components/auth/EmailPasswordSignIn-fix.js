// Add this import at the top of EmailPasswordSignIn.js
import api from '@/utils/apiFetch';

// Replace the fetch call in handleSignIn function (around line 348):
// OLD:
// const loginResponse = await fetch('/api/auth/consolidated-login', {

// NEW:
const loginResponse = await api.post('/api/auth/consolidated-login', {
  email,
  password
}, {
  signal: controller.signal
}).finally(() => {
  clearTimeout(timeoutId);
});
