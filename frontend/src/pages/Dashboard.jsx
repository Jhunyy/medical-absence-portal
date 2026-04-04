import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { absenceService } from '../services/absence.service';
import { useAuth } from '../context/AuthContext';
import Card from '../components/UI/Card';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import StatusBadge from '../components/UI/StatusBadge';
import { Link } from 'react-router-dom';

const COLORS = ['#16a34a', '#dc2626', '#f59e0b', '#1a56db', '#8b5cf6'];

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, colorClass, icon }) => (
  <Card className="flex items-center gap-4">
    <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${colorClass}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? 0}</p>
    </div>
  </Card>
);

// ── Empty chart placeholder ───────────────────────────────────────────────────
const EmptyChart = () => (
  <div className="flex items-center justify-center h-[220px] text-gray-400 dark:text-gray-500 text-sm">
    No data available yet
  </div>
);

const Dashboard = () => {
  const { user, isStudent, isHealthOfficer, isAdmin } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', user?._id],
    queryFn:  () => absenceService.getDashboard().then(r => r.data.data),
    staleTime: 60_000, // 1 minute
  });

  if (isLoading) return <LoadingSpinner label="Loading dashboard..." />;
  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Failed to load dashboard. Please refresh.</p>
      </div>
    );
  }

  const pieData = [
    { name: 'Approved',     value: data?.approved     || 0 },
    { name: 'Rejected',     value: data?.rejected     || 0 },
    { name: 'Pending',      value: data?.pending      || 0 },
    { name: 'Under Review', value: data?.underReview  || 0 },
    { name: 'Draft',        value: data?.draft        || 0 },
  ].filter(d => d.value > 0);

  const monthlyData = (data?.monthlyTrend ?? []).map(m => ({
    month:    `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
    requests: m.count
  }));

  // Student sees a submit shortcut; staff sees queue management link
  const ctaContent = isStudent
    ? { label: 'Submit New Request', to: '/requests/new' }
    : { label: 'Review Queue', to: '/review' };

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome, {user?.firstName}!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Link
          to={ctaContent.to}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {ctaContent.label}
        </Link>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Requests"
          value={data?.total}
          icon="📋"
          colorClass="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          label="Approved"
          value={data?.approved}
          icon="✅"
          colorClass="bg-green-100 dark:bg-green-900/30"
        />
        <StatCard
          label={isStudent ? 'Pending Review' : 'Awaiting Review'}
          value={data?.pending}
          icon="⏳"
          colorClass="bg-yellow-100 dark:bg-yellow-900/30"
        />
        <StatCard
          label="Rejected"
          value={data?.rejected}
          icon="❌"
          colorClass="bg-red-100 dark:bg-red-900/30"
        />
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4">
            Monthly Submissions
          </h2>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="requests" fill="#1a56db" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4">
            Request Status Breakdown
          </h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Card>
      </div>

      {/* ── Recent Activity ──────────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">Recent Activity</h2>
          <Link to="/requests" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table" aria-label="Recent absence requests">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                <th className="pb-3 font-medium" scope="col">Request ID</th>
                {/* Show student name column only for staff */}
                {!isStudent && (
                  <th className="pb-3 font-medium hidden md:table-cell" scope="col">Student</th>
                )}
                <th className="pb-3 font-medium hidden lg:table-cell" scope="col">Date</th>
                <th className="pb-3 font-medium" scope="col">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {(data?.recentRequests ?? []).map(req => (
                <tr
                  key={req._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="py-3">
                    <Link
                      to={`/requests/${req._id}`}
                      className="text-blue-600 hover:underline font-mono text-xs"
                    >
                      {req.requestId}
                    </Link>
                  </td>
                  {!isStudent && (
                    <td className="py-3 hidden md:table-cell text-gray-600 dark:text-gray-300">
                      {req.student?.firstName} {req.student?.lastName}
                    </td>
                  )}
                  <td className="py-3 hidden lg:table-cell text-gray-500 dark:text-gray-400">
                    {format(new Date(req.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={req.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!(data?.recentRequests?.length) && (
            <p className="text-center py-8 text-gray-400 dark:text-gray-500">
              {isStudent
                ? 'You haven\'t submitted any requests yet.'
                : 'No recent requests.'}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;