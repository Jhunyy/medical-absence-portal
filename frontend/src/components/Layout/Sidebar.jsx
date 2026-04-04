import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HomeIcon, DocumentPlusIcon, ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon, Cog6ToothIcon, XMarkIcon
} from '@heroicons/react/24/outline';

const navItems = {
  student: [
    { to: '/dashboard', icon: HomeIcon, label: 'Dashboard' },
    { to: '/submit',    icon: DocumentPlusIcon, label: 'Submit Request' },
    { to: '/requests',  icon: ClipboardDocumentListIcon, label: 'My Requests' }
  ],
  health_officer: [
    { to: '/dashboard', icon: HomeIcon, label: 'Dashboard' },
    { to: '/review',    icon: ClipboardDocumentCheckIcon, label: 'Review Queue' },
    { to: '/requests',  icon: ClipboardDocumentListIcon, label: 'All Requests' }
  ],
  professor: [
    { to: '/dashboard', icon: HomeIcon, label: 'Dashboard' },
    { to: '/requests',  icon: ClipboardDocumentListIcon, label: 'Notices' }
  ],
  admin: [
    { to: '/dashboard', icon: HomeIcon, label: 'Dashboard' },
    { to: '/requests',  icon: ClipboardDocumentListIcon, label: 'All Requests' },
    { to: '/review',    icon: ClipboardDocumentCheckIcon, label: 'Review Queue' },
    { to: '/admin',     icon: Cog6ToothIcon, label: 'Admin Panel' }
  ]
};

const Sidebar = ({ open, onClose }) => {
  const { user } = useAuth();
  const items = navItems[user?.role] || [];

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 w-64
          transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          flex flex-col
        `}
        aria-label="Sidebar navigation"
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h1 className="text-lg font-bold text-blue-700 dark:text-blue-400">MedAbsence</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">University Health Portal</p>
          </div>
          <button
            className="lg:hidden p-1 rounded-md text-gray-500 hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
          {items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;