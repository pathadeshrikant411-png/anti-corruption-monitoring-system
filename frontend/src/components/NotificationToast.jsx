import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

const NotificationToast = ({ type = 'error', message, onClose }) => {
  if (!message) return null;

  const isError = type === 'error';

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border text-sm transition-all duration-300 ${
        isError
          ? 'bg-rose-50 border-rose-200 text-rose-800'
          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
      }`}
      role="alert"
    >
      {isError ? (
        <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1">
        <p className="font-semibold">{isError ? 'Authentication Error' : 'Success'}</p>
        <p className="mt-0.5 text-xs sm:text-sm leading-relaxed opacity-90">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          aria-label="Close message"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default NotificationToast;
