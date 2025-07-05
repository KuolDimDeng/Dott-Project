'use client';


import React from 'react';
import { useSessionContext } from '@/providers/SessionProvider';
import EmployeeInfo from './components/EmployeeInfo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function ProfilePage() {
  const { user } = useSessionContext();

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.attributes?.email) return 'U';
    return user.attributes.email.charAt(0).toUpperCase();
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      
      {/* User Profile Card */}
      <Card className="mb-6">
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
            <p className="text-sm">{user?.attributes?.email || 'Not available'}</p>
          </div>
          
          <div>
            <Label className="font-medium">User Role</Label>
            <p className="text-sm capitalize">{user?.attributes?.['custom:userrole'] || 'Standard'}</p>
          </div>
          
          <div>
            <Label className="font-medium">Account Status</Label>
            <p className="text-sm capitalize">{user?.attributes?.['custom:acctstatus']?.toLowerCase() || 'Active'}</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Employee Information Card */}
      <EmployeeInfo />
      
      {/* Additional Profile Sections Could Go Here */}
    </div>
  );
} 