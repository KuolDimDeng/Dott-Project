// src/components/AdminRoute.jsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '../dashboard/components/components/axiosConfig';

const AdminRoute = (WrappedComponent) => {
  return (props) => {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
      const checkAdminStatus = async () => {
        try {
          const response = await axiosInstance.get('/api/user/is-admin/');
          setIsAdmin(response.data.is_admin);
          if (!response.data.is_admin) {
            router.push('/dashboard');
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          router.push('/dashboard');
        }
      };

      checkAdminStatus();
    }, [router]);

    if (!isAdmin) {
      return null; // or a loading spinner
    }

    return <WrappedComponent {...props} />;
  };
};

export default AdminRoute;