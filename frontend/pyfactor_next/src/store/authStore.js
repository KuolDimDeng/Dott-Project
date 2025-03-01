import { create } from 'zustand';

const useAuthStore = create((set) => ({
  isAuthenticated: false,
  user: null,
  signOut: () => set({ isAuthenticated: false, user: null }),
  setUser: (user) => set({ isAuthenticated: true, user }),
}));

export default useAuthStore;