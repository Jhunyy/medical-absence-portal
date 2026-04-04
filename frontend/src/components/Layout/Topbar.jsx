import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bars3Icon, BellIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../services/api';
 
const Topbar = ({ onMenuClick }) => {
  const { logout }              = useAuth();
  const { darkMode, toggleDark } = useTheme();
  const queryClient             = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const bellRef = useRef(null);
 
  // ── Fetch notifications ─────────────────────────────────────────────────
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => api.get('/notifications').then(r => r.data.data),
    refetchInterval: 30_000
  });
 
  const unreadCount = notifications.filter(n => !n.read).length;
 
  // ── Mark all as read ────────────────────────────────────────────────────
  const markRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess:  () => queryClient.invalidateQueries(['notifications'])
  });
 
  // ── Close dropdown on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
 
  const handleBellClick = () => {
    setNotifOpen(prev => !prev);
    if (!notifOpen && unreadCount > 0) markRead.mutate();
  };
 
  // ── Logout: AuthContext.logout() already navigates — don't double-call ──
  const handleLogout = () => logout();
 
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      {/* Mobile hamburger */}
      <button
        className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
      >
        <Bars3Icon className="h-6 w-6" />
      </button>
 
      {/* Desktop subtitle */}
      <div className="hidden lg:block">
        <h2 className="text-sm text-gray-500 dark:text-gray-400">
          Medical Absence &amp; Document Verification Portal
        </h2>
      </div>
 
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={toggleDark}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
        </button>
 
        {/* Notifications bell + dropdown */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={handleBellClick}
            className="relative p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
            aria-expanded={notifOpen}
            aria-haspopup="true"
          >
            <BellIcon className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
 
          {/* Dropdown panel */}
          {notifOpen && (
            <div className="absolute right-0 mt-1 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800 dark:text-white">Notifications</p>
                {unreadCount > 0 && (
                  <span className="text-xs text-blue-600 dark:text-blue-400">{unreadCount} unread</span>
                )}
              </div>
 
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                    No notifications yet
                  </p>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n._id}
                      className={`px-4 py-3 text-sm ${
                        !n.read
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <p className="text-gray-800 dark:text-gray-200 font-medium leading-snug">
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 leading-snug">
                          {n.message}
                        </p>
                      )}
                      {n.createdAt && (
                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                          {format(new Date(n.createdAt), 'MMM d · h:mm a')}
                        </p>
                      )}
                      {n.requestId && (
                        <Link
                          to={`/requests/${n.requestId}`}
                          onClick={() => setNotifOpen(false)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                        >
                          View request →
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
 
        {/* Logout */}
        <button
          onClick={handleLogout}
          className="text-sm px-3 py-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
};
 
export default Topbar;