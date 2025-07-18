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
import { useTranslation } from 'react-i18next';

export default function ProfilePage() {
  const { t } = useTranslation('profile');
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
        toast.error(t('errors.loadEmployeeFailed'));
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
      toast.error(t('errors.loadEmployeeError'));
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
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {t('tabs.profile')}
          </TabsTrigger>
          <TabsTrigger value="pay" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('tabs.pay')}
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('tabs.documents')}
          </TabsTrigger>
          <TabsTrigger value="timesheet" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('tabs.timesheet')}
          </TabsTrigger>
          <TabsTrigger value="legal" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            {t('tabs.legal')}
          </TabsTrigger>
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
                <CardTitle>{t('userProfile.title')}</CardTitle>
                <CardDescription>
                  {t('userProfile.subtitle')}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-medium">{t('userProfile.email')}</Label>
                <p className="text-sm">{session?.user?.email || session?.employee?.email || t('userProfile.notAvailable')}</p>
              </div>
              
              <div>
                <Label className="font-medium">{t('userProfile.name')}</Label>
                <p className="text-sm">
                  {session?.user?.name || 
                   (session?.employee?.first_name && session?.employee?.last_name 
                     ? `${session.employee.first_name} ${session.employee.last_name}` 
                     : t('userProfile.notAvailable'))}
                </p>
              </div>
              
              <div>
                <Label className="font-medium">{t('userProfile.role')}</Label>
                <p className="text-sm capitalize">{session?.user?.role || t('userProfile.defaultRole')}</p>
              </div>
              
              <div>
                <Label className="font-medium">{t('userProfile.accountStatus')}</Label>
                <p className="text-sm capitalize">{t('userProfile.statusActive')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pay">
          <EmployeeInfo employee={employee} />
        </TabsContent>
        
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>{t('documents.title')}</CardTitle>
              <CardDescription>
                {t('documents.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">{t('documents.noDocuments')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timesheet">
          <TimesheetTab employee={employee} session={session} />
        </TabsContent>
        
        <TabsContent value="legal">
          <Card>
            <CardHeader>
              <CardTitle>{t('legal.title')}</CardTitle>
              <CardDescription>
                {t('legal.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">{t('legal.noInformation')}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 