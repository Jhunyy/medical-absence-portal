import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { absenceService } from '../services/absence.service';
import Card from '../components/UI/Card';
import toast from 'react-hot-toast';
 
export const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const [downloading, setDownloading] = useState(false);
 
  // ── Role guard ─────────────────────────────────────────────────────────────
  if (!isAdmin) return <Navigate to="/" replace />;
 
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await absenceService.downloadBackup();
      const url  = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Backup downloaded successfully.');
    } catch {
      toast.error('Backup download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };
 
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">System management — admin access only.</p>
      </div>
 
      <Card>
        <h2 className="font-semibold text-gray-800 dark:text-white mb-1">Data Backup</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Download a complete JSON backup of all absence requests, users, and audit logs.
        </p>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          {downloading ? 'Preparing...' : 'Download JSON Backup'}
        </button>
      </Card>
    </div>
  );
};
 
export default AdminPanel;