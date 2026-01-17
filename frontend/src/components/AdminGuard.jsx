import React from 'react';

export const AdminGuard = ({ children }) => {
  const enabled = String(process.env.REACT_APP_ENABLE_ADMIN || '').trim() === '1';

  if (!enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="max-w-lg mx-auto p-8 text-center border border-slate-200 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">403 — Admin Area</h1>
          <p className="text-slate-600 mb-4">You don't have access to this page.</p>
          <p className="text-slate-500 text-sm">Set REACT_APP_ENABLE_ADMIN=1 and restart the frontend to enable admin routes in development.</p>
          <a href="/" className="inline-block mt-4 text-blue-600 hover:underline">Go to Home</a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
