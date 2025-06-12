'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, CheckCircle, Calendar, DollarSign, Users, TrendingUp, Edit, Trash2, Plus } from 'lucide-react';

interface PaymentPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  features: string[];
  isActive: boolean;
  subscriberCount: number;
  revenue: number;
  createdDate: string;
  lastModified: string;
  trialDays?: number;
  setupFee?: number;
}

const PaymentPlans: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockData: PaymentPlan[] = [
        {
          id: '1',
          name: 'Basic Plan',
          description: 'Perfect for small businesses just getting started',
          price: 29,
          billingCycle: 'monthly',
          features: [
            'Up to 100 invoices/month',
            'Basic reporting',
            'Email support',
            'Single user'
          ],
          isActive: true,
          subscriberCount: 245,
          revenue: 7105,
          createdDate: '2023-01-15',
          lastModified: '2023-12-10',
          trialDays: 14
        },
        {
          id: '2',
          name: 'Professional Plan',
          description: 'For growing businesses that need more features',
          price: 79,
          billingCycle: 'monthly',
          features: [
            'Unlimited invoices',
            'Advanced reporting',
            'Priority email support',
            'Up to 5 users',
            'API access',
            'Custom branding'
          ],
          isActive: true,
          subscriberCount: 156,
          revenue: 12324,
          createdDate: '2023-01-15',
          lastModified: '2024-01-05',
          trialDays: 14,
          setupFee: 99
        },
        {
          id: '3',
          name: 'Enterprise Plan',
          description: 'Full-featured solution for large organizations',
          price: 299,
          billingCycle: 'monthly',
          features: [
            'Everything in Professional',
            'Unlimited users',
            'Dedicated account manager',
            '24/7 phone support',
            'Custom integrations',
            'SLA guarantee',
            'Advanced security features'
          ],
          isActive: true,
          subscriberCount: 42,
          revenue: 12558,
          createdDate: '2023-03-01',
          lastModified: '2023-11-20',
          setupFee: 499
        },
        {
          id: '4',
          name: 'Annual Professional',
          description: 'Professional plan with annual billing discount',
          price: 790,
          billingCycle: 'yearly',
          features: [
            'All Professional features',
            '2 months free',
            'Annual billing discount'
          ],
          isActive: true,
          subscriberCount: 89,
          revenue: 70310,
          createdDate: '2023-06-01',
          lastModified: '2023-06-01'
        },
        {
          id: '5',
          name: 'Legacy Starter',
          description: 'Discontinued starter plan',
          price: 19,
          billingCycle: 'monthly',
          features: [
            'Up to 50 invoices/month',
            'Basic features only'
          ],
          isActive: false,
          subscriberCount: 12,
          revenue: 228,
          createdDate: '2023-01-01',
          lastModified: '2023-06-30'
        }
      ];
      
      setPlans(mockData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch payment plans');
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const getBillingCycleBadge = (cycle: string) => {
    const colors = {
      monthly: 'bg-blue-100 text-blue-800',
      quarterly: 'bg-purple-100 text-purple-800',
      yearly: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[cycle as keyof typeof colors]}`}>
        {cycle}
      </span>
    );
  };

  const calculateMonthlyRevenue = (plan: PaymentPlan) => {
    let monthlyAmount = plan.price;
    if (plan.billingCycle === 'quarterly') monthlyAmount = plan.price / 3;
    if (plan.billingCycle === 'yearly') monthlyAmount = plan.price / 12;
    return monthlyAmount * plan.subscriberCount;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const activePlans = plans.filter(p => p.isActive);
  const totalSubscribers = plans.reduce((sum, p) => sum + p.subscriberCount, 0);
  const totalMonthlyRevenue = plans.reduce((sum, p) => sum + calculateMonthlyRevenue(p), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Plans</h1>
        <p className="text-gray-600">Create and manage subscription plans</p>
      </div>

      {/* Debug Info */}
      {user && (
        <div className="mb-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-600">
          <p>Tenant ID: {user.tenantId}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Plans</p>
              <p className="text-2xl font-bold text-gray-900">{activePlans.length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Subscribers</p>
              <p className="text-2xl font-bold text-gray-900">{totalSubscribers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${totalMonthlyRevenue.toFixed(0)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg. Revenue/Plan</p>
              <p className="text-2xl font-bold text-gray-900">
                ${activePlans.length > 0 ? (totalMonthlyRevenue / activePlans.length).toFixed(0) : '0'}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Create Plan Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Plan
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-lg shadow-sm border ${
              plan.isActive ? 'border-gray-200' : 'border-gray-300 opacity-75'
            } p-6 relative`}
          >
            {!plan.isActive && (
              <div className="absolute top-4 right-4">
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                  Inactive
                </span>
              </div>
            )}
            
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">{plan.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
            </div>

            <div className="mb-4">
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-gray-600 ml-1">/{plan.billingCycle}</span>
              </div>
              <div className="mt-2 space-y-1">
                {plan.trialDays && (
                  <p className="text-sm text-green-600">{plan.trialDays}-day free trial</p>
                )}
                {plan.setupFee && (
                  <p className="text-sm text-gray-600">${plan.setupFee} setup fee</p>
                )}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Features:</p>
              <ul className="space-y-1">
                {plan.features.slice(0, 4).map((feature, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
                {plan.features.length > 4 && (
                  <li className="text-sm text-gray-500 ml-6">
                    +{plan.features.length - 4} more features
                  </li>
                )}
              </ul>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-1" />
                  {plan.subscriberCount} subscribers
                </div>
                {getBillingCycleBadge(plan.billingCycle)}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  ${calculateMonthlyRevenue(plan).toFixed(0)}/mo
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingPlan(plan)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="text-red-600 hover:text-red-800">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPlan) && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingPlan ? 'Edit Plan' : 'Create New Plan'}
            </h3>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingPlan?.name}
                    placeholder="e.g., Professional Plan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Cycle
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingPlan?.billingCycle || 'monthly'}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  defaultValue={editingPlan?.description}
                  placeholder="Brief description of the plan"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingPlan?.price}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Setup Fee (optional)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingPlan?.setupFee}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trial Days (optional)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingPlan?.trialDays}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Features (one per line)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={5}
                  defaultValue={editingPlan?.features.join('\n')}
                  placeholder="Unlimited invoices&#10;Priority support&#10;API access"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  defaultChecked={editingPlan?.isActive ?? true}
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  Plan is active
                </label>
              </div>
            </form>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPlan(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPlan(null);
                  fetchPlans();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingPlan ? 'Save Changes' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPlans;