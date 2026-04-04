import React from 'react';

const config = {
  draft:        { label: 'Draft',        classes: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  submitted:    { label: 'Submitted',    classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  under_review: { label: 'Under Review', classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' },
  approved:     { label: 'Approved',     classes: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  rejected:     { label: 'Rejected',     classes: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' }
};

const StatusBadge = ({ status }) => {
  const { label, classes } = config[status] || config.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
};

export default StatusBadge;