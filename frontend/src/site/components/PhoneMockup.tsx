import React from 'react';
import type { InvitationExample } from '../types';
import { InvitationArtwork } from './InvitationArtwork';

interface PhoneMockupProps {
  invitation: InvitationExample;
  onPlay?: (invitation: InvitationExample) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PhoneMockup({
  invitation,
  onPlay,
  size = 'md',
  className = '',
}: PhoneMockupProps) {
  return (
    <div
      className={`relative rounded-[1.75rem] bg-peacock-deep p-[7px] shadow-[var(--shadow-paper)] ring-1 ring-gold/30 ${className}`}
    >
      <div className="overflow-hidden rounded-[1.35rem]">
        <InvitationArtwork invitation={invitation} onPlay={onPlay} size={size} />
      </div>
    </div>
  );
}
