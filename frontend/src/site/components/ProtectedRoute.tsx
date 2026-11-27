import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { COPY } from '../content/copy';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-ivory/75 backdrop-blur-sm">
        <p className="font-site-serif text-xl text-peacock">{COPY.protectedRoute.loading}</p>
      </div>
    );
  }

  if (!token && !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
