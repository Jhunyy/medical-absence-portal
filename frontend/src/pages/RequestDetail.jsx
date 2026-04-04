import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { absenceService } from '../services/absence.service';
import StatusBadge from '../components/UI/StatusBadge';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { format, differenceInCalendarDays } from 'date-fns';
import { ExcuseLetterButton } from '../components/UI/ExcuseLetterButton';
import toast from 'react-hot-toast';

export default function RequestDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user, isHealthOfficer, isAdmin, isStudent } = useAuth();

  const [request,  setRequest]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    status: '', reviewNotes: '', rejectionReason: ''
  });

  const canReview = (isHealthOfficer || isAdmin) && request?.status === 'submitted';
  const canDelete = isStudent && request?.status === 'draft';

  // ── Fetch request ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await absenceService.getById(id);
        setRequest(data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Request not found.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ── Submit review (health officer / admin) ────────────────────────────────
  // Calls PATCH /absences/:id/review — the only review endpoint that exists.
  const handleReview = async () => {
    if (!reviewForm.status) {
      return toast.error('Please select a decision.');
    }
    if (reviewForm.status === 'rejected' && !reviewForm.rejectionReason.trim()) {
      return toast.error('A rejection reason is required.');
    }
    setReviewing(true);
    try {
      const { data } = await absenceService.review(id, reviewForm);
      setRequest(data.data);
      toast.success(`Request ${reviewForm.status} successfully.`);
      setReviewForm({ status: '', reviewNotes: '', rejectionReason: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Review failed.');
    } finally {
      setReviewing(false);
    }
  };

  // ── Delete draft (student) ────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;
    try {
      await absenceService.delete(id);
      toast.success('Draft deleted.');
      navigate('/requests');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete.');
    }
  };

  if (loading) return <LoadingSpinner label="Loading request..." />;

  if (error) return (
    <div className="max-w-2xl mx-auto py-16 text-center">
      <p className="text-red-500 font-medium mb-4">{error}</p>
      <button
        onClick={() => navigate(-1)}
        className="text-blue-600 hover:underline text-sm"
      >
        ← Go back
      </button>
    </div>
  );

  const days = differenceInCalendarDays(
    new Date(request.absenceDateEnd),
    new Date(request.absenceDateStart)
  ) + 1;

  const reasonLabel = request.reason?.replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase()) || '—';

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Back + header ──────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate(-1)}
        className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1"
      >
        ← Back
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Request Detail</h1>
          <p className="font-mono text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {request.requestId}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {/* ── Main card ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">

        {/* Student info */}
        <Section title="Student Information">
          <Grid>
            <Field label="Name"       value={`${request.student?.firstName} ${request.student?.lastName}`} />
            <Field label="Student ID"  value={request.student?.studentId} />
            <Field label="Email"       value={request.student?.email} />
            <Field label="Department"  value={request.student?.department} />
          </Grid>
        </Section>

        {/* Absence details */}
        <Section title="Absence Details">
          <Grid>
            <Field label="Start Date"
              value={format(new Date(request.absenceDateStart), 'MMMM d, yyyy')} />
            <Field label="End Date"
              value={format(new Date(request.absenceDateEnd), 'MMMM d, yyyy')} />
            <Field label="Duration"    value={`${days} day${days !== 1 ? 's' : ''}`} />
            <Field label="Reason"      value={reasonLabel} />
          </Grid>
        </Section>

        {/* Affected courses */}
        <Section title="Affected Courses">
          <div className="space-y-2">
            {request.affectedCourses?.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <span className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-200">
                    {c.courseCode}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    {c.courseName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {c.noticeSent && (
                    <span className="text-green-600 dark:text-green-400">Notice sent</span>
                  )}
                  {c.acknowledged && (
                    <span className="text-blue-600 dark:text-blue-400">Acknowledged</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Medical document — staff only */}
        {(isHealthOfficer || isAdmin) && (
          <Section title="Medical Document">
            {request.medicalDocument ? (
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    {request.medicalDocument.originalName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {(request.medicalDocument.fileSize / 1024).toFixed(0)} KB ·{' '}
                    {format(new Date(request.medicalDocument.uploadedAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <a
                  href={absenceService.getDocumentUrl(request._id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 underline ml-4 flex-shrink-0"
                >
                  View
                </a>
              </div>
            ) : (
              <p className="text-sm text-red-500 dark:text-red-400">
                No document uploaded.
              </p>
            )}
          </Section>
        )}

        {/* Review result — shown after a decision is made */}
        {['approved', 'rejected', 'under_review'].includes(request.status) && (
          <Section title="Review Decision">
            <Grid>
              <Field
                label="Reviewed by"
                value={request.reviewedBy
                  ? `${request.reviewedBy.firstName} ${request.reviewedBy.lastName}`
                  : '—'}
              />
              <Field
                label="Reviewed on"
                value={request.reviewedAt
                  ? format(new Date(request.reviewedAt), 'MMM d, yyyy')
                  : '—'}
              />
            </Grid>
            {request.rejectionReason && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">
                  Rejection reason
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {request.rejectionReason}
                </p>
              </div>
            )}
          </Section>
        )}

        {/* QR code — shown to everyone once approved */}
        {request.status === 'approved' && request.qrCode?.imageData && (
          <Section title="Verification QR Code">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <img
                src={request.qrCode.imageData}
                alt="Absence verification QR code"
                className="w-32 h-32 rounded-lg border border-gray-200 dark:border-gray-700"
              />
              <div>
                 {request.status === 'approved' && (
                   <Section title="Documents">
                      <ExcuseLetterButton requestId={request._id} />
                    </Section>
                   )}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Professors can scan this code to verify your absence notice.
                  No medical details are revealed.
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-mono">
                  Code: {request.qrCode.code}
                </p>
                {request.qrCode.expiresAt && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Expires {format(new Date(request.qrCode.expiresAt), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* ── Health officer review form ──────────────────────────────────── */}
        {canReview && (
          <Section title="Submit Review">
            <div className="space-y-4">
              <div className="flex gap-2">
                {[
                  { value: 'approved',     label: 'Approve',        active: 'border-green-500 bg-green-500 text-white' },
                  { value: 'under_review', label: 'Further Review',  active: 'border-yellow-500 bg-yellow-500 text-white' },
                  { value: 'rejected',     label: 'Reject',          active: 'border-red-500 bg-red-500 text-white' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setReviewForm(p => ({ ...p, status: opt.value }))}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
                      reviewForm.status === opt.value
                        ? opt.active
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Internal Notes
                  <span className="text-xs font-normal text-gray-400 ml-1">(not shown to student)</span>
                </label>
                <textarea
                  rows={3}
                  value={reviewForm.reviewNotes}
                  onChange={e => setReviewForm(p => ({ ...p, reviewNotes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Staff-only notes..."
                  maxLength={1000}
                />
              </div>

              {reviewForm.status === 'rejected' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rejection Reason
                    <span className="text-red-500 ml-1">*</span>
                    <span className="text-xs font-normal text-gray-400 ml-1">(emailed to student)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={reviewForm.rejectionReason}
                    onChange={e => setReviewForm(p => ({ ...p, rejectionReason: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Reason the student will receive by email..."
                    maxLength={500}
                  />
                </div>
              )}

              <button
                onClick={handleReview}
                disabled={reviewing || !reviewForm.status}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
              >
                {reviewing ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </Section>
        )}

        {/* ── Student: delete draft ────────────────────────────────────────── */}
        {canDelete && (
          <div className="px-6 py-4">
            <button
              onClick={handleDelete}
              className="text-sm text-red-500 hover:text-red-700 hover:underline font-medium"
            >
              Delete this draft
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
        Submitted {format(new Date(request.createdAt), 'MMM d, yyyy · h:mm a')}
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="px-6 py-5">
      <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Grid({ children }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value || '—'}</p>
    </div>
  );
}