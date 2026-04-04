import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { absenceService } from '../services/absence.service';
import StatusBadge from '../components/UI/StatusBadge';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { format, differenceInCalendarDays } from 'date-fns';

// ── Filter tabs matching actual backend status values ─────────────────────────
const FILTERS = [
  { label: 'All',          value: 'all' },
  { label: 'Draft',        value: 'draft' },
  { label: 'Submitted',    value: 'submitted' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Approved',     value: 'approved' },
  { label: 'Rejected',     value: 'rejected' },
];

const MyRequests = () => {
  const { user, isStudent } = useAuth();
  const [filter, setFilter] = useState('all');

  // ── Fetch via React Query ─────────────────────────────────────────────────
  // getAll() is already role-scoped in the backend:
  //   student → own requests only
  //   health_officer / admin → all requests
  // No need for a separate /my-requests endpoint.
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['absences', filter, user?._id],
    queryFn:  () => absenceService
      .getAll({ ...(filter !== 'all' && { status: filter }), limit: 50 })
      .then(r => r.data.data.docs),
    staleTime: 30_000
  });

  const pageTitle  = isStudent ? 'My Requests' : 'All Requests';
  const emptyLabel = isStudent
    ? "You haven't submitted any requests yet."
    : 'No requests found for this filter.';

  if (isLoading) return <LoadingSpinner label="Loading requests..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {data?.length ?? 0} request(s)
          </p>
        </div>
        {isStudent && (
          <Link
            to="/requests/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
          >
            + New Request
          </Link>
        )}
      </div>

      {/* ── Status filter tabs ───────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Error state ──────────────────────────────────────────────────── */}
      {isError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center justify-between">
          <span className="text-sm">Failed to load requests.</span>
          <button
            onClick={refetch}
            className="text-sm font-medium underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Request list ─────────────────────────────────────────────────── */}
      {!isError && (
        <>
          {(!data || data.length === 0) ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">{emptyLabel}</p>
              {isStudent && (
                <Link
                  to="/requests/new"
                  className="mt-4 inline-block text-sm text-blue-600 hover:underline"
                >
                  Submit your first request
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {data.map(request => {
                const days = differenceInCalendarDays(
                  new Date(request.absenceDateEnd),
                  new Date(request.absenceDateStart)
                ) + 1;

                return (
                  <Link
                    key={request._id}
                    to={`/requests/${request._id}`}
                    className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        {/* Show student name for staff; show request ID for students */}
                        {isStudent ? (
                          <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                            {request.requestId}
                          </p>
                        ) : (
                          <>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">
                              {request.student?.firstName} {request.student?.lastName}
                            </p>
                            <p className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {request.requestId}
                            </p>
                          </>
                        )}

                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {format(new Date(request.absenceDateStart), 'MMM d, yyyy')} –{' '}
                          {format(new Date(request.absenceDateEnd), 'MMM d, yyyy')}
                          <span className="text-gray-400 ml-2">
                            ({days} day{days !== 1 ? 's' : ''})
                          </span>
                        </p>

                        {/* Affected courses summary */}
                        {request.affectedCourses?.length > 0 && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {request.affectedCourses.map(c => c.courseCode).join(', ')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Flag draft requests with a nudge */}
                        {request.status === 'draft' && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            Not submitted
                          </span>
                        )}
                        <StatusBadge status={request.status} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyRequests;