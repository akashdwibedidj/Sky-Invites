import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

interface InsufficientCreditsBannerProps {
  needed?: number;
  available?: number;
  creditType?: 'image' | 'video';
}

export const InsufficientCreditsBanner: React.FC<InsufficientCreditsBannerProps> = ({
  needed,
  available,
  creditType,
}) => {
  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Not enough credits</p>
          {typeof needed === 'number' && typeof available === 'number' && (
            <p className="text-xs text-amber-800 mt-0.5">
              Need {needed} {creditType ?? ''} {needed === 1 ? 'credit' : 'credits'}, have {available}.
            </p>
          )}
        </div>
      </div>
      <Link
        to="/pricing"
        className="px-3 py-1.5 rounded-lg bg-[var(--color-peacock)] text-white text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
      >
        View plans
      </Link>
    </div>
  );
};
