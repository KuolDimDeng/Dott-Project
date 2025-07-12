'use client';

import React, { useState, useEffect } from 'react';
import { useSessionContext } from '@/providers/SessionProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import { Settings, Save } from 'lucide-react';
import StandardSpinner from '@/components/StandardSpinner';

const TimesheetSettingsPage = () => {
  const { tenantId } = useSessionContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    approval_frequency: 'WEEKLY',
    input_frequency: 'DAILY',
    allow_overtime: true,
    overtime_rate: 1.5,
    require_manager_approval: true,
    default_pto_days_per_year: 10,
    default_sick_days_per_year: 5,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hr/timesheet-settings/', {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setSettings(data.results[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load timesheet settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = settings.id ? 'PATCH' : 'POST';
      const url = settings.id 
        ? `/api/hr/timesheet-settings/${settings.id}/`
        : '/api/hr/timesheet-settings/';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({
          ...settings,
          business_id: tenantId,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Timesheet settings saved successfully',
        });
        fetchSettings();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <StandardSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">Timesheet Settings</h1>
          <p className="text-gray-500">Configure timesheet approval and overtime settings</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Approval Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Settings</CardTitle>
            <CardDescription>
              Configure how timesheets are approved
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Approval Frequency</Label>
              <Select 
                value={settings.approval_frequency} 
                onValueChange={(value) => setSettings({ ...settings, approval_frequency: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="BIWEEKLY">Bi-Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                How often supervisors need to approve timesheets
              </p>
            </div>

            <div>
              <Label>Time Entry Frequency</Label>
              <Select 
                value={settings.input_frequency} 
                onValueChange={(value) => setSettings({ ...settings, input_frequency: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                How often employees can enter their time
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Require Manager Approval</Label>
                <p className="text-sm text-gray-500">
                  Timesheets must be approved by supervisor
                </p>
              </div>
              <Switch
                checked={settings.require_manager_approval}
                onCheckedChange={(checked) => setSettings({ ...settings, require_manager_approval: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Overtime Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Overtime Settings</CardTitle>
            <CardDescription>
              Configure overtime calculations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Overtime</Label>
                <p className="text-sm text-gray-500">
                  Employees can log overtime hours
                </p>
              </div>
              <Switch
                checked={settings.allow_overtime}
                onCheckedChange={(checked) => setSettings({ ...settings, allow_overtime: checked })}
              />
            </div>

            {settings.allow_overtime && (
              <div>
                <Label>Overtime Rate Multiplier</Label>
                <Input
                  type="number"
                  min="1"
                  max="3"
                  step="0.1"
                  value={settings.overtime_rate}
                  onChange={(e) => setSettings({ ...settings, overtime_rate: parseFloat(e.target.value) })}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Overtime hours will be paid at {settings.overtime_rate}x the regular rate
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PTO Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Time Off Settings</CardTitle>
            <CardDescription>
              Default time off allowances for new employees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default PTO Days per Year</Label>
              <Input
                type="number"
                min="0"
                max="365"
                value={settings.default_pto_days_per_year}
                onChange={(e) => setSettings({ ...settings, default_pto_days_per_year: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <Label>Default Sick Days per Year</Label>
              <Input
                type="number"
                min="0"
                max="365"
                value={settings.default_sick_days_per_year}
                onChange={(e) => setSettings({ ...settings, default_sick_days_per_year: parseInt(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TimesheetSettingsPage;