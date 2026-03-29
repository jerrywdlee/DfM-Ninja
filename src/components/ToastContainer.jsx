import React from 'react';

const Toast = ({ toast, onRemove }) => {
  const bgColor = {
    success: 'bg-emerald-600',
    info: 'bg-blue-600',
    warn: 'bg-orange-500',
    error: 'bg-red-600',
  }[toast.type] || 'bg-slate-700';

  const icon = {
    success: '✅',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
  }[toast.type] || '🔔';

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 min-w-[280px] max-w-xl animate-[slide-in-right_0.6s_ease-out] relative group border border-white/10 opacity-90`}
    >
      <span className="text-lg shrink-0">{icon}</span>
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-bold truncate leading-tight" title={toast.msg}>
          {toast.msg}
        </p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-white/60 hover:text-white transition-colors p-1"
      >
        ✕
      </button>
    </div>
  );
};

const ToastContainer = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
