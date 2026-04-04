import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { absenceService } from '../services/absence.service';
import { useAuth } from '../context/AuthContext';
import Card from '../components/UI/Card';
import StatusBadge from '../components/UI/StatusBadge';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const EMPTY_REVIEW = { status: '', reviewNotes: '', rejectionReason: '' };

const ReviewQueue = () => {
  const { isHealthOfficer, isAdmin } = useAuth();
  const [selected,    setSelected]   = useState(null);
  const [reviewData,  setReviewData] = useState(EMPTY_REVIEW);
  const queryClient = useQueryClient();

  // ── Fetch pending queue ────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ['review-queue'],
    queryFn:  () => absenceService.getAll({ status: 'submitted', limit: 50 })
                      .then(r => r.data.data.docs),
    refetchInterval: 60_000 // auto-refresh every minute
  });

  // ── Reset review form whenever the selected request changes ───────────────
  useEffect(() => {
    setReviewData(EMPTY_REVIEW);
  }, [selected?._id]);

  // ── Submit review mutation ─────────────────────────────────────────────────
  const reviewMutation = useMutation({
    mutationFn: ({ id, payload }) => absenceService.review(id, payload),
    onSuccess: (_, { payload }) => {
      const label = payload.status === 'approved' ? 'approved'
                  : payload.status === 'rejected' ? 'rejected'
                  : 'marked for further review';
      toast.success(`Request ${label} successfully.`);
      queryClient.invalidateQueries(['review-queue']);
      queryClient.invalidateQueries(['dashboard']);
      setSelected(null);
      setReviewData(EMPTY_REVIEW);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Review submission failed.');
    }
  });

  // ── Role guard ─────────────────────────────────────────────────────────────
  // Students and professors hitting /review directly get redirected home.
  if (!isHealthOfficer && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleReview = () => {
    if (!reviewData.status) {
      return toast.error('Please select a decision (Approve, Reject, or Further Review).');
    }
    if (reviewData.status === 'rejected' && !reviewData.rejectionReason.trim()) {
      return toast.error('A rejection reason is required when rejecting a request.');
    }
    reviewMutation.mutate({ id: selected._id, payload: reviewData });
  };

  if (isLoading) return <LoadingSpinner label="Loading review queue..." />;
  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Failed to load queue. Please refresh.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Review Queue</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {data?.length || 0} submission(s) pending review
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Queue list ──────────────────────────────────────────────────── */}
        <div className="space-y-3">
          {data?.length === 0 && (
            <Card>
              <p className="text-center text-gray-400 dark:text-gray-500 py-8">
                All caught up — no pending submissions.
              </p>
            </Card>
          )}
          {data?.map(req => (
            <button
              key={req._id}
              onClick={() => setSelected(req)}
              className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-150 ${
                selected?._id === req._id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-transparent bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {req.student?.firstName} {req.student?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">{req.requestId}</p>
                </div>
                <StatusBadge status={req.status} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {format(new Date(req.absenceDateStart), 'MMM d')} –{' '}
                {format(new Date(req.absenceDateEnd), 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {req.affectedCourses?.length} course(s) affected
              </p>
              {/* Flag if no document was uploaded */}
              {!req.medicalDocument && (
                <p className="text-xs text-red-500 mt-1 font-medium">No document uploaded</p>
              )}
            </button>
          ))}
        </div>

        {/* ── Review panel ────────────────────────────────────────────────── */}
        {selected ? (
          <Card>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              Review:{' '}
              <span className="font-mono text-blue-600 dark:text-blue-400">
                {selected.requestId}
              </span>
            </h2>

            {/* Request details */}
            <div className="space-y-3 mb-6">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Student</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selected.student?.firstName} {selected.student?.lastName}
                  <span className="text-gray-400 ml-2 text-xs font-mono">
                    {selected.student?.studentId}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {selected.student?.email}
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Absence Period</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {format(new Date(selected.absenceDateStart), 'MMMM d')} –{' '}
                  {format(new Date(selected.absenceDateEnd), 'MMMM d, yyyy')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
                  Reason: {selected.reason?.replace(/_/g, ' ')}
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Affected Courses</p>
                <div className="space-y-1">
                  {selected.affectedCourses?.map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-mono font-semibold">{c.courseCode}</span>{' '}
                        — {c.courseName}
                      </p>
                      {c.noticeSent && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          Notice sent
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Medical document — view button for staff */}
              {selected.medicalDocument ? (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                        Medical Document Uploaded
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {selected.medicalDocument.originalName} —{' '}
                        {(selected.medicalDocument.fileSize / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <a
                      href={absenceService.getDocumentUrl(selected._id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 underline ml-4 flex-shrink-0"
                    >
                      View Document
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                    No medical document uploaded
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Consider marking for further review or contacting the student.
                  </p>
                </div>
              )}
            </div>

            {/* Decision buttons */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Decision
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'approved',     label: 'Approve',      active: 'border-green-500 bg-green-500 text-white',  inactive: 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300' },
                    { value: 'under_review', label: 'Further Review', active: 'border-yellow-500 bg-yellow-500 text-white', inactive: 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300' },
                    { value: 'rejected',     label: 'Reject',       active: 'border-red-500 bg-red-500 text-white',      inactive: 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setReviewData(p => ({ ...p, status: opt.value }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                        reviewData.status === opt.value ? opt.active : opt.inactive
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="reviewNotes"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Internal Notes
                  <span className="text-xs font-normal text-gray-400 ml-1">(not visible to student)</span>
                </label>
                <textarea
                  id="reviewNotes" rows={3}
                  value={reviewData.reviewNotes}
                  onChange={e => setReviewData(p => ({ ...p, reviewNotes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notes visible only to Health Services staff..."
                  maxLength={1000}
                />
              </div>

              {reviewData.status === 'rejected' && (
                <div>
                  <label
                    htmlFor="rejectionReason"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Rejection Reason
                    <span className="text-red-500 ml-1">*</span>
                    <span className="text-xs font-normal text-gray-400 ml-1">(sent to student by email)</span>
                  </label>
                  <textarea
                    id="rejectionReason" rows={3}
                    value={reviewData.rejectionReason}
                    onChange={e => setReviewData(p => ({ ...p, rejectionReason: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Document appears to be expired. Please resubmit with a valid certificate."
                    maxLength={500}
                  />
                </div>
              )}

              <button
                onClick={handleReview}
                disabled={reviewMutation.isPending || !reviewData.status}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
              >
                {reviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </Card>
        ) : (
          /* Placeholder when nothing is selected */
          <div className="hidden lg:flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm">
            Select a request to review
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewQueue;