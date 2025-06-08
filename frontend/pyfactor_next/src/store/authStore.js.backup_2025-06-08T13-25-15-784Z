import { create } from 'zustand';

// Create the auth store
const useAuthStore = create((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  signOut: () => set({ isAuthenticated: false, user: null, token: null }),
  setUser: (user) => set({ isAuthenticated: true, user }),
  setToken: (token) => set({ token }),
}));

// Export as both named export for backward compatibility
export const useStore = useAuthStore;

// Export as default
export default useAuthStore;