import React from 'react';
import type { InvitationCategory } from '../types';

export function BotanicalDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`} aria-hidden="true">
      <span className="h-px w-14 sm:w-24 bg-hairline" />
      <svg
        width="28"
        height="18"
        viewBox="0 0 34 20"
        fill="none"
        className="text-gold-warm shrink-0"
      >
        <path
          d="M17 18V3.5M17 10C13.5 10 10.5 7.8 9.2 5C12.6 5 15.6 6.8 17 10ZM17 10C20.5 10 23.5 7.8 24.8 5C21.4 5 18.4 6.8 17 10ZM17 14.2C14 14.2 12 12.6 11 10.6C13.6 10.6 15.8 12 17 14.2ZM17 14.2C20 14.2 22 12.6 23 10.6C20.4 10.6 18.2 12 17 14.2Z"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="17" cy="2" r="1.1" fill="currentColor" />
      </svg>
      <span className="h-px w-14 sm:w-24 bg-hairline" />
    </div>
  );
}

export function MughalJharokhaFrame({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 498"
      fill="none"
      preserveAspectRatio="none"
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <rect x="10" y="10" width="260" height="478" rx="3" stroke="#A87F32" strokeWidth="1" />
      <rect x="15" y="15" width="250" height="468" rx="2" stroke="#C89F4E" strokeWidth="0.6" />
      <path
        d="M24 462V126C24 108 38 96 52 90C54 74 68 62 84 60C90 44 108 34 126 36C132 24 140 20 140 20C140 20 148 24 154 36C172 34 190 44 196 60C212 62 226 74 228 90C242 96 256 108 256 126V462H24Z"
        stroke="#0E3A3C"
        strokeWidth="1.15"
      />
      <path
        d="M30 456V130C30 114 42 103 55 98C57 83 70 72 86 70C92 55 109 46 127 48C133 37 140 33 140 33C140 33 147 37 153 48C171 46 188 55 194 70C210 72 223 83 225 98C238 103 250 114 250 130V456H30Z"
        stroke="#A87F32"
        strokeWidth="0.75"
      />
      <circle cx="140" cy="15" r="2" fill="#A87F32" />
      <path
        d="M126 438L140 428L154 438L140 448Z"
        stroke="#A87F32"
        strokeWidth="0.9"
      />
    </svg>
  );
}

export function OccasionMotif({
  category,
  className = '',
}: {
  category: InvitationCategory;
  className?: string;
}) {
  switch (category) {
    case 'Wedding':
      return (
        <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
          <circle cx="16" cy="21" r="8" stroke="currentColor" strokeWidth="1.25" />
          <circle cx="24" cy="21" r="8" stroke="currentColor" strokeWidth="1.25" />
          <path d="M20 9C18.5 12 18.5 14 20 15.5C21.5 14 21.5 12 20 9Z" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case 'Engagement':
      return (
        <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
          <path d="M20 7L25 13L20 17L15 13L20 7Z" stroke="currentColor" strokeWidth="1.25" />
          <circle cx="20" cy="25" r="8" stroke="currentColor" strokeWidth="1.25" />
        </svg>
      );
    case 'Birthday':
      return (
        <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
          <path d="M20 8V31M13 20C15.5 16 18.5 16 20 20C21.5 16 24.5 16 27 20" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          <path d="M11 31H29" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          <circle cx="20" cy="7.5" r="1.5" fill="currentColor" />
        </svg>
      );
    case 'Baby Shower':
      return (
        <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
          <path d="M10 28C16.5 25 23 18 29 10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          <path d="M18 21C15 17 16 13 20 11C21.5 15 20.5 18.5 18 21ZM22.5 24.5C26.5 24.5 30 22 31 18C26.5 18 24 20.5 22.5 24.5Z" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case 'Anniversary':
      return (
        <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
          <path
            d="M20 31C20 31 9.5 24.5 9.5 16.5C9.5 12.5 12.8 10 16 10C18 10 19.3 11.1 20 12.6C20.7 11.1 22 10 24 10C27.2 10 30.5 12.5 30.5 16.5C30.5 24.5 20 31 20 31Z"
            stroke="currentColor"
            strokeWidth="1.25"
          />
        </svg>
      );
    case 'Corporate':
      return (
        <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
          <rect x="10" y="8.5" width="20" height="23" stroke="currentColor" strokeWidth="1.25" />
          <rect x="13.5" y="12" width="13" height="16" stroke="currentColor" strokeWidth="0.9" />
          <path d="M16.5 20H23.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      );
  }
}

export function SubtleGrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
      aria-hidden="true"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}
