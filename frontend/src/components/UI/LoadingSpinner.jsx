import React from 'react';

const LoadingSpinner = ({ size = 'md', label = 'Loading...' }) => {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3" role="status" aria-label={label}>
      <div className={`animate-spin ${sizes[size]} border-4 border-blue-600 rounded-full border-t-transparent`} />
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  );
};

export default LoadingSpinner;