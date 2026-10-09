import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

const ContractorAvatar = ({ photoPath, name = 'Contractor', size = 'md', className = '' }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [photoPath]);

  // Size mapping
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 sm:w-28 sm:h-28 text-2xl',
    '2xl': 'w-32 h-32 text-3xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
    '2xl': 'w-16 h-16',
  };

  // Get initials from name
  const getInitials = (str) => {
    if (!str) return 'C';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(name);
  const selectedSizeClass = sizeClasses[size] || sizeClasses.md;
  const selectedIconSize = iconSizes[size] || iconSizes.md;

  // Resolve image URL
  const getImageSrc = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/api/')) return path;
    if (path.startsWith('api/')) return `/${path}`;
    const filename = path.replace(/^.*[\\\/]/, '');
    return `/api/public/uploads/contractor_photos/${filename}`;
  };

  const fullPhotoSrc = photoPath ? getImageSrc(photoPath) : '';

  if (photoPath && !imgError) {
    return (
      <img
        src={fullPhotoSrc}
        alt={name}
        onError={() => setImgError(true)}
        className={`${selectedSizeClass} rounded-full object-cover border-2 border-slate-200 shadow-sm shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${selectedSizeClass} rounded-full bg-gradient-to-br from-gov-700 to-gov-900 text-white font-extrabold flex items-center justify-center border-2 border-slate-200 shadow-sm shrink-0 select-none ${className}`}
      title={name}
    >
      {size === 'sm' || size === 'md' ? (
        <span>{initials}</span>
      ) : (
        <div className="flex flex-col items-center justify-center leading-none">
          <User className={`${selectedIconSize} mb-0.5 opacity-90`} />
          <span className="text-[10px] sm:text-xs font-mono tracking-wider">{initials}</span>
        </div>
      )}
    </div>
  );
};

export default ContractorAvatar;
