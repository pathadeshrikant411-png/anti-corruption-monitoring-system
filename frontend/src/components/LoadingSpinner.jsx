import React from 'react';

const LoadingSpinner = ({ size = "md", text = "Authenticating..." }) => {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-5 h-5 border-2",
    lg: "w-8 h-8 border-3",
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <div
        className={`${sizeClasses[size]} border-current border-t-transparent rounded-full animate-spin`}
      />
      {text && <span className="text-sm font-medium">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;
