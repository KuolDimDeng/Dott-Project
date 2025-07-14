'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession-v2';
import { useRouter, useSearchParams } from 'next/navigation';
import EmployeeInfo from './components/EmployeeInfo';
import TimesheetTab from './components/TimesheetTab';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { session, loading } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [employee, setEmployee] = useState(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);

  // Handle tab parameter from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !session) {
      router.push('/auth/signin');
    }
  }, [session, loading, router]);

  // Load employee data
  useEffect(() => {
    if (session?.employee?.id && session?.tenantId) {
      loadEmployeeData();
    }
  }, [session]);

  const loadEmployeeData = async () => {
    setLoadingEmployee(true);
    try {
      const response = await fetch(`/api/hr/employees/${session.employee.id}/`, {
        headers: {
          'X-Tenant-ID': session.tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployee(data);
      } else {
        toast.error('Failed to load employee information');
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
      toast.error('Error loading employee information');
    } finally {
      setLoadingEmployee(false);
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    const email = session?.user?.email || session?.employee?.email;
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };

  if (loading || loadingEmployee) {
    return (
      <div className="container mx-auto p-4 max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect
  }

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="timesheet">Timesheet</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-4">
          {/* User Profile Card */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>User Profile</CardTitle>
                <CardDescription>
                  Your account information
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-medium">Email</Label>
                <p className="text-sm">{session?.user?.email || session?.employee?.email || 'Not available'}</p>
              </div>
              
              <div>
                <Label className="font-medium">Name</Label>
                <p className="text-sm">
                  {session?.user?.name || 
                   (session?.employee?.first_name && session?.employee?.last_name 
                     ? `${session.employee.first_name} ${session.employee.last_name}` 
                     : 'Not available')}
                </p>
              </div>
              
              <div>
                <Label className="font-medium">User Role</Label>
                <p className="text-sm capitalize">{session?.user?.role || 'Employee'}</p>
              </div>
              
              <div>
                <Label className="font-medium">Account Status</Label>
                <p className="text-sm capitalize">Active</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="employment">
          <EmployeeInfo employee={employee} />
        </TabsContent>
        
        <TabsContent value="timesheet">
          <TimesheetTab employee={employee} session={session} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 