'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CameraIcon,
  UserGroupIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  DocumentDuplicateIcon,
  BanknotesIcon,
  CalculatorIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

export default function MorePage() {
  const router = useRouter();

  const menuItems = [
    {
      section: 'Work Management',
      items: [
        {
          title: 'Jobs',
          description: 'Manage field work',
          icon: ClipboardDocumentCheckIcon,
          href: '/dashboard/jobs/mobile',
          color: 'text-blue-600'
        },
        {
          title: 'Timesheets',
          description: 'Clock in/out & hours',
          icon: CameraIcon,
          href: '/mobile/timesheet',
          color: 'text-indigo-600'
        },
        {
          title: 'Pay Stubs',
          description: 'View & download',
          icon: BanknotesIcon,
          href: '/mobile/paystubs',
          color: 'text-emerald-600'
        }
      ]
    },
    {
      section: 'Business',
      items: [
        {
          title: 'Dashboard',
          description: 'View metrics',
          icon: ChartBarIcon,
          href: '/dashboard',
          color: 'text-orange-600'
        },
        {
          title: 'Customers',
          description: 'Manage contacts',
          icon: UserGroupIcon,
          href: '/dashboard/customers',
          color: 'text-purple-600'
        },
        {
          title: 'Invoices',
          description: 'Create & manage',
          icon: DocumentTextIcon,
          href: '/invoices',
          color: 'text-blue-600'
        },
        {
          title: 'Estimates',
          description: 'Quotes & proposals',
          icon: DocumentDuplicateIcon,
          href: '/estimates',
          color: 'text-cyan-600'
        }
      ]
    },
    {
      section: 'Settings',
      items: [
        {
          title: 'My Profile',
          description: 'Personal information',
          icon: UserCircleIcon,
          href: '/settings/profile',
          color: 'text-gray-600'
        },
        {
          title: 'Business Settings',
          description: 'Company information',
          icon: BuildingOfficeIcon,
          href: '/settings',
          color: 'text-gray-600'
        },
        {
          title: 'Notifications',
          description: 'Alerts & preferences',
          icon: BellIcon,
          href: '/dashboard/notifications',
          color: 'text-gray-600'
        },
        {
          title: 'Help & Support',
          description: 'Get assistance',
          icon: QuestionMarkCircleIcon,
          href: '/support',
          color: 'text-gray-600'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/mobile')}
                className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">More Options</h1>
            </div>
            <button
              onClick={() => router.push('/auth/signout')}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowRightOnRectangleIcon className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="pb-20">
        {menuItems.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            <h2 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
              {section.section}
            </h2>
            <div className="bg-white">
              {section.items.map((item, itemIndex) => (
                <Link
                  key={itemIndex}
                  href={item.href}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-gray-50 ${item.color}`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="grid grid-cols-5 py-2">
          <button 
            onClick={() => router.push('/mobile')}
            className="flex flex-col items-center py-2 text-gray-600 hover:text-blue-600"
          >
            <ChartBarIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button 
            onClick={() => router.push('/dashboard/jobs/mobile')}
            className="flex flex-col items-center py-2 text-gray-600 hover:text-blue-600"
          >
            <ClipboardDocumentCheckIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Jobs</span>
          </button>
          <button 
            onClick={() => router.push('/pos')}
            className="flex flex-col items-center py-2 text-gray-600 hover:text-blue-600"
          >
            <CurrencyDollarIcon className="w-6 h-6" />
            <span className="text-xs mt-1">POS</span>
          </button>
          <button
            onClick={() => router.push('/inventory/scan')}
            className="flex flex-col items-center py-2 text-gray-600 hover:text-blue-600"
          >
            <CameraIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Scan</span>
          </button>
          <button className="flex flex-col items-center py-2 text-blue-600">
            <UserGroupIcon className="w-6 h-6" />
            <span className="text-xs mt-1">More</span>
          </button>
        </div>
      </div>
    </div>
  );
}