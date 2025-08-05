'use client';

import React, { useState } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { 
  UserGroupIcon,
  EnvelopeIcon,
  ShareIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  GiftIcon,
  ChartBarIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';

const InviteFriend = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [invites, setInvites] = useState([]);
  
  const referralLink = `https://dottapps.com/signup?ref=${Math.random().toString(36).substr(2, 9)}`;

  const handleInvite = async (e) => {
    e.preventDefault();
    setSending(true);
    
    try {
      await axiosInstance.post('/api/invitations/send', {
        email,
        message
      });
      
      setSent(true);
      setInvites([...invites, { email, date: new Date().toISOString(), status: 'sent' }]);
      setEmail('');
      setMessage('');
      
      setTimeout(() => setSent(false), 3000);
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Failed to send invitation. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const benefits = [
    {
      icon: <GiftIcon className="h-6 w-6 text-blue-600" />,
      title: "Get 1 Month Free",
      description: "For each friend who signs up"
    },
    {
      icon: <ChartBarIcon className="h-6 w-6 text-green-600" />,
      title: "Help Them Grow",
      description: "Share the tools that help your business"
    },
    {
      icon: <UserGroupIcon className="h-6 w-6 text-purple-600" />,
      title: "Build Your Network",
      description: "Connect with other business owners"
    }
  ];

  const stats = {
    totalInvites: invites.length,
    acceptedInvites: 0,
    monthsEarned: 0
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Invite Business Owners</h1>
        <p className="text-gray-600">Share Dott with other business owners and earn rewards</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Referral Stats */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Referral Stats</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Total Invites Sent</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalInvites}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Friends Joined</p>
                <p className="text-2xl font-bold text-green-600">{stats.acceptedInvites}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Free Months Earned</p>
                <p className="text-2xl font-bold text-blue-600">{stats.monthsEarned}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invitation Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Send an Invitation</h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Friend's Email
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="friend@example.com"
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hey! I've been using Dott to manage my business and thought you'd love it too..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <button
                type="submit"
                disabled={sending}
                className={`w-full flex justify-center items-center px-4 py-2 rounded-md font-medium ${
                  sent 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {sending ? (
                  'Sending...'
                ) : sent ? (
                  <>
                    <CheckIcon className="h-5 w-5 mr-2" />
                    Invitation Sent!
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="h-5 w-5 mr-2" />
                    Send Invitation
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Or share your referral link</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm"
                />
                <button
                  onClick={copyReferralLink}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    copied 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckIcon className="h-4 w-4 inline mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="h-4 w-4 inline mr-1" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Why Invite Friends?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center">
              <div className="flex justify-center mb-3">{benefit.icon}</div>
              <h3 className="font-medium text-gray-900 mb-1">{benefit.title}</h3>
              <p className="text-sm text-gray-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Invitations */}
      {invites.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Invitations</h2>
          <div className="space-y-2">
            {invites.map((invite, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{invite.email}</p>
                  <p className="text-xs text-gray-500">
                    Sent {new Date(invite.date).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm text-gray-600 capitalize">{invite.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Buttons */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600 mb-4">Share on social media</p>
        <div className="flex justify-center space-x-4">
          <button className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700">
            <ShareIcon className="h-5 w-5" />
          </button>
          <button className="p-2 bg-blue-400 text-white rounded-full hover:bg-blue-500">
            <ShareIcon className="h-5 w-5" />
          </button>
          <button className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700">
            <ShareIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteFriend;
