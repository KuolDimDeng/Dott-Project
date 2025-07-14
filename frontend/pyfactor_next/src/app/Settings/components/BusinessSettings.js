import React, { useState, useEffect } from 'react';
import { Button, TextField, Switch } from '@/components/ui/TailwindComponents';
import { useSession } from '@/hooks/useSession-v2';
import { getWhatsAppBusinessVisibility } from '@/utils/whatsappCountryDetection';

const BusinessSettings = ({ selectedTab }) => {
  const { user } = useSession();
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappFeatures, setWhatsappFeatures] = useState(null);

  useEffect(() => {
    // Get user's country and WhatsApp features
    const userCountry = user?.country || 'US';
    const features = getWhatsAppBusinessVisibility(userCountry);
    setWhatsappFeatures(features);

    // Check if WhatsApp Business is enabled
    try {
      const enabled = localStorage.getItem('whatsapp_business_enabled') === 'true';
      setWhatsappEnabled(enabled);
    } catch (error) {
      console.error('Error checking WhatsApp Business settings:', error);
    }
  }, [user]);

  const handleWhatsAppToggle = async (enabled) => {
    try {
      setWhatsappEnabled(enabled);
      localStorage.setItem('whatsapp_business_enabled', enabled.toString());
      
      // Call API to update backend settings
      await fetch('/api/proxy/whatsapp-business/settings/toggle-whatsapp-business/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });
      
      // Force reload to update menu
      window.location.reload();
    } catch (error) {
      console.error('Error updating WhatsApp Business settings:', error);
    }
  };

  const renderContent = () => {
    switch (selectedTab) {
      case 0:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Team Members</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-base">Kuol Deng (You)</span>
                    <span className="text-sm text-blue-600 dark:text-blue-400">Owner</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <div className="mt-4">
                  <Button variant="primary">
                    Invite Team Member
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Invoices and Estimates</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Invoice Settings</h3>
              <div className="space-y-6">
                <div>
                  <TextField
                    fullWidth
                    label="Invoice Prefix"
                    defaultValue="INV-"
                  />
                </div>
                <div>
                  <TextField
                    fullWidth
                    label="Invoice Footer Text"
                    multiline
                    rows={3}
                    defaultValue="Thank you for your business!"
                  />
                </div>
                <div>
                  <Switch
                    label="Automatically send payment reminders"
                    defaultChecked
                  />
                </div>
                <div>
                  <Button variant="primary">
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Payments</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Payment Methods</h3>
              <div className="space-y-4">
                <div>
                  <Switch
                    label="Credit Card"
                    defaultChecked
                  />
                </div>
                <div>
                  <Switch
                    label="Bank Transfer"
                    defaultChecked
                  />
                </div>
                <div>
                  <Switch
                    label="Mobile Money"
                    defaultChecked
                  />
                </div>
                <div className="mt-6">
                  <Button variant="primary">
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Email Templates</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Customize Email Templates</h3>
              <div className="space-y-8">
                <div>
                  <h4 className="text-base font-medium mb-3">Invoice Email</h4>
                  <TextField
                    fullWidth
                    label="Subject"
                    defaultValue="Invoice #{invoice_number} from {business_name}"
                    className="mb-4"
                  />
                  <TextField
                    fullWidth
                    label="Body"
                    multiline
                    rows={5}
                    defaultValue="Dear {client_name},\n\nPlease find attached invoice #{invoice_number} for {amount}.\n\nThanks for your business!\n{business_name}"
                  />
                </div>
                <div>
                  <h4 className="text-base font-medium mb-3">Payment Reminder Email</h4>
                  <TextField
                    fullWidth
                    label="Subject"
                    defaultValue="Payment Reminder: Invoice #{invoice_number}"
                    className="mb-4"
                  />
                  <TextField
                    fullWidth
                    label="Body"
                    multiline
                    rows={5}
                    defaultValue="Dear {client_name},\n\nThis is a friendly reminder that invoice #{invoice_number} for {amount} is due on {due_date}.\n\nThanks,\n{business_name}"
                  />
                </div>
                <div>
                  <Button variant="primary">
                    Save Templates
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Custom Charge Settings</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Custom Charges</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-base font-medium mb-2">Discounts</h4>
                  <Switch
                    label="Enable Discounts"
                    defaultChecked
                  />
                </div>
                <div>
                  <h4 className="text-base font-medium mb-2">Late Fees</h4>
                  <Switch
                    label="Enable Late Fees"
                    defaultChecked
                  />
                  <div className="mt-4">
                    <TextField
                      fullWidth
                      label="Default Late Fee Percentage"
                      defaultValue="5"
                      endAdornment={<span>%</span>}
                    />
                  </div>
                </div>
                <div>
                  <h4 className="text-base font-medium mb-2">Shipping</h4>
                  <Switch
                    label="Enable Shipping Charges"
                    defaultChecked
                  />
                </div>
                <div className="mt-2">
                  <Button variant="primary">
                    Save Settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">WhatsApp Business</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">WhatsApp Business Settings</h3>
              
              {whatsappFeatures && (
                <div className="mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Available in Your Country ({user?.country || 'Unknown'})
                    </h4>
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p><strong>Default Visibility:</strong> {whatsappFeatures.showInMenu ? 'Shown in menu' : 'Hidden by default'}</p>
                      <p><strong>Payment Method:</strong> {whatsappFeatures.payment.localPayment || 'Credit Cards'}</p>
                      <p><strong>Currency:</strong> {whatsappFeatures.payment.currency}</p>
                      <p><strong>Reason:</strong> {whatsappFeatures.reason}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-base font-medium">Enable WhatsApp Business</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Show WhatsApp Business in your main menu and enable WhatsApp commerce features
                      </p>
                    </div>
                    <Switch
                      checked={whatsappEnabled}
                      onChange={handleWhatsAppToggle}
                      label=""
                    />
                  </div>
                </div>

                {whatsappEnabled && (
                  <div className="border-t pt-6">
                    <h4 className="text-base font-medium mb-4">WhatsApp Business Features</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Catalog Management</span>
                        <span className="text-sm text-green-600">✓ Available</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Order Processing</span>
                        <span className="text-sm text-green-600">✓ Available</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Payment Processing</span>
                        <span className="text-sm text-green-600">✓ Available</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Customer Support</span>
                        <span className="text-sm text-green-600">✓ Available</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Analytics & Reporting</span>
                        <span className="text-sm text-green-600">✓ Available</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t pt-6">
                  <h4 className="text-base font-medium mb-4">Getting Started</h4>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>1. Enable WhatsApp Business using the toggle above</p>
                    <p>2. Navigate to WhatsApp Business from the main menu</p>
                    <p>3. Set up your business profile and catalog</p>
                    <p>4. Start sharing your catalog with customers</p>
                    <p>5. Process orders and payments through WhatsApp</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return <div className="w-full">{renderContent()}</div>;
};

export default BusinessSettings;
