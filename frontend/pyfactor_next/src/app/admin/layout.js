import { Inter } from "next/font/google";
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Dott Admin Portal",
  description: "Admin portal for Dott platform management",
};

// Admin layout without the main app's authentication wrapper
export default function AdminLayout({ children }) {
  return (
    <div className={inter.className}>
      <Toaster position="top-right" />
      {children}
    </div>
  );
}