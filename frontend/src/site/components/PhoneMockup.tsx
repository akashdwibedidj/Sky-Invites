import React from 'react';
import type { SampleExample } from '../content/examples';
import { SampleCard } from './SampleCard';

interface PhoneMockupProps {
  sample: SampleExample;
  onPlay?: (sample: SampleExample) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PhoneMockup({
  sample,
  onPlay,
  size = 'md',
  className = '',
}: PhoneMockupProps) {
  return (
    <div
      className={`relative rounded-[1.75rem] bg-peacock-deep p-[7px] shadow-[var(--shadow-paper)] ring-1 ring-gold/30 ${className}`}
    >
      <div className="overflow-hidden rounded-[1.35rem]">
        <SampleCard sample={sample} onSelect={onPlay} size={size} className="w-full" />
      </div>
    </div>
  );
}
