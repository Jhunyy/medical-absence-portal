import React from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
 
export function ExcuseLetterButton({ requestId }) {
  const token = localStorage.getItem('token');
  const url   = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/absences/${requestId}/excuse-letter?token=${token}`;
 
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
    >
      <ArrowDownTrayIcon className="h-4 w-4" />
      Download Excuse Letter (PDF)
    </a>
  );
}
 
export default ExcuseLetterButton;