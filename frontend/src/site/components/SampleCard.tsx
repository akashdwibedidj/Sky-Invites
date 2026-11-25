import React, { useRef, useState } from 'react';
import type { SampleExample } from '../content/examples';

interface SampleCardProps {
  sample: SampleExample;
  onSelect?: (sample: SampleExample) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<SampleCardProps['size']>, string> = {
  sm: 'w-44 sm:w-48',
  md: 'w-56 sm:w-64',
  lg: 'w-60 sm:w-64',
};

export function SampleCard({
  sample,
  onSelect,
  size = 'md',
  className = '',
}: SampleCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  const canHoverDesktop = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const handleMouseEnter = () => {
    if (!sample.videoFile || !canHoverDesktop()) return;
    setIsHovering(true);
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (!sample.videoFile) return;
    setIsHovering(false);
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  };

  return (
    <button
      type="button"
      onClick={() => onSelect?.(sample)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={`Preview ${sample.title}`}
      className={`group relative aspect-[9/16] shrink-0 overflow-hidden rounded-2xl border border-hairline bg-ivory-card shadow-[var(--shadow-paper)] transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock ${SIZE_CLASSES[size]} ${className}`}
    >
      <img
        src={sample.posterImage}
        alt={sample.title}
        loading="lazy"
        className="h-full w-full object-cover"
      />
      {sample.videoFile && (
        <video
          ref={videoRef}
          src={sample.videoFile}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
            isHovering ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </button>
  );
}
