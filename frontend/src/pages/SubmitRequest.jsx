import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { absenceService } from '../services/absence.service';
import FileDropzone from '../components/UI/FileDropzone';
import Card from '../components/UI/Card';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const SubmitRequest = () => {
  const navigate = useNavigate();
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const {
    register, control, handleSubmit, watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      affectedCourses: [{ courseCode: '', courseName: '', professorEmail: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'affectedCourses' });

  // Watch start date so end date validation stays reactive
  const startDate = watch('absenceDateStart');

  const onSubmit = async (data, submitType) => {
    // File is required only for final submission, not drafts
    if (submitType === 'submitted' && !file) {
      toast.error('Please upload a medical document before submitting.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (file) formData.append('medicalDocument', file);
      formData.append('absenceDateStart',  data.absenceDateStart);
      formData.append('absenceDateEnd',    data.absenceDateEnd);
      formData.append('reason',            data.reason);
      formData.append('status',            submitType);
      formData.append('affectedCourses',   JSON.stringify(data.affectedCourses));

      await absenceService.create(formData);

      toast.success(
        submitType === 'submitted'
          ? 'Request submitted for review!'
          : 'Draft saved. You can finish it later.'
      );
      navigate('/requests');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Submit Absence Request</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Your medical document is securely stored and never shared with professors.
        </p>
      </div>

      <form onSubmit={e => e.preventDefault()} noValidate className="space-y-6">

        {/* ── Absence Dates ──────────────────────────────────────────────────── */}
        <Card>
          <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Absence Period</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="absenceDateStart" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="absenceDateStart"
                max={today}
                {...register('absenceDateStart', {
                  required: 'Start date is required.',
                  validate: v => v <= today || 'Start date cannot be in the future.'
                })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-required="true"
              />
              {errors.absenceDateStart && (
                <p className="mt-1 text-xs text-red-600" role="alert">{errors.absenceDateStart.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="absenceDateEnd" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="absenceDateEnd"
                max={today}
                {...register('absenceDateEnd', {
                  required: 'End date is required.',
                  validate: v => {
                    if (!startDate) return true;
                    if (v < startDate) return 'End date must be on or after the start date.';
                    if (v > today)     return 'End date cannot be in the future.';
                    return true;
                  }
                })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-required="true"
              />
              {errors.absenceDateEnd && (
                <p className="mt-1 text-xs text-red-600" role="alert">{errors.absenceDateEnd.message}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason Category <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <select
              id="reason"
              {...register('reason', { required: 'Please select a reason.' })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-required="true"
            >
              <option value="">Select a reason</option>
              <option value="illness">Illness</option>
              <option value="medical_procedure">Medical Procedure</option>
              <option value="mental_health">Mental Health</option>
              <option value="emergency">Medical Emergency</option>
              <option value="other">Other</option>
            </select>
            {errors.reason && (
              <p className="mt-1 text-xs text-red-600" role="alert">{errors.reason.message}</p>
            )}
          </div>
        </Card>

        {/* ── Medical Document ───────────────────────────────────────────────── */}
        <Card>
          <h2 className="font-semibold text-gray-800 dark:text-white mb-1">Medical Document</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Accepted formats: JPEG, PNG, WebP, PDF. Max size: 5 MB.
            This document is confidential — only Health Services staff can view it.
          </p>
          <FileDropzone
            onFileSelect={setFile}
            file={file}
            onRemove={() => setFile(null)}
          />
          {/* Soft reminder — not a hard error on draft saves */}
          {!file && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              A medical document is required when submitting for review (not needed for drafts).
            </p>
          )}
        </Card>

        {/* ── Affected Courses ───────────────────────────────────────────────── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-white">Affected Courses</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Your professor will receive a privacy-safe notice — no medical details are shared.
              </p>
            </div>
            <button
              type="button"
              onClick={() => append({ courseCode: '', courseName: '', professorEmail: '' })}
              disabled={fields.length >= 10}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-40"
            >
              <PlusIcon className="h-4 w-4" /> Add Course
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Course {index + 1}
                  </p>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-500 hover:text-red-700"
                      aria-label={`Remove course ${index + 1}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <input
                      {...register(`affectedCourses.${index}.courseCode`, {
                        required: 'Course code is required.'
                      })}
                      placeholder="Course Code (e.g. CS101)"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={`Course ${index + 1} code`}
                    />
                    {errors.affectedCourses?.[index]?.courseCode && (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {errors.affectedCourses[index].courseCode.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <input
                      {...register(`affectedCourses.${index}.courseName`, {
                        required: 'Course name is required.'
                      })}
                      placeholder="Course Name"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={`Course ${index + 1} name`}
                    />
                    {errors.affectedCourses?.[index]?.courseName && (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {errors.affectedCourses[index].courseName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <input
                      {...register(`affectedCourses.${index}.professorEmail`, {
                        required: 'Professor email is required.',
                        pattern: {
                          value: /^\S+@\S+\.\S+$/,
                          message: 'Enter a valid email address.'
                        }
                      })}
                      placeholder="Professor Email"
                      type="email"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={`Course ${index + 1} professor email`}
                    />
                    {errors.affectedCourses?.[index]?.professorEmail && (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {errors.affectedCourses[index].professorEmail.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Actions ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleSubmit(data => onSubmit(data, 'draft'))}
            disabled={loading}
            className="flex-1 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 transition-colors"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={handleSubmit(data => onSubmit(data, 'submitted'))}
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
            aria-busy={loading}
          >
            {loading ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubmitRequest;