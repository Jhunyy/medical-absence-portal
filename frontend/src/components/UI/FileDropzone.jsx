import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { DocumentArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
 
const FileDropzone = ({ onFileSelect, file, onRemove }) => {
  const onDrop = useCallback(
    (acceptedFiles) => { if (acceptedFiles[0]) onFileSelect(acceptedFiles[0]); },
    [onFileSelect]
  );
 
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': [],
      'image/jpeg':      [],
      'image/png':       [],
      'image/webp':      []   // Added to match upload.middleware.js
    },
    maxSize:  5 * 1024 * 1024,
    multiple: false
  });
 
  // Surface dropzone rejection reason to the user
  const rejectionMessage = fileRejections[0]?.errors[0]?.code === 'file-too-large'
    ? 'File exceeds the 5 MB limit.'
    : fileRejections[0]
      ? 'Invalid file type. Please upload a PDF, JPG, PNG, or WebP.'
      : null;
 
  return (
    <div>
      {!file ? (
        <>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : fileRejections.length > 0
                  ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
              }
            `}
            role="button"
            tabIndex={0}
            aria-label="Upload medical document"
          >
            <input {...getInputProps()} />
            <DocumentArrowUpIcon
              className={`h-10 w-10 mx-auto mb-3 ${
                fileRejections.length > 0 ? 'text-red-400' : 'text-gray-400'
              }`}
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isDragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              PDF, JPG, PNG, WebP — max 5 MB
            </p>
          </div>
 
          {rejectionMessage && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
              {rejectionMessage}
            </p>
          )}
        </>
      ) : (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 min-w-0">
            <DocumentArrowUpIcon className="h-6 w-6 text-blue-600 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{file.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0 ml-3"
            aria-label="Remove file"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};
 
export default FileDropzone;